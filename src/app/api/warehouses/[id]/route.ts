import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { warehouses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const warehouse = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, parseInt(id)))
      .limit(1);

    if (warehouse.length === 0) {
      return NextResponse.json(
        { error: 'Warehouse not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(warehouse[0], { status: 200 });
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
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, location, isActive } = body;

    // Validate name if provided
    if (name !== undefined && (!name || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Name cannot be empty', code: 'INVALID_NAME' },
        { status: 400 }
      );
    }

    // Check if warehouse exists
    const existingWarehouse = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, parseInt(id)))
      .limit(1);

    if (existingWarehouse.length === 0) {
      return NextResponse.json(
        { error: 'Warehouse not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: {
      name?: string;
      location?: string;
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
      updates.name = name.trim();
    }
    if (location !== undefined) {
      updates.location = location;
    }
    if (isActive !== undefined) {
      updates.isActive = isActive;
    }

    const updated = await db
      .update(warehouses)
      .set(updates)
      .where(eq(warehouses.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
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
    const id = params.id;

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if warehouse exists
    const existingWarehouse = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, parseInt(id)))
      .limit(1);

    if (existingWarehouse.length === 0) {
      return NextResponse.json(
        { error: 'Warehouse not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(warehouses)
      .where(eq(warehouses.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Warehouse deleted successfully',
        warehouse: deleted[0],
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