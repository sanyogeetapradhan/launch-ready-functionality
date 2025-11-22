import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adjustments } from '@/db/schema';
import { like } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const year = new Date().getFullYear();
    const prefix = `ADJ-${year}-`;

    const rows: Array<{ adjustmentNumber: string }> = await db
      .select({ adjustmentNumber: adjustments.adjustmentNumber })
      .from(adjustments)
      .where(like(adjustments.adjustmentNumber, `${prefix}%`));

    let maxSeq = 0;
    for (const r of rows) {
      const parts = r.adjustmentNumber.split('-');
      const seqStr = parts[2];
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }

    const nextSeq = maxSeq + 1;
    const next = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    return NextResponse.json({ next }, { status: 200 });
  } catch (error) {
    console.error('Error generating next adjustment number:', error);
    return NextResponse.json({ error: 'Failed to compute next adjustment number' }, { status: 500 });
  }
}
