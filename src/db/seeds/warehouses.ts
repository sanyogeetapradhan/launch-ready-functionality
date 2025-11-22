import { db } from '@/db';
import { warehouses } from '@/db/schema';

async function main() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const sampleWarehouses = [
        {
            name: 'Main Warehouse',
            location: 'New York',
            isActive: true,
            createdAt: sixMonthsAgo.toISOString(),
        },
        {
            name: 'Production Floor',
            location: 'Factory A',
            isActive: true,
            createdAt: sixMonthsAgo.toISOString(),
        },
        {
            name: 'Retail Store',
            location: 'Downtown',
            isActive: true,
            createdAt: sixMonthsAgo.toISOString(),
        }
    ];

    await db.insert(warehouses).values(sampleWarehouses);
    
    console.log('✅ Warehouses seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});