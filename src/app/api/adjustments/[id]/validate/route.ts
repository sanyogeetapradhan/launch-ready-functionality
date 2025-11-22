import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { adjustments, products, productStock, stockLedger } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate ID parameter
    const id = params.id;
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID' 
        },
        { status: 400 }
      );
    }

    const adjustmentId = parseInt(id);

    // Fetch adjustment details
    const adjustment = await db
      .select()
      .from(adjustments)
      .where(eq(adjustments.id, adjustmentId))
      .limit(1);

    if (adjustment.length === 0) {
      return NextResponse.json(
        { error: 'Adjustment not found' },
        { status: 404 }
      );
    }

    const adjustmentRecord = adjustment[0];

    // Validate adjustment status
    if (adjustmentRecord.status !== 'draft') {
      return NextResponse.json(
        { 
          error: 'Adjustment already validated or cancelled',
          code: 'INVALID_STATUS' 
        },
        { status: 400 }
      );
    }

    const { 
      productId, 
      warehouseId, 
      difference, 
      adjustmentNumber 
    } = adjustmentRecord;

    // Start transaction-like operations
    const currentTimestamp = new Date().toISOString();
    let oldQuantity = 0;
    let newQuantity = 0;

    try {
      // Step 1: Update products.currentStock
      const currentProduct = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (currentProduct.length === 0) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }

      const oldProductStock = currentProduct[0].currentStock || 0;
      const newProductStock = oldProductStock + difference;

      await db
        .update(products)
        .set({
          currentStock: newProductStock,
          updatedAt: currentTimestamp
        })
        .where(eq(products.id, productId));

      console.log(`Updated product ${productId} stock: ${oldProductStock} -> ${newProductStock} (difference: ${difference})`);

      // Step 2: Update or create productStock for warehouse
      const existingStock = await db
        .select()
        .from(productStock)
        .where(
          and(
            eq(productStock.productId, productId),
            eq(productStock.warehouseId, warehouseId)
          )
        )
        .limit(1);

      if (existingStock.length === 0) {
        // Create new productStock record with countedQuantity
        newQuantity = adjustmentRecord.countedQuantity;
        oldQuantity = 0;

        await db.insert(productStock).values({
          productId,
          warehouseId,
          quantity: newQuantity,
          updatedAt: currentTimestamp
        });

        console.log(`Created new productStock for warehouse ${warehouseId}: quantity=${newQuantity}`);
      } else {
        // Update existing productStock
        oldQuantity = existingStock[0].quantity || 0;
        newQuantity = oldQuantity + difference;

        await db
          .update(productStock)
          .set({
            quantity: newQuantity,
            updatedAt: currentTimestamp
          })
          .where(eq(productStock.id, existingStock[0].id));

        console.log(`Updated productStock for warehouse ${warehouseId}: ${oldQuantity} -> ${newQuantity} (difference: ${difference})`);
      }

      // Step 3: Create stockLedger entry
      await db.insert(stockLedger).values({
        productId,
        warehouseId,
        operationType: 'adjustment',
        referenceNumber: adjustmentNumber,
        quantityChange: difference,
        quantityAfter: newQuantity,
        createdBy: user.id,
        createdAt: currentTimestamp,
        notes: adjustmentRecord.reason || 'Stock adjustment validation'
      });

      console.log(`Created stockLedger entry: operation=adjustment, reference=${adjustmentNumber}, change=${difference}, after=${newQuantity}`);

      // Step 4: Update adjustment status
      await db
        .update(adjustments)
        .set({
          status: 'done',
          validatedAt: currentTimestamp
        })
        .where(eq(adjustments.id, adjustmentId));

      console.log(`Adjustment ${adjustmentNumber} validated successfully`);

      return NextResponse.json({
        message: 'Adjustment validated successfully',
        adjustmentNumber,
        productId,
        warehouseId,
        difference,
        oldQuantity,
        newQuantity
      }, { status: 200 });

    } catch (dbError) {
      console.error('Database operation failed during adjustment validation:', dbError);
      
      // Attempt to rollback by reverting adjustment status if possible
      // Note: SQLite doesn't support true transactions in this context,
      // but we log the failure for manual intervention
      console.error(`ROLLBACK REQUIRED for adjustment ${adjustmentNumber}: ${dbError}`);
      
      throw dbError;
    }

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}