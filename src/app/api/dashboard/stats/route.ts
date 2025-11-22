import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, receipts, deliveries, transfers } from '@/db/schema';
import { eq, and, inArray, lte, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Query 1: Total active products
    const totalProductsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.isActive, true));
    const totalProducts = Number(totalProductsResult[0]?.count || 0);

    // Query 2: Low stock count (currentStock <= reorderLevel AND isActive = true)
    const lowStockResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.currentStock} <= ${products.reorderLevel}`
        )
      );
    const lowStockCount = Number(lowStockResult[0]?.count || 0);

    // Query 3: Pending receipts (status IN 'draft', 'waiting', 'ready')
    const pendingReceiptsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(receipts)
      .where(inArray(receipts.status, ['draft', 'waiting', 'ready']));
    const pendingReceipts = Number(pendingReceiptsResult[0]?.count || 0);

    // Query 4: Pending deliveries (status IN 'draft', 'waiting', 'ready')
    const pendingDeliveriesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(deliveries)
      .where(inArray(deliveries.status, ['draft', 'waiting', 'ready']));
    const pendingDeliveries = Number(pendingDeliveriesResult[0]?.count || 0);

    // Query 5: Pending transfers (status IN 'draft', 'waiting', 'ready')
    const pendingTransfersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transfers)
      .where(inArray(transfers.status, ['draft', 'waiting', 'ready']));
    const pendingTransfers = Number(pendingTransfersResult[0]?.count || 0);

    // Query 6: Total stock value (sum of currentStock * costPrice for active products)
    const totalStockValueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${products.currentStock} * ${products.costPrice}), 0)`
      })
      .from(products)
      .where(eq(products.isActive, true));
    const totalStockValue = Number(totalStockValueResult[0]?.total || 0);

    // Query 7: Critical stock products (currentStock <= reorderLevel, active only, max 10)
    const criticalStockProductsRaw = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        reorderLevel: products.reorderLevel,
        unitOfMeasure: products.unitOfMeasure,
      })
      .from(products)
      .where(
        and(
          eq(products.isActive, true),
          sql`${products.currentStock} <= ${products.reorderLevel}`
        )
      )
      .orderBy(sql`(${products.currentStock} - ${products.reorderLevel}) ASC`)
      .limit(10);

    // Calculate shortage for each critical stock product
    const criticalStockProducts = criticalStockProductsRaw.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.currentStock || 0,
      reorderLevel: product.reorderLevel || 0,
      unitOfMeasure: product.unitOfMeasure,
      shortage: (product.reorderLevel || 0) - (product.currentStock || 0)
    }));

    return NextResponse.json({
      totalProducts,
      lowStockCount,
      pendingReceipts,
      pendingDeliveries,
      pendingTransfers,
      totalStockValue,
      criticalStockProducts
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}