import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryItems, products, productStock, stockLedger } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract and validate delivery ID
    const { id } = await params;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid delivery ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const deliveryId = parseInt(id);

    // Fetch delivery
    const delivery = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, deliveryId))
      .limit(1);

    if (delivery.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      );
    }

    const currentDelivery = delivery[0];

    // Check delivery status
    if (currentDelivery.status === 'done' || currentDelivery.status === 'cancelled') {
      return NextResponse.json(
        {
          error: 'Delivery already validated or cancelled',
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    if (currentDelivery.status !== 'draft' && currentDelivery.status !== 'waiting') {
      return NextResponse.json(
        {
          error: 'Delivery status does not allow validation',
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Fetch all delivery items
    const items = await db
      .select()
      .from(deliveryItems)
      .where(eq(deliveryItems.deliveryId, deliveryId));

    if (items.length === 0) {
      return NextResponse.json(
        {
          error: 'No items found for this delivery',
          code: 'NO_ITEMS'
        },
        { status: 400 }
      );
    }

    // Check stock availability for all items BEFORE processing
    // Support two modes:
    // - If delivery.warehouseId is set: check that warehouse only (existing behavior)
    // - If delivery.warehouseId is null/undefined: check total available across all warehouses and plan reductions across them
    const stockChecks: Array<any> = [];
    for (const item of items) {
      if (currentDelivery.warehouseId) {
        const stock = await db
          .select()
          .from(productStock)
          .where(
            and(
              eq(productStock.productId, item.productId),
              eq(productStock.warehouseId, currentDelivery.warehouseId!)
            )
          )
          .limit(1);

        if (stock.length === 0 || stock[0].quantity < item.quantity) {
          const product = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          return NextResponse.json(
            {
              error: `Insufficient stock for product ${product[0]?.name || item.productId} in warehouse ${currentDelivery.warehouseId}`,
              code: 'INSUFFICIENT_STOCK',
              details: {
                productId: item.productId,
                productName: product[0]?.name,
                warehouseId: currentDelivery.warehouseId,
                required: item.quantity,
                available: stock.length > 0 ? stock[0].quantity : 0
              }
            },
            { status: 400 }
          );
        }

        stockChecks.push({
          item,
          mode: 'single',
          currentStock: stock[0]
        });
      } else {
        // no warehouse specified on delivery: aggregate across all warehouses
        const stocks = await db
          .select()
          .from(productStock)
          .where(eq(productStock.productId, item.productId));

        const totalAvailable = stocks.reduce((s: number, r: any) => s + (r.quantity || 0), 0);
        if (totalAvailable < item.quantity) {
          const product = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          return NextResponse.json(
            {
              error: `Insufficient total stock for product ${product[0]?.name || item.productId}`,
              code: 'INSUFFICIENT_STOCK',
              details: {
                productId: item.productId,
                productName: product[0]?.name,
                required: item.quantity,
                available: totalAvailable
              }
            },
            { status: 400 }
          );
        }

        // Plan to deduct across warehouses. Order by quantity desc to take from fullest first
        const stocksOrdered = stocks.sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0));
        stockChecks.push({
          item,
          mode: 'multi',
          stocks: stocksOrdered
        });
      }
    }

    // Process all items in transaction-like manner
    const stockUpdates = [];
    const currentTimestamp = new Date().toISOString();

    for (const check of stockChecks) {
      const { item } = check;
      console.log(`Processing delivery item: Product ${item.productId}, Quantity ${item.quantity}`);

      // Decrease products.currentStock
      const productResult = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (productResult.length > 0) {
        const newProductStock = productResult[0].currentStock - item.quantity;
        
        await db
          .update(products)
          .set({
            currentStock: newProductStock,
            updatedAt: currentTimestamp
          })
          .where(eq(products.id, item.productId));

        console.log(`Updated product ${item.productId} currentStock: ${productResult[0].currentStock} -> ${newProductStock}`);
      }

      if (check.mode === 'single') {
        const currentStock = check.currentStock;
        // Decrease productStock.quantity
        const newWarehouseStock = currentStock.quantity - item.quantity;
        
        await db
          .update(productStock)
          .set({
            quantity: newWarehouseStock,
            updatedAt: currentTimestamp
          })
          .where(eq(productStock.id, currentStock.id));

        console.log(`Updated productStock for product ${item.productId} in warehouse ${currentDelivery.warehouseId}: ${currentStock.quantity} -> ${newWarehouseStock}`);

        // Create stock ledger entry
        await db.insert(stockLedger).values({
          productId: item.productId,
          warehouseId: currentDelivery.warehouseId!,
          operationType: 'delivery',
          referenceNumber: currentDelivery.deliveryNumber,
          quantityChange: -item.quantity,
          quantityAfter: newWarehouseStock,
          createdBy: user.id,
          createdAt: currentTimestamp,
          notes: `Delivery validation: ${currentDelivery.deliveryNumber}`
        });

        stockUpdates.push({
          productId: item.productId,
          quantity: item.quantity,
          newStock: newWarehouseStock,
          warehouseId: currentDelivery.warehouseId
        });
      } else if (check.mode === 'multi') {
        // Deduct across multiple warehouses until fulfilled
        let remaining = item.quantity;
        for (const s of check.stocks) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, s.quantity);
          const newQty = s.quantity - take;

          await db
            .update(productStock)
            .set({ quantity: newQty, updatedAt: currentTimestamp })
            .where(eq(productStock.id, s.id));

          await db.insert(stockLedger).values({
            productId: item.productId,
            warehouseId: s.warehouseId,
            operationType: 'delivery',
            referenceNumber: currentDelivery.deliveryNumber,
            quantityChange: -take,
            quantityAfter: newQty,
            createdBy: user.id,
            createdAt: currentTimestamp,
            notes: `Delivery validation: ${currentDelivery.deliveryNumber}`
          });

          stockUpdates.push({ productId: item.productId, warehouseId: s.warehouseId, quantity: take, newStock: newQty });

          remaining -= take;
        }
      }
    }

    // Update delivery status to done
    const updatedDelivery = await db
      .update(deliveries)
      .set({
        status: 'done',
        validatedAt: currentTimestamp
      })
      .where(eq(deliveries.id, deliveryId))
      .returning();

    console.log(`Delivery ${currentDelivery.deliveryNumber} validated successfully with ${items.length} items`);

    return NextResponse.json(
      {
        message: 'Delivery validated successfully',
        deliveryNumber: currentDelivery.deliveryNumber,
        itemsProcessed: items.length,
        stockUpdates
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('POST delivery validation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}