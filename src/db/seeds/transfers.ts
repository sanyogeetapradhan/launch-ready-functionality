import { db } from '@/db';
import { transfers } from '@/db/schema';

async function main() {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const sampleTransfers = [
        {
            transferNumber: 'TRF-2024-001',
            fromWarehouseId: 1,
            toWarehouseId: 2,
            status: 'done',
            notes: 'Stock rebalancing - redistributing excess inventory to meet regional demand',
            createdBy: 'user_placeholder_123',
            createdAt: twoMonthsAgo.toISOString(),
            validatedAt: twoMonthsAgo.toISOString(),
        },
        {
            transferNumber: 'TRF-2024-002',
            fromWarehouseId: 1,
            toWarehouseId: 3,
            status: 'done',
            notes: 'Store replenishment - transferring items for seasonal inventory adjustment',
            createdBy: 'user_placeholder_123',
            createdAt: oneMonthAgo.toISOString(),
            validatedAt: oneMonthAgo.toISOString(),
        },
        {
            transferNumber: 'TRF-2024-003',
            fromWarehouseId: 2,
            toWarehouseId: 3,
            status: 'done',
            notes: 'Stock rebalancing - optimizing inventory distribution across locations',
            createdBy: 'user_placeholder_123',
            createdAt: twoWeeksAgo.toISOString(),
            validatedAt: twoWeeksAgo.toISOString(),
        },
    ];

    await db.insert(transfers).values(sampleTransfers);
    
    console.log('✅ Transfers seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});