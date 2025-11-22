import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { categories } from '@/db/schema';
import { eq, like, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');

    let query = db.select().from(categories);

    if (search) {
      query = query.where(like(categories.name, `%${search}%`));
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
    const { name, description } = body;

    // Validate required fields
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.name, trimmedName))
      .limit(1);

    if (existingCategory.length > 0) {
      return NextResponse.json(
        { error: 'Category name already exists', code: 'DUPLICATE_NAME' },
        { status: 409 }
      );
    }

    // Create new category
    const newCategory = await db
      .insert(categories)
      .values({
        name: trimmedName,
        description: description?.trim() || null,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newCategory[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);

    // Handle unique constraint violation at database level
    if ((error as Error).message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { error: 'Category name already exists', code: 'DUPLICATE_NAME' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}