import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);

    if (product.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(product[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate fields if provided
    if ('name' in body && (!body.name || body.name.trim() === '')) {
      return NextResponse.json(
        { error: 'Name cannot be empty', code: 'INVALID_NAME' },
        { status: 400 }
      );
    }

    if ('sku' in body && (!body.sku || body.sku.trim() === '')) {
      return NextResponse.json(
        { error: 'SKU cannot be empty', code: 'INVALID_SKU' },
        { status: 400 }
      );
    }

    if ('unitOfMeasure' in body && (!body.unitOfMeasure || body.unitOfMeasure.trim() === '')) {
      return NextResponse.json(
        { error: 'Unit of measure cannot be empty', code: 'INVALID_UNIT' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // If SKU is being updated, check for uniqueness
    if ('sku' in body && body.sku !== existingProduct[0].sku) {
      const skuCheck = await db
        .select()
        .from(products)
        .where(eq(products.sku, body.sku))
        .limit(1);

      if (skuCheck.length > 0) {
        return NextResponse.json(
          { error: 'SKU already exists', code: 'DUPLICATE_SKU' },
          { status: 409 }
        );
      }
    }

    // Prepare update object (exclude id and createdAt)
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    // Add fields from body if present (exclude id and createdAt)
    const allowedFields = [
      'name',
      'sku',
      'categoryId',
      'unitOfMeasure',
      'reorderLevel',
      'currentStock',
      'costPrice',
      'sellingPrice',
      'description',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'name' || field === 'sku' || field === 'unitOfMeasure' || field === 'description') {
          updates[field] = body[field]?.trim();
        } else {
          updates[field] = body[field];
        }
      }
    }

    const updated = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    
    // Handle SQLite unique constraint error for SKU
    if ((error as Error).message.includes('UNIQUE constraint failed: products.sku')) {
      return NextResponse.json(
        { error: 'SKU already exists', code: 'DUPLICATE_SKU' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if product exists before deleting
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(id)))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(products)
      .where(eq(products.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Product deleted successfully',
        product: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}