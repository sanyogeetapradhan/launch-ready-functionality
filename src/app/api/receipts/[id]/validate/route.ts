import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { receipts, receiptItems, products, productStock, stockLedger } from '@/db/schema';
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

    const { id } = params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid receipt ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const receiptId = parseInt(id);

    // Fetch receipt
    const receipt = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);

    if (receipt.length === 0) {
      return NextResponse.json(
        { error: 'Receipt not found', code: 'RECEIPT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentReceipt = receipt[0];

    // Check receipt status
    if (currentReceipt.status === 'done' || currentReceipt.status === 'cancelled') {
      return NextResponse.json(
        { 
          error: 'Receipt already validated or cancelled', 
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    if (currentReceipt.status !== 'draft' && currentReceipt.status !== 'waiting') {
      return NextResponse.json(
        { 
          error: 'Receipt status does not allow validation', 
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    // Fetch all receipt items
    const items = await db
      .select()
      .from(receiptItems)
      .where(eq(receiptItems.receiptId, receiptId));

    if (items.length === 0) {
      return NextResponse.json(
        { 
          error: 'No items found in receipt', 
          code: 'NO_ITEMS' 
        },
        { status: 400 }
      );
    }

    console.log(`Starting validation for receipt ${currentReceipt.receiptNumber} with ${items.length} items`);

    const stockUpdates: Array<{ productId: number; quantity: number; newStock: number }> = [];

    // Process each receipt item in a transaction-like manner
    try {
      for (const item of items) {
        console.log(`Processing item: productId=${item.productId}, quantity=${item.quantity}`);

        // 1. Update products.currentStock
        const product = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);

        if (product.length === 0) {
          throw new Error(`Product ${item.productId} not found`);
        }

        const currentProductStock = product[0].currentStock || 0;
        const newProductStock = currentProductStock + item.quantity;

        await db
          .update(products)
          .set({
            currentStock: newProductStock,
            updatedAt: new Date().toISOString()
          })
          .where(eq(products.id, item.productId));

        console.log(`Updated product ${item.productId} stock: ${currentProductStock} -> ${newProductStock}`);

        // 2. Update or insert productStock record for warehouseId
        const existingStock = await db
          .select()
          .from(productStock)
          .where(
            and(
              eq(productStock.productId, item.productId),
              eq(productStock.warehouseId, currentReceipt.warehouseId!)
            )
          )
          .limit(1);

        let currentWarehouseStock = 0;
        let newWarehouseStock = 0;

        if (existingStock.length > 0) {
          // Update existing record
          currentWarehouseStock = existingStock[0].quantity || 0;
          newWarehouseStock = currentWarehouseStock + item.quantity;

          await db
            .update(productStock)
            .set({
              quantity: newWarehouseStock,
              updatedAt: new Date().toISOString()
            })
            .where(eq(productStock.id, existingStock[0].id));

          console.log(`Updated warehouse stock for product ${item.productId}: ${currentWarehouseStock} -> ${newWarehouseStock}`);
        } else {
          // Insert new record
          newWarehouseStock = item.quantity;

          await db
            .insert(productStock)
            .values({
              productId: item.productId,
              warehouseId: currentReceipt.warehouseId!,
              quantity: newWarehouseStock,
              updatedAt: new Date().toISOString()
            });

          console.log(`Created new warehouse stock for product ${item.productId}: ${newWarehouseStock}`);
        }

        // 3. Create stockLedger entry
        await db
          .insert(stockLedger)
          .values({
            productId: item.productId,
            warehouseId: currentReceipt.warehouseId!,
            operationType: 'receipt',
            referenceNumber: currentReceipt.receiptNumber,
            quantityChange: item.quantity,
            quantityAfter: newWarehouseStock,
            createdBy: user.id,
            createdAt: new Date().toISOString(),
            notes: `Receipt validation: ${currentReceipt.receiptNumber}`
          });

        console.log(`Created stock ledger entry for product ${item.productId}: +${item.quantity} (after: ${newWarehouseStock})`);

        stockUpdates.push({
          productId: item.productId,
          quantity: item.quantity,
          newStock: newWarehouseStock
        });
      }

      // 4. Update receipt status to "done" and set validatedAt
      await db
        .update(receipts)
        .set({
          status: 'done',
          validatedAt: new Date().toISOString()
        })
        .where(eq(receipts.id, receiptId));

      console.log(`Receipt ${currentReceipt.receiptNumber} validated successfully`);

      return NextResponse.json({
        message: 'Receipt validated successfully',
        receiptNumber: currentReceipt.receiptNumber,
        itemsProcessed: items.length,
        stockUpdates
      }, { status: 200 });

    } catch (processingError) {
      console.error('Error processing receipt items:', processingError);
      
      // Attempt to rollback by marking receipt as failed (best effort)
      try {
        await db
          .update(receipts)
          .set({
            status: 'draft',
            notes: `Validation failed: ${processingError instanceof Error ? processingError.message : 'Unknown error'}`
          })
          .where(eq(receipts.id, receiptId));
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }

      throw processingError;
    }

  } catch (error) {
    console.error('POST /api/receipts/[id]/validate error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}