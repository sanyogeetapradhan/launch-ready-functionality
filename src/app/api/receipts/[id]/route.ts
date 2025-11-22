import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { receipts, receiptItems, products } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const ALLOWED_STATUSES = ['draft', 'waiting', 'ready', 'done', 'cancelled'];

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

    const receiptId = parseInt(id);

    const receipt = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);

    if (receipt.length === 0) {
      return NextResponse.json(
        { error: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const items = await db
      .select({
        id: receiptItems.id,
        receiptId: receiptItems.receiptId,
        productId: receiptItems.productId,
        quantity: receiptItems.quantity,
        unitPrice: receiptItems.unitPrice,
        createdAt: receiptItems.createdAt,
        productName: products.name,
        productSku: products.sku,
      })
      .from(receiptItems)
      .leftJoin(products, eq(receiptItems.productId, products.id))
      .where(eq(receiptItems.receiptId, receiptId));

    const receiptWithItems = {
      ...receipt[0],
      items: items,
    };

    return NextResponse.json(receiptWithItems, { status: 200 });
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

    const receiptId = parseInt(id);

    const body = await request.json();
    const { receiptNumber, warehouseId, supplierName, status, notes } = body;

    if (
      'createdBy' in body ||
      'userId' in body ||
      'user_id' in body
    ) {
      return NextResponse.json(
        {
          error: 'User ID cannot be provided in request body',
          code: 'USER_ID_NOT_ALLOWED',
        },
        { status: 400 }
      );
    }

    const existingReceipt = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);

    if (existingReceipt.length === 0) {
      return NextResponse.json(
        { error: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    if (receiptNumber && receiptNumber.trim() === '') {
      return NextResponse.json(
        { error: 'Receipt number cannot be empty', code: 'INVALID_RECEIPT_NUMBER' },
        { status: 400 }
      );
    }

    if (supplierName && supplierName.trim() === '') {
      return NextResponse.json(
        { error: 'Supplier name cannot be empty', code: 'INVALID_SUPPLIER_NAME' },
        { status: 400 }
      );
    }

    if (receiptNumber && receiptNumber !== existingReceipt[0].receiptNumber) {
      const duplicateCheck = await db
        .select()
        .from(receipts)
        .where(
          and(
            eq(receipts.receiptNumber, receiptNumber.trim())
          )
        )
        .limit(1);

      if (duplicateCheck.length > 0) {
        return NextResponse.json(
          {
            error: 'Receipt number already exists',
            code: 'DUPLICATE_RECEIPT_NUMBER',
          },
          { status: 409 }
        );
      }
    }

    const updates: any = {};

    if (receiptNumber !== undefined) {
      updates.receiptNumber = receiptNumber.trim();
    }
    if (warehouseId !== undefined) {
      updates.warehouseId = warehouseId;
    }
    if (supplierName !== undefined) {
      updates.supplierName = supplierName.trim();
    }
    if (status !== undefined) {
      updates.status = status;
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }

    const updated = await db
      .update(receipts)
      .set(updates)
      .where(eq(receipts.id, receiptId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

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

    const receiptId = parseInt(id);

    const existingReceipt = await db
      .select()
      .from(receipts)
      .where(eq(receipts.id, receiptId))
      .limit(1);

    if (existingReceipt.length === 0) {
      return NextResponse.json(
        { error: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const receiptStatus = existingReceipt[0].status;

    if (receiptStatus !== 'draft' && receiptStatus !== 'cancelled') {
      return NextResponse.json(
        {
          error: 'Cannot delete validated receipt',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(receipts)
      .where(eq(receipts.id, receiptId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Receipt not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Receipt deleted successfully',
        deleted: deleted[0],
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