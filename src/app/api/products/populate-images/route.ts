import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch all products
    const all = await db.select().from(products);

    const updated: Array<any> = [];

    for (const p of all) {
      if (!p.image || p.image === '') {
        const url = `https://via.placeholder.com/400x300.png?text=${encodeURIComponent(p.sku)}`;
        const res = await db.update(products).set({ image: url }).where(products.id.eq(p.id)).returning();
        if (res && res.length > 0) updated.push(res[0]);
      }
    }

    return NextResponse.json({ updatedCount: updated.length, updated }, { status: 200 });
  } catch (error) {
    console.error('populate-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
