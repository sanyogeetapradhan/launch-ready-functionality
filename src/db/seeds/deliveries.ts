import { db } from '@/db';
import { deliveries } from '@/db/schema';

async function main() {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);

    const sampleDeliveries = [
        {
            deliveryNumber: 'DEL-2024-001',
            warehouseId: 1,
            customerName: 'ABC Manufacturing',
            status: 'done',
            notes: 'Standard delivery completed on time. All items delivered in good condition.',
            createdBy: 'user_placeholder_123',
            createdAt: threeMonthsAgo.toISOString(),
            validatedAt: threeMonthsAgo.toISOString(),
        },
        {
            deliveryNumber: 'DEL-2024-002',
            warehouseId: 2,
            customerName: 'XYZ Industries',
            status: 'done',
            notes: 'Bulk order delivery. Customer requested early morning delivery, completed successfully.',
            createdBy: 'user_placeholder_123',
            createdAt: twoMonthsAgo.toISOString(),
            validatedAt: twoMonthsAgo.toISOString(),
        },
        {
            deliveryNumber: 'DEL-2024-003',
            warehouseId: 3,
            customerName: 'Local Retail Store',
            status: 'done',
            notes: 'Regular weekly delivery. Signed by store manager.',
            createdBy: 'user_placeholder_123',
            createdAt: oneMonthAgo.toISOString(),
            validatedAt: oneMonthAgo.toISOString(),
        },
        {
            deliveryNumber: 'DEL-2024-004',
            warehouseId: 1,
            customerName: 'Tech Solutions Inc',
            status: 'done',
            notes: 'Priority delivery for urgent project. All electronic components delivered safely with anti-static packaging.',
            createdBy: 'user_placeholder_123',
            createdAt: twoWeeksAgo.toISOString(),
            validatedAt: twoWeeksAgo.toISOString(),
        },
        {
            deliveryNumber: 'DEL-2024-005',
            warehouseId: 2,
            customerName: 'Build Corp',
            status: 'draft',
            notes: 'Large construction materials order. Awaiting final confirmation from customer before processing.',
            createdBy: 'user_placeholder_123',
            createdAt: twoDaysAgo.toISOString(),
            validatedAt: null,
        },
        {
            deliveryNumber: 'DEL-2024-006',
            warehouseId: 1,
            customerName: 'Office Central',
            status: 'waiting',
            notes: 'Office supplies order ready for pickup. Customer will collect tomorrow morning.',
            createdBy: 'user_placeholder_123',
            createdAt: oneDayAgo.toISOString(),
            validatedAt: null,
        },
    ];

    await db.insert(deliveries).values(sampleDeliveries);
    
    console.log('✅ Deliveries seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});