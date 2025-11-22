import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, productStock, warehouses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;

    // Validate product ID is a valid integer
    if (!productId || isNaN(parseInt(productId))) {
      return NextResponse.json(
        {
          error: 'Valid product ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const id = parseInt(productId);

    // Check if product exists
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (product.length === 0) {
      return NextResponse.json(
        {
          error: 'Product not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Get stock levels for the product across all warehouses
    const stockLevels = await db
      .select({
        warehouseId: productStock.warehouseId,
        warehouseName: warehouses.name,
        location: warehouses.location,
        quantity: productStock.quantity,
        updatedAt: productStock.updatedAt,
      })
      .from(productStock)
      .innerJoin(warehouses, eq(productStock.warehouseId, warehouses.id))
      .where(eq(productStock.productId, id))
      .orderBy(warehouses.name);

    return NextResponse.json(stockLevels, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}