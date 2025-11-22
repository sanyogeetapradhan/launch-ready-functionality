import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transfers, transferItems, productStock, stockLedger, products } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const id = params.id;

    // Validate ID is valid integer
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid transfer ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const transferId = parseInt(id);

    // Fetch transfer
    const transferRecord = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, transferId))
      .limit(1);

    if (transferRecord.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found' },
        { status: 404 }
      );
    }

    const transfer = transferRecord[0];

    // Check transfer status allows validation
    if (transfer.status === 'done') {
      return NextResponse.json(
        { 
          error: 'Transfer already validated', 
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    if (transfer.status === 'cancelled') {
      return NextResponse.json(
        { 
          error: 'Transfer is cancelled', 
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    if (transfer.status !== 'draft' && transfer.status !== 'waiting') {
      return NextResponse.json(
        { 
          error: 'Transfer status does not allow validation', 
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    // Fetch all transfer items
    const items = await db
      .select()
      .from(transferItems)
      .where(eq(transferItems.transferId, transferId));

    if (items.length === 0) {
      return NextResponse.json(
        { 
          error: 'No items found for this transfer', 
          code: 'NO_ITEMS' 
        },
        { status: 400 }
      );
    }

    // Check sufficient stock in fromWarehouse for ALL items before processing
    const stockChecks = await Promise.all(
      items.map(async (item) => {
        const stockRecord = await db
          .select()
          .from(productStock)
          .where(
            and(
              eq(productStock.productId, item.productId),
              eq(productStock.warehouseId, transfer.fromWarehouseId!)
            )
          )
          .limit(1);

        const currentQuantity = stockRecord.length > 0 ? stockRecord[0].quantity : 0;

        return {
          productId: item.productId,
          requiredQuantity: item.quantity,
          availableQuantity: currentQuantity,
          sufficient: currentQuantity >= item.quantity
        };
      })
    );

    // Check if any item has insufficient stock
    const insufficientStock = stockChecks.find(check => !check.sufficient);
    if (insufficientStock) {
      return NextResponse.json(
        { 
          error: `Insufficient stock for product ${insufficientStock.productId} in warehouse ${transfer.fromWarehouseId}`,
          code: 'INSUFFICIENT_STOCK',
          details: {
            productId: insufficientStock.productId,
            warehouseId: transfer.fromWarehouseId,
            required: insufficientStock.requiredQuantity,
            available: insufficientStock.availableQuantity,
            shortage: insufficientStock.requiredQuantity - insufficientStock.availableQuantity
          }
        },
        { status: 400 }
      );
    }

    console.log(`Starting transfer validation for transfer #${transfer.transferNumber}`);
    console.log(`Moving stock from warehouse ${transfer.fromWarehouseId} to warehouse ${transfer.toWarehouseId}`);

    const stockMovements: Array<{
      productId: number;
      quantity: number;
      fromWarehouse: number;
      toWarehouse: number;
    }> = [];

    // Process each transfer item within a transaction-like operation
    for (const item of items) {
      console.log(`Processing item: Product ${item.productId}, Quantity ${item.quantity}`);

      // Get current stock in fromWarehouse
      const fromStockRecord = await db
        .select()
        .from(productStock)
        .where(
          and(
            eq(productStock.productId, item.productId),
            eq(productStock.warehouseId, transfer.fromWarehouseId!)
          )
        )
        .limit(1);

      const fromCurrentQuantity = fromStockRecord.length > 0 ? fromStockRecord[0].quantity : 0;
      const newFromQuantity = fromCurrentQuantity - item.quantity;

      // Update or create fromWarehouse stock (decrease)
      if (fromStockRecord.length > 0) {
        await db
          .update(productStock)
          .set({
            quantity: newFromQuantity,
            updatedAt: new Date().toISOString()
          })
          .where(eq(productStock.id, fromStockRecord[0].id));
      }

      // Create stockLedger entry for transfer_out
      await db.insert(stockLedger).values({
        productId: item.productId,
        warehouseId: transfer.fromWarehouseId!,
        operationType: 'transfer_out',
        referenceNumber: transfer.transferNumber,
        quantityChange: -item.quantity,
        quantityAfter: newFromQuantity,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        notes: `Transfer to warehouse ${transfer.toWarehouseId}`
      });

      console.log(`Stock decreased in warehouse ${transfer.fromWarehouseId}: ${fromCurrentQuantity} -> ${newFromQuantity}`);

      // Get current stock in toWarehouse
      const toStockRecord = await db
        .select()
        .from(productStock)
        .where(
          and(
            eq(productStock.productId, item.productId),
            eq(productStock.warehouseId, transfer.toWarehouseId!)
          )
        )
        .limit(1);

      const toCurrentQuantity = toStockRecord.length > 0 ? toStockRecord[0].quantity : 0;
      const newToQuantity = toCurrentQuantity + item.quantity;

      // Update or create toWarehouse stock (increase)
      if (toStockRecord.length > 0) {
        await db
          .update(productStock)
          .set({
            quantity: newToQuantity,
            updatedAt: new Date().toISOString()
          })
          .where(eq(productStock.id, toStockRecord[0].id));
      } else {
        // Create new productStock record for toWarehouse
        await db.insert(productStock).values({
          productId: item.productId,
          warehouseId: transfer.toWarehouseId!,
          quantity: item.quantity,
          updatedAt: new Date().toISOString()
        });
      }

      // Create stockLedger entry for transfer_in
      await db.insert(stockLedger).values({
        productId: item.productId,
        warehouseId: transfer.toWarehouseId!,
        operationType: 'transfer_in',
        referenceNumber: transfer.transferNumber,
        quantityChange: item.quantity,
        quantityAfter: newToQuantity,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        notes: `Transfer from warehouse ${transfer.fromWarehouseId}`
      });

      console.log(`Stock increased in warehouse ${transfer.toWarehouseId}: ${toCurrentQuantity} -> ${newToQuantity}`);

      stockMovements.push({
        productId: item.productId,
        quantity: item.quantity,
        fromWarehouse: transfer.fromWarehouseId!,
        toWarehouse: transfer.toWarehouseId!
      });
    }

    // Update transfer status to done
    const updatedTransfer = await db
      .update(transfers)
      .set({
        status: 'done',
        validatedAt: new Date().toISOString()
      })
      .where(eq(transfers.id, transferId))
      .returning();

    console.log(`Transfer #${transfer.transferNumber} validated successfully`);
    console.log(`Total items processed: ${items.length}`);

    return NextResponse.json({
      message: 'Transfer validated successfully',
      transferNumber: transfer.transferNumber,
      itemsProcessed: items.length,
      stockMovements
    }, { status: 200 });

  } catch (error) {
    console.error('POST transfer validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}