import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adjustments, products, warehouses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

    const result = await db
      .select({
        id: adjustments.id,
        adjustmentNumber: adjustments.adjustmentNumber,
        warehouseId: adjustments.warehouseId,
        productId: adjustments.productId,
        countedQuantity: adjustments.countedQuantity,
        systemQuantity: adjustments.systemQuantity,
        difference: adjustments.difference,
        reason: adjustments.reason,
        status: adjustments.status,
        createdBy: adjustments.createdBy,
        createdAt: adjustments.createdAt,
        validatedAt: adjustments.validatedAt,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          unitOfMeasure: products.unitOfMeasure,
        },
        warehouse: {
          id: warehouses.id,
          name: warehouses.name,
          location: warehouses.location,
        },
      })
      .from(adjustments)
      .leftJoin(products, eq(adjustments.productId, products.id))
      .leftJoin(warehouses, eq(adjustments.warehouseId, warehouses.id))
      .where(eq(adjustments.id, parseInt(id)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Adjustment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0], { status: 200 });
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
    const { adjustmentNumber, countedQuantity, reason, status } = body;

    // Check if adjustment exists
    const existingAdjustment = await db
      .select()
      .from(adjustments)
      .where(eq(adjustments.id, parseInt(id)))
      .limit(1);

    if (existingAdjustment.length === 0) {
      return NextResponse.json(
        { error: 'Adjustment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status !== undefined) {
      const allowedStatuses = ['draft', 'done', 'cancelled'];
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status. Must be one of: draft, done, cancelled',
            code: 'INVALID_STATUS',
          },
          { status: 400 }
        );
      }
    }

    // Check for duplicate adjustmentNumber if provided
    if (adjustmentNumber !== undefined && adjustmentNumber !== existingAdjustment[0].adjustmentNumber) {
      const duplicateCheck = await db
        .select()
        .from(adjustments)
        .where(eq(adjustments.adjustmentNumber, adjustmentNumber))
        .limit(1);

      if (duplicateCheck.length > 0) {
        return NextResponse.json(
          {
            error: 'Adjustment number already exists',
            code: 'DUPLICATE_ADJUSTMENT_NUMBER',
          },
          { status: 409 }
        );
      }
    }

    // Prepare update object
    const updates: any = {};

    if (adjustmentNumber !== undefined) {
      updates.adjustmentNumber = adjustmentNumber.trim();
    }

    if (countedQuantity !== undefined) {
      if (typeof countedQuantity !== 'number' || countedQuantity < 0) {
        return NextResponse.json(
          {
            error: 'Counted quantity must be a non-negative number',
            code: 'INVALID_COUNTED_QUANTITY',
          },
          { status: 400 }
        );
      }
      updates.countedQuantity = countedQuantity;
      // Recalculate difference
      updates.difference = countedQuantity - existingAdjustment[0].systemQuantity;
    }

    if (reason !== undefined) {
      updates.reason = reason ? reason.trim() : null;
    }

    if (status !== undefined) {
      updates.status = status;
      // Set validatedAt if status is changing to 'done'
      if (status === 'done' && existingAdjustment[0].status !== 'done') {
        updates.validatedAt = new Date().toISOString();
      }
    }

    // Always update updatedAt (add to schema if needed, for now just update the record)
    const updated = await db
      .update(adjustments)
      .set(updates)
      .where(eq(adjustments.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update adjustment', code: 'UPDATE_FAILED' },
        { status: 500 }
      );
    }

    // Fetch the complete updated record with relations
    const result = await db
      .select({
        id: adjustments.id,
        adjustmentNumber: adjustments.adjustmentNumber,
        warehouseId: adjustments.warehouseId,
        productId: adjustments.productId,
        countedQuantity: adjustments.countedQuantity,
        systemQuantity: adjustments.systemQuantity,
        difference: adjustments.difference,
        reason: adjustments.reason,
        status: adjustments.status,
        createdBy: adjustments.createdBy,
        createdAt: adjustments.createdAt,
        validatedAt: adjustments.validatedAt,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          unitOfMeasure: products.unitOfMeasure,
        },
        warehouse: {
          id: warehouses.id,
          name: warehouses.name,
          location: warehouses.location,
        },
      })
      .from(adjustments)
      .leftJoin(products, eq(adjustments.productId, products.id))
      .leftJoin(warehouses, eq(adjustments.warehouseId, warehouses.id))
      .where(eq(adjustments.id, parseInt(id)))
      .limit(1);

    return NextResponse.json(result[0], { status: 200 });
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

    // Check if adjustment exists and get its status
    const existingAdjustment = await db
      .select()
      .from(adjustments)
      .where(eq(adjustments.id, parseInt(id)))
      .limit(1);

    if (existingAdjustment.length === 0) {
      return NextResponse.json(
        { error: 'Adjustment not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if status allows deletion
    const adjustment = existingAdjustment[0];
    if (adjustment.status !== 'draft' && adjustment.status !== 'cancelled') {
      return NextResponse.json(
        {
          error: 'Cannot delete validated adjustment',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    // Delete the adjustment
    const deleted = await db
      .delete(adjustments)
      .where(eq(adjustments.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete adjustment', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Adjustment deleted successfully',
        adjustment: deleted[0],
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