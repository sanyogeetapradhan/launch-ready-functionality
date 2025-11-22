import { db } from '@/db';
import { categories } from '@/db/schema';

async function main() {
    const sampleCategories = [
        {
            name: 'Raw Materials',
            description: 'Basic materials used in production',
            createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            name: 'Finished Goods',
            description: 'Completed products ready for sale',
            createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            name: 'Tools & Equipment',
            description: 'Hardware and machinery',
            createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            name: 'Office Supplies',
            description: 'Stationery and office items',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            name: 'Electronics',
            description: 'Electronic components and devices',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        }
    ];

    await db.insert(categories).values(sampleCategories);
    
    console.log('✅ Categories seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});