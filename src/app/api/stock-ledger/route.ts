import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { stockLedger, products, warehouses, user } from '@/db/schema';
import { eq, and, or, gte, lte, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const ALLOWED_OPERATION_TYPES = ['receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment'];

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Filter parameters
    const productId = searchParams.get('product');
    const warehouseId = searchParams.get('warehouse');
    const operationType = searchParams.get('operationType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const referenceNumber = searchParams.get('reference');

    // Validate operationType if provided
    if (operationType && !ALLOWED_OPERATION_TYPES.includes(operationType)) {
      return NextResponse.json({ 
        error: `Invalid operation type. Allowed values: ${ALLOWED_OPERATION_TYPES.join(', ')}`,
        code: 'INVALID_OPERATION_TYPE'
      }, { status: 400 });
    }

    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateFrom && !dateRegex.test(dateFrom)) {
      return NextResponse.json({ 
        error: 'Invalid dateFrom format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }
    if (dateTo && !dateRegex.test(dateTo)) {
      return NextResponse.json({ 
        error: 'Invalid dateTo format. Use YYYY-MM-DD',
        code: 'INVALID_DATE_FORMAT'
      }, { status: 400 });
    }

    // Build filter conditions
    const conditions = [];

    if (productId) {
      const prodId = parseInt(productId);
      if (isNaN(prodId)) {
        return NextResponse.json({ 
          error: 'Invalid product ID',
          code: 'INVALID_PRODUCT_ID'
        }, { status: 400 });
      }
      conditions.push(eq(stockLedger.productId, prodId));
    }

    if (warehouseId) {
      const whId = parseInt(warehouseId);
      if (isNaN(whId)) {
        return NextResponse.json({ 
          error: 'Invalid warehouse ID',
          code: 'INVALID_WAREHOUSE_ID'
        }, { status: 400 });
      }
      conditions.push(eq(stockLedger.warehouseId, whId));
    }

    if (operationType) {
      conditions.push(eq(stockLedger.operationType, operationType));
    }

    if (referenceNumber) {
      conditions.push(eq(stockLedger.referenceNumber, referenceNumber));
    }

    if (dateFrom) {
      conditions.push(gte(stockLedger.createdAt, dateFrom));
    }

    if (dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      conditions.push(lte(stockLedger.createdAt, endDate.toISOString().split('T')[0]));
    }

    // Build query with joins
    let query = db
      .select({
        id: stockLedger.id,
        productId: stockLedger.productId,
        productName: products.name,
        productSku: products.sku,
        warehouseId: stockLedger.warehouseId,
        warehouseName: warehouses.name,
        operationType: stockLedger.operationType,
        referenceNumber: stockLedger.referenceNumber,
        quantityChange: stockLedger.quantityChange,
        quantityAfter: stockLedger.quantityAfter,
        createdBy: stockLedger.createdBy,
        createdByName: user.name,
        createdAt: stockLedger.createdAt,
        notes: stockLedger.notes,
      })
      .from(stockLedger)
      .leftJoin(products, eq(stockLedger.productId, products.id))
      .leftJoin(warehouses, eq(stockLedger.warehouseId, warehouses.id))
      .leftJoin(user, eq(stockLedger.createdBy, user.id))
      .orderBy(desc(stockLedger.createdAt));

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply pagination
    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}