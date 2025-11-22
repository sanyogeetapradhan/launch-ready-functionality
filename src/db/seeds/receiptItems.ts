import { db } from '@/db';
import { receiptItems } from '@/db/schema';

async function main() {
    const sampleReceiptItems = [
        // Receipt 1 (REC-2024-001) - 3 items
        {
            receiptId: 1,
            productId: 1,
            quantity: 100,
            unitPrice: 50,
            createdAt: new Date('2024-01-15T09:00:00').toISOString(),
        },
        {
            receiptId: 1,
            productId: 3,
            quantity: 50,
            unitPrice: 120,
            createdAt: new Date('2024-01-15T09:00:00').toISOString(),
        },
        {
            receiptId: 1,
            productId: 4,
            quantity: 10,
            unitPrice: 500,
            createdAt: new Date('2024-01-15T09:00:00').toISOString(),
        },
        // Receipt 2 (REC-2024-002) - 4 items
        {
            receiptId: 2,
            productId: 5,
            quantity: 8,
            unitPrice: 150,
            createdAt: new Date('2024-01-20T10:30:00').toISOString(),
        },
        {
            receiptId: 2,
            productId: 6,
            quantity: 15,
            unitPrice: 75,
            createdAt: new Date('2024-01-20T10:30:00').toISOString(),
        },
        {
            receiptId: 2,
            productId: 7,
            quantity: 5,
            unitPrice: 200,
            createdAt: new Date('2024-01-20T10:30:00').toISOString(),
        },
        {
            receiptId: 2,
            productId: 8,
            quantity: 1,
            unitPrice: 1500,
            createdAt: new Date('2024-01-20T10:30:00').toISOString(),
        },
        // Receipt 3 (REC-2024-003) - 3 items
        {
            receiptId: 3,
            productId: 13,
            quantity: 20,
            unitPrice: 85,
            createdAt: new Date('2024-02-01T11:15:00').toISOString(),
        },
        {
            receiptId: 3,
            productId: 14,
            quantity: 10,
            unitPrice: 120,
            createdAt: new Date('2024-02-01T11:15:00').toISOString(),
        },
        {
            receiptId: 3,
            productId: 15,
            quantity: 30,
            unitPrice: 65,
            createdAt: new Date('2024-02-01T11:15:00').toISOString(),
        },
        // Receipt 4 (REC-2024-004) - 3 items
        {
            receiptId: 4,
            productId: 10,
            quantity: 25,
            unitPrice: 25,
            createdAt: new Date('2024-02-05T14:00:00').toISOString(),
        },
        {
            receiptId: 4,
            productId: 11,
            quantity: 10,
            unitPrice: 45,
            createdAt: new Date('2024-02-05T14:00:00').toISOString(),
        },
        {
            receiptId: 4,
            productId: 12,
            quantity: 50,
            unitPrice: 3,
            createdAt: new Date('2024-02-05T14:00:00').toISOString(),
        },
        // Receipt 5 (REC-2024-005) - 2 items
        {
            receiptId: 5,
            productId: 9,
            quantity: 100,
            unitPrice: 10,
            createdAt: new Date('2024-02-10T08:45:00').toISOString(),
        },
        {
            receiptId: 5,
            productId: 2,
            quantity: 15,
            unitPrice: 80,
            createdAt: new Date('2024-02-10T08:45:00').toISOString(),
        },
        // Receipt 6 (REC-2024-006) - pending, 2 items
        {
            receiptId: 6,
            productId: 1,
            quantity: 50,
            unitPrice: 50,
            createdAt: new Date('2024-02-12T09:30:00').toISOString(),
        },
        {
            receiptId: 6,
            productId: 4,
            quantity: 5,
            unitPrice: 500,
            createdAt: new Date('2024-02-12T09:30:00').toISOString(),
        },
        // Receipt 7 (REC-2024-007) - pending, 3 items
        {
            receiptId: 7,
            productId: 7,
            quantity: 3,
            unitPrice: 200,
            createdAt: new Date('2024-02-14T13:20:00').toISOString(),
        },
        {
            receiptId: 7,
            productId: 8,
            quantity: 1,
            unitPrice: 1500,
            createdAt: new Date('2024-02-14T13:20:00').toISOString(),
        },
        {
            receiptId: 7,
            productId: 11,
            quantity: 5,
            unitPrice: 45,
            createdAt: new Date('2024-02-14T13:20:00').toISOString(),
        },
        // Receipt 8 (REC-2024-008) - pending, 2 items
        {
            receiptId: 8,
            productId: 14,
            quantity: 5,
            unitPrice: 120,
            createdAt: new Date('2024-02-15T15:00:00').toISOString(),
        },
        {
            receiptId: 8,
            productId: 15,
            quantity: 20,
            unitPrice: 65,
            createdAt: new Date('2024-02-15T15:00:00').toISOString(),
        },
    ];

    await db.insert(receiptItems).values(sampleReceiptItems);
    
    console.log('✅ Receipt items seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});