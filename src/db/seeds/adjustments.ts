import { db } from '@/db';
import { adjustments } from '@/db/schema';

async function main() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const sampleAdjustments = [
        {
            adjustmentNumber: 'ADJ-2024-001',
            warehouseId: 1,
            productId: 2,
            systemQuantity: 18,
            countedQuantity: 15,
            difference: -3,
            reason: 'Physical count discrepancy - damaged stock found',
            status: 'done',
            createdBy: 'user_placeholder_123',
            createdAt: oneMonthAgo.toISOString(),
            validatedAt: oneMonthAgo.toISOString(),
        },
        {
            adjustmentNumber: 'ADJ-2024-002',
            warehouseId: 2,
            productId: 11,
            systemQuantity: 7,
            countedQuantity: 10,
            difference: 3,
            reason: 'Inventory reconciliation - unreported receipt',
            status: 'done',
            createdBy: 'user_placeholder_123',
            createdAt: twoWeeksAgo.toISOString(),
            validatedAt: twoWeeksAgo.toISOString(),
        },
    ];

    await db.insert(adjustments).values(sampleAdjustments);
    
    console.log('✅ Adjustments seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});