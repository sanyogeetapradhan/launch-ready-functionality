import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { warehouses } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const isActiveParam = searchParams.get('isActive');

    let query = db.select().from(warehouses);

    const conditions = [];

    // Filter by isActive status
    if (isActiveParam !== null) {
      const isActiveValue = isActiveParam === 'true';
      conditions.push(eq(warehouses.isActive, isActiveValue));
    }

    // Search by name or location
    if (search) {
      conditions.push(
        or(
          like(warehouses.name, `%${search}%`),
          like(warehouses.location, `%${search}%`)
        )
      );
    }

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    const results = await query
      .orderBy(desc(warehouses.createdAt))
      .limit(limit)
      .offset(offset);

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
    const { name, location, isActive } = body;

    // Validate required fields
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return NextResponse.json(
        {
          error: 'Name is required and cannot be empty',
          code: 'MISSING_REQUIRED_FIELD'
        },
        { status: 400 }
      );
    }

    // Prepare insert data with defaults
    const insertData = {
      name: trimmedName,
      location: location?.trim() || null,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: new Date().toISOString()
    };

    const newWarehouse = await db.insert(warehouses)
      .values(insertData)
      .returning();

    return NextResponse.json(newWarehouse[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}