import { db } from '@/db';
import { transferItems } from '@/db/schema';

async function main() {
    const sampleTransferItems = [
        // Transfer 1 (TRF-2024-001) - W1 to W2
        {
            transferId: 1,
            productId: 2,
            quantity: 10,
            createdAt: new Date('2024-01-15T09:30:00').toISOString(),
        },
        {
            transferId: 1,
            productId: 5,
            quantity: 3,
            createdAt: new Date('2024-01-15T09:30:00').toISOString(),
        },
        {
            transferId: 1,
            productId: 9,
            quantity: 30,
            createdAt: new Date('2024-01-15T09:30:00').toISOString(),
        },
        // Transfer 2 (TRF-2024-002) - W1 to W3
        {
            transferId: 2,
            productId: 6,
            quantity: 8,
            createdAt: new Date('2024-01-18T14:20:00').toISOString(),
        },
        {
            transferId: 2,
            productId: 12,
            quantity: 20,
            createdAt: new Date('2024-01-18T14:20:00').toISOString(),
        },
        // Transfer 3 (TRF-2024-003) - W2 to W3
        {
            transferId: 3,
            productId: 7,
            quantity: 2,
            createdAt: new Date('2024-01-22T11:45:00').toISOString(),
        },
        {
            transferId: 3,
            productId: 10,
            quantity: 5,
            createdAt: new Date('2024-01-22T11:45:00').toISOString(),
        },
        {
            transferId: 3,
            productId: 14,
            quantity: 3,
            createdAt: new Date('2024-01-22T11:45:00').toISOString(),
        },
    ];

    await db.insert(transferItems).values(sampleTransferItems);
    
    console.log('✅ Transfer items seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});