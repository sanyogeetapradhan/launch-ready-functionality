import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { eq, like, and, or, lte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const categoryId = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');
    const isActive = searchParams.get('isActive');

    let query = db.select().from(products);
    const conditions = [];

    // Category filter
    if (categoryId) {
      const categoryIdNum = parseInt(categoryId);
      if (!isNaN(categoryIdNum)) {
        conditions.push(eq(products.categoryId, categoryIdNum));
      }
    }

    // Low stock filter
    if (lowStock === 'true') {
      conditions.push(lte(products.currentStock, sql`${products.reorderLevel}`));
    }

    // Active status filter
    if (isActive !== null && isActive !== undefined) {
      const activeValue = isActive === 'true';
      conditions.push(eq(products.isActive, activeValue));
    }

    // Search filter
    if (search) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.sku, `%${search}%`)
        )
      );
    }

    // Apply all conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      unitOfMeasure,
      reorderLevel,
      currentStock,
      costPrice,
      sellingPrice,
      description,
      isActive,
    } = body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!sku || sku.trim() === '') {
      return NextResponse.json(
        { error: 'SKU is required', code: 'MISSING_SKU' },
        { status: 400 }
      );
    }

    if (!unitOfMeasure || unitOfMeasure.trim() === '') {
      return NextResponse.json(
        { error: 'Unit of measure is required', code: 'MISSING_UNIT_OF_MEASURE' },
        { status: 400 }
      );
    }

    // Validate categoryId exists if provided
    if (categoryId !== undefined && categoryId !== null) {
      const categoryExists = await db
        .select()
        .from(categories)
        .where(eq(categories.id, parseInt(categoryId)))
        .limit(1);

      if (categoryExists.length === 0) {
        return NextResponse.json(
          { error: 'Category does not exist', code: 'INVALID_CATEGORY' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate SKU
    const existingSku = await db
      .select()
      .from(products)
      .where(eq(products.sku, sku.trim()))
      .limit(1);

    if (existingSku.length > 0) {
      return NextResponse.json(
        { error: 'SKU already exists', code: 'DUPLICATE_SKU' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const newProduct = await db
      .insert(products)
      .values({
        name: name.trim(),
        sku: sku.trim(),
        categoryId: categoryId !== undefined && categoryId !== null ? parseInt(categoryId) : null,
        unitOfMeasure: unitOfMeasure.trim(),
        reorderLevel: reorderLevel !== undefined ? parseInt(reorderLevel) : 0,
        currentStock: currentStock !== undefined ? parseInt(currentStock) : 0,
        costPrice: costPrice !== undefined ? parseFloat(costPrice) : 0,
        sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : 0,
        description: description?.trim() || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newProduct[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);

    // Handle unique constraint violations
    if ((error as Error).message.includes('UNIQUE constraint failed')) {
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

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const productId = parseInt(id);

    // Check if product exists
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      unitOfMeasure,
      reorderLevel,
      currentStock,
      costPrice,
      sellingPrice,
      description,
      isActive,
    } = body;

    // Validate required fields if provided
    if (name !== undefined && (!name || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Name cannot be empty', code: 'INVALID_NAME' },
        { status: 400 }
      );
    }

    if (sku !== undefined && (!sku || sku.trim() === '')) {
      return NextResponse.json(
        { error: 'SKU cannot be empty', code: 'INVALID_SKU' },
        { status: 400 }
      );
    }

    if (unitOfMeasure !== undefined && (!unitOfMeasure || unitOfMeasure.trim() === '')) {
      return NextResponse.json(
        { error: 'Unit of measure cannot be empty', code: 'INVALID_UNIT_OF_MEASURE' },
        { status: 400 }
      );
    }

    // Check for duplicate SKU if SKU is being updated
    if (sku !== undefined && sku.trim() !== existingProduct[0].sku) {
      const duplicateSku = await db
        .select()
        .from(products)
        .where(eq(products.sku, sku.trim()))
        .limit(1);

      if (duplicateSku.length > 0) {
        return NextResponse.json(
          { error: 'SKU already exists', code: 'DUPLICATE_SKU' },
          { status: 409 }
        );
      }
    }

    // Validate categoryId exists if provided
    if (categoryId !== undefined && categoryId !== null) {
      const categoryExists = await db
        .select()
        .from(categories)
        .where(eq(categories.id, parseInt(categoryId)))
        .limit(1);

      if (categoryExists.length === 0) {
        return NextResponse.json(
          { error: 'Category does not exist', code: 'INVALID_CATEGORY' },
          { status: 400 }
        );
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (sku !== undefined) updates.sku = sku.trim();
    if (categoryId !== undefined) updates.categoryId = categoryId !== null ? parseInt(categoryId) : null;
    if (unitOfMeasure !== undefined) updates.unitOfMeasure = unitOfMeasure.trim();
    if (reorderLevel !== undefined) updates.reorderLevel = parseInt(reorderLevel);
    if (currentStock !== undefined) updates.currentStock = parseInt(currentStock);
    if (costPrice !== undefined) updates.costPrice = parseFloat(costPrice);
    if (sellingPrice !== undefined) updates.sellingPrice = parseFloat(sellingPrice);
    if (description !== undefined) updates.description = description?.trim() || null;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const updatedProduct = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, productId))
      .returning();

    return NextResponse.json(updatedProduct[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);

    // Handle unique constraint violations
    if ((error as Error).message.includes('UNIQUE constraint failed')) {
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

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const productId = parseInt(id);

    // Check if product exists
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json(
        { error: 'Product not found', code: 'PRODUCT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deletedProduct = await db
      .delete(products)
      .where(eq(products.id, productId))
      .returning();

    return NextResponse.json(
      {
        message: 'Product deleted successfully',
        product: deletedProduct[0],
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