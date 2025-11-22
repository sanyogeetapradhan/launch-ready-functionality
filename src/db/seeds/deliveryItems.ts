import { db } from '@/db';
import { deliveryItems } from '@/db/schema';

async function main() {
    const sampleDeliveryItems = [
        // Delivery 1 (DEL-2024-001) - 3 items
        {
            deliveryId: 1,
            productId: 4,
            quantity: 5,
            unitPrice: 800,
            createdAt: new Date('2024-01-15T09:00:00').toISOString(),
        },
        {
            deliveryId: 1,
            productId: 6,
            quantity: 10,
            unitPrice: 120,
            createdAt: new Date('2024-01-15T09:00:00').toISOString(),
        },
        {
            deliveryId: 1,
            productId: 9,
            quantity: 20,
            unitPrice: 18,
            createdAt: new Date('2024-01-15T09:00:00').toISOString(),
        },
        
        // Delivery 2 (DEL-2024-002) - 2 items
        {
            deliveryId: 2,
            productId: 1,
            quantity: 50,
            unitPrice: 75,
            createdAt: new Date('2024-01-18T10:30:00').toISOString(),
        },
        {
            deliveryId: 2,
            productId: 3,
            quantity: 30,
            unitPrice: 180,
            createdAt: new Date('2024-01-18T10:30:00').toISOString(),
        },
        
        // Delivery 3 (DEL-2024-003) - 3 items
        {
            deliveryId: 3,
            productId: 10,
            quantity: 10,
            unitPrice: 40,
            createdAt: new Date('2024-01-22T14:15:00').toISOString(),
        },
        {
            deliveryId: 3,
            productId: 11,
            quantity: 5,
            unitPrice: 70,
            createdAt: new Date('2024-01-22T14:15:00').toISOString(),
        },
        {
            deliveryId: 3,
            productId: 12,
            quantity: 30,
            unitPrice: 6,
            createdAt: new Date('2024-01-22T14:15:00').toISOString(),
        },
        
        // Delivery 4 (DEL-2024-004) - 2 items
        {
            deliveryId: 4,
            productId: 13,
            quantity: 15,
            unitPrice: 140,
            createdAt: new Date('2024-02-05T11:00:00').toISOString(),
        },
        {
            deliveryId: 4,
            productId: 15,
            quantity: 25,
            unitPrice: 110,
            createdAt: new Date('2024-02-05T11:00:00').toISOString(),
        },
        
        // Delivery 5 (DEL-2024-005) - pending, 2 items
        {
            deliveryId: 5,
            productId: 7,
            quantity: 2,
            unitPrice: 350,
            createdAt: new Date('2024-02-10T08:45:00').toISOString(),
        },
        {
            deliveryId: 5,
            productId: 5,
            quantity: 3,
            unitPrice: 250,
            createdAt: new Date('2024-02-10T08:45:00').toISOString(),
        },
        
        // Delivery 6 (DEL-2024-006) - pending, 3 items
        {
            deliveryId: 6,
            productId: 10,
            quantity: 5,
            unitPrice: 40,
            createdAt: new Date('2024-02-12T13:20:00').toISOString(),
        },
        {
            deliveryId: 6,
            productId: 11,
            quantity: 3,
            unitPrice: 70,
            createdAt: new Date('2024-02-12T13:20:00').toISOString(),
        },
        {
            deliveryId: 6,
            productId: 12,
            quantity: 15,
            unitPrice: 6,
            createdAt: new Date('2024-02-12T13:20:00').toISOString(),
        },
    ];

    await db.insert(deliveryItems).values(sampleDeliveryItems);
    
    console.log('✅ Delivery items seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});