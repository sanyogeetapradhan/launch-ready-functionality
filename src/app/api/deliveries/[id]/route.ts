import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deliveries, deliveryItems, products } from '@/db/schema';
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

    const delivery = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, parseInt(id)))
      .limit(1);

    if (delivery.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const items = await db
      .select({
        id: deliveryItems.id,
        deliveryId: deliveryItems.deliveryId,
        productId: deliveryItems.productId,
        quantity: deliveryItems.quantity,
        unitPrice: deliveryItems.unitPrice,
        createdAt: deliveryItems.createdAt,
        productName: products.name,
        productSku: products.sku,
      })
      .from(deliveryItems)
      .leftJoin(products, eq(deliveryItems.productId, products.id))
      .where(eq(deliveryItems.deliveryId, parseInt(id)));

    const result = {
      ...delivery[0],
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
    const { deliveryNumber, warehouseId, customerName, status, notes } = body;

    if (
      'createdBy' in body ||
      'created_by' in body ||
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

    const existing = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found', code: 'NOT_FOUND' },
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

    if (customerName !== undefined && !customerName.trim()) {
      return NextResponse.json(
        {
          error: 'Customer name cannot be empty',
          code: 'INVALID_CUSTOMER_NAME',
        },
        { status: 400 }
      );
    }

    if (deliveryNumber !== undefined && !deliveryNumber.trim()) {
      return NextResponse.json(
        {
          error: 'Delivery number cannot be empty',
          code: 'INVALID_DELIVERY_NUMBER',
        },
        { status: 400 }
      );
    }

    if (deliveryNumber && deliveryNumber !== existing[0].deliveryNumber) {
      const duplicate = await db
        .select()
        .from(deliveries)
        .where(
          and(
            eq(deliveries.deliveryNumber, deliveryNumber),
            eq(deliveries.id, parseInt(id))
          )
        )
        .limit(1);

      if (duplicate.length > 0 && duplicate[0].id !== parseInt(id)) {
        return NextResponse.json(
          {
            error: 'Delivery number already exists',
            code: 'DUPLICATE_DELIVERY_NUMBER',
          },
          { status: 409 }
        );
      }
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (deliveryNumber !== undefined) updates.deliveryNumber = deliveryNumber.trim();
    if (warehouseId !== undefined) updates.warehouseId = warehouseId;
    if (customerName !== undefined) updates.customerName = customerName.trim();
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const updated = await db
      .update(deliveries)
      .set(updates)
      .where(eq(deliveries.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found', code: 'NOT_FOUND' },
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

    const existing = await db
      .select()
      .from(deliveries)
      .where(eq(deliveries.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const delivery = existing[0];
    if (delivery.status !== 'draft' && delivery.status !== 'cancelled') {
      return NextResponse.json(
        {
          error: 'Cannot delete validated delivery',
          code: 'INVALID_STATUS',
        },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(deliveries)
      .where(eq(deliveries.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Delivery deleted successfully',
        delivery: deleted[0],
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