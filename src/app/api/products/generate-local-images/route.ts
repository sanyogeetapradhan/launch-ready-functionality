import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

function svgForProduct(sku: string, name: string) {
  const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = `${sku} - ${safeName}`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">\n  <defs>\n    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">\n      <stop offset="0%" stop-color="#e6f2ff"/>\n      <stop offset="100%" stop-color="#f0f9ff"/>\n    </linearGradient>\n  </defs>\n  <rect width="100%" height="100%" fill="url(#g)" />\n  <text x="20" y="40" font-family="Arial,Helvetica,sans-serif" font-size="18" fill="#333">${text}</text>\n</svg>`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const all = await db.select().from(products);

    const publicDir = path.join(process.cwd(), 'public', 'products');
    fs.mkdirSync(publicDir, { recursive: true });

    const updated: any[] = [];

    for (const p of all) {
      const skuSafe = String(p.sku).replace(/[^a-zA-Z0-9-_\.]/g, '_');
      const filename = `${skuSafe}.svg`;
      const filepath = path.join(publicDir, filename);
      const svg = svgForProduct(p.sku, p.name || '');
      fs.writeFileSync(filepath, svg, 'utf8');

      const newUrl = `/products/${filename}`;
      const res = await db.update(products).set({ image: newUrl }).where(eq(products.id, p.id)).returning();
      if (res && res.length > 0) updated.push(res[0]);
    }

    return NextResponse.json({ updatedCount: updated.length, updated }, { status: 200 });
  } catch (error) {
    console.error('generate-local-images error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
