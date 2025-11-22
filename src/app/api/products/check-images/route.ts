import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

async function probeUrl(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, status: 0, error: String(err) };
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const all = await db.select().from(products);

    const checks = await Promise.all(
      all.map(async (p) => {
        if (!p.image) return { id: p.id, sku: p.sku, image: p.image ?? null, ok: false, status: null };
        const probe = await probeUrl(p.image);
        return { id: p.id, sku: p.sku, image: p.image, ok: probe.ok, status: probe.status, error: (probe as any).error ?? null };
      })
    );

    return NextResponse.json({ count: checks.length, checks }, { status: 200 });
  } catch (error) {
    console.error('check-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
