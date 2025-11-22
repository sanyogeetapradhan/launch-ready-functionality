import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transfers, transferItems, products } from '@/db/schema';
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

    const transfer = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, parseInt(id)))
      .limit(1);

    if (transfer.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const items = await db
      .select({
        id: transferItems.id,
        transferId: transferItems.transferId,
        productId: transferItems.productId,
        quantity: transferItems.quantity,
        createdAt: transferItems.createdAt,
        productName: products.name,
        productSku: products.sku,
      })
      .from(transferItems)
      .leftJoin(products, eq(transferItems.productId, products.id))
      .where(eq(transferItems.transferId, parseInt(id)));

    const result = {
      ...transfer[0],
      items: items,
    };

    return NextResponse.json(result, { status: 200 });
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
    const { transferNumber, fromWarehouseId, toWarehouseId, status, notes } = body;

    const existingTransfer = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, parseInt(id)))
      .limit(1);

    if (existingTransfer.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    const finalFromWarehouseId = fromWarehouseId ?? existingTransfer[0].fromWarehouseId;
    const finalToWarehouseId = toWarehouseId ?? existingTransfer[0].toWarehouseId;

    if (finalFromWarehouseId && finalToWarehouseId && finalFromWarehouseId === finalToWarehouseId) {
      return NextResponse.json(
        {
          error: 'Cannot transfer to same warehouse',
          code: 'INVALID_WAREHOUSES',
        },
        { status: 400 }
      );
    }

    if (transferNumber && transferNumber !== existingTransfer[0].transferNumber) {
      const duplicateCheck = await db
        .select()
        .from(transfers)
        .where(
          and(
            eq(transfers.transferNumber, transferNumber),
            eq(transfers.id, parseInt(id))
          )
        )
        .limit(1);

      if (duplicateCheck.length > 0 && duplicateCheck[0].id !== parseInt(id)) {
        return NextResponse.json(
          {
            error: 'Transfer number already exists',
            code: 'DUPLICATE_TRANSFER_NUMBER',
          },
          { status: 409 }
        );
      }
    }

    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (transferNumber !== undefined) updates.transferNumber = transferNumber.trim();
    if (fromWarehouseId !== undefined) updates.fromWarehouseId = fromWarehouseId;
    if (toWarehouseId !== undefined) updates.toWarehouseId = toWarehouseId;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    const updated = await db
      .update(transfers)
      .set(updates)
      .where(eq(transfers.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found', code: 'NOT_FOUND' },
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

    const existingTransfer = await db
      .select()
      .from(transfers)
      .where(eq(transfers.id, parseInt(id)))
      .limit(1);

    if (existingTransfer.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const currentStatus = existingTransfer[0].status;
    if (currentStatus !== 'draft' && currentStatus !== 'cancelled') {
      return NextResponse.json(
        {
          error: 'Cannot delete validated transfer',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(transfers)
      .where(eq(transfers.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Transfer not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Transfer deleted successfully',
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