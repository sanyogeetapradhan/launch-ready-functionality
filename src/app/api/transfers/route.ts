import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { transfers, transferItems, products } from '@/db/schema';
import { eq, like, and, or, gte, lte, ne } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const ALLOWED_STATUSES = ['draft', 'waiting', 'ready', 'done', 'cancelled'];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    
    // Filters
    const status = searchParams.get('status');
    const fromWarehouse = searchParams.get('fromWarehouse');
    const toWarehouse = searchParams.get('toWarehouse');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const search = searchParams.get('search');

    // Build WHERE conditions
    const conditions = [];

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json({ 
          error: 'Invalid status value',
          code: 'INVALID_STATUS' 
        }, { status: 400 });
      }
      conditions.push(eq(transfers.status, status));
    }

    if (fromWarehouse) {
      const fromWarehouseId = parseInt(fromWarehouse);
      if (isNaN(fromWarehouseId)) {
        return NextResponse.json({ 
          error: 'Invalid fromWarehouse ID',
          code: 'INVALID_FROM_WAREHOUSE' 
        }, { status: 400 });
      }
      conditions.push(eq(transfers.fromWarehouseId, fromWarehouseId));
    }

    if (toWarehouse) {
      const toWarehouseId = parseInt(toWarehouse);
      if (isNaN(toWarehouseId)) {
        return NextResponse.json({ 
          error: 'Invalid toWarehouse ID',
          code: 'INVALID_TO_WAREHOUSE' 
        }, { status: 400 });
      }
      conditions.push(eq(transfers.toWarehouseId, toWarehouseId));
    }

    if (dateFrom) {
      conditions.push(gte(transfers.createdAt, dateFrom));
    }

    if (dateTo) {
      // Add one day to include the entire day
      const dateToInclusive = new Date(dateTo);
      dateToInclusive.setDate(dateToInclusive.getDate() + 1);
      conditions.push(lte(transfers.createdAt, dateToInclusive.toISOString().split('T')[0]));
    }

    if (search) {
      conditions.push(like(transfers.transferNumber, `%${search}%`));
    }

    // Execute query
    let query = db.select().from(transfers);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .limit(limit)
      .offset(offset)
      .orderBy(transfers.createdAt);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { transferNumber, fromWarehouseId, toWarehouseId, status, notes, createdBy } = body;

    // Validate required fields
    if (!transferNumber) {
      return NextResponse.json({ 
        error: 'Transfer number is required',
        code: 'MISSING_TRANSFER_NUMBER' 
      }, { status: 400 });
    }

    if (!fromWarehouseId) {
      return NextResponse.json({ 
        error: 'From warehouse ID is required',
        code: 'MISSING_FROM_WAREHOUSE' 
      }, { status: 400 });
    }

    if (!toWarehouseId) {
      return NextResponse.json({ 
        error: 'To warehouse ID is required',
        code: 'MISSING_TO_WAREHOUSE' 
      }, { status: 400 });
    }

    // Validate warehouse IDs are different
    if (fromWarehouseId === toWarehouseId) {
      return NextResponse.json({ 
        error: 'Cannot transfer to same warehouse',
        code: 'INVALID_WAREHOUSES' 
      }, { status: 400 });
    }

    // Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status value. Must be one of: ' + ALLOWED_STATUSES.join(', '),
        code: 'INVALID_STATUS' 
      }, { status: 400 });
    }

    // Check for duplicate transfer number
    const existing = await db.select()
      .from(transfers)
      .where(eq(transfers.transferNumber, transferNumber.trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ 
        error: 'Transfer number already exists',
        code: 'DUPLICATE_NUMBER' 
      }, { status: 409 });
    }

    // Prepare data for insertion
    const insertData = {
      transferNumber: transferNumber.trim(),
      fromWarehouseId: parseInt(fromWarehouseId),
      toWarehouseId: parseInt(toWarehouseId),
      status: status || 'draft',
      notes: notes?.trim() || null,
      createdBy: createdBy || user.id,
      createdAt: new Date().toISOString(),
      validatedAt: null
    };

    // Insert new transfer
    const newTransfer = await db.insert(transfers)
      .values(insertData)
      .returning();

    const created = newTransfer[0];

    // If items provided, validate and insert into transfer_items
    if (Array.isArray(body.items) && body.items.length > 0) {
      const itemsToInsert: any[] = [];
      for (const it of body.items) {
        const { productId, quantity } = it;

        // Validate product exists
        const prod = await db.select().from(products).where(eq(products.id, parseInt(String(productId)))).limit(1);
        if (prod.length === 0) {
          return NextResponse.json({ error: `Product ID ${productId} not found`, code: 'PRODUCT_NOT_FOUND' }, { status: 400 });
        }

        if (isNaN(parseInt(String(quantity))) || parseInt(String(quantity)) <= 0) {
          return NextResponse.json({ error: 'Item quantity must be a positive integer', code: 'INVALID_ITEM_QUANTITY' }, { status: 400 });
        }

        itemsToInsert.push({
          transferId: created.id,
          productId: parseInt(String(productId)),
          quantity: parseInt(String(quantity)),
          createdAt: new Date().toISOString(),
        });
      }

      if (itemsToInsert.length > 0) {
        await db.insert(transferItems).values(itemsToInsert);
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    
    // Check for unique constraint violation
    if ((error as Error).message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ 
        error: 'Transfer number already exists',
        code: 'DUPLICATE_NUMBER' 
      }, { status: 409 });
    }

    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}