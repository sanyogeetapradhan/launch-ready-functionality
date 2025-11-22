import { db } from '@/db';
import { receipts } from '@/db/schema';

async function main() {
    const sampleReceipts = [
        {
            receiptNumber: 'REC-2024-001',
            warehouseId: 1,
            supplierName: 'Steel Supplies Inc',
            status: 'done',
            notes: 'Bulk steel order for Q1 production. All items inspected and verified for quality standards.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            receiptNumber: 'REC-2024-002',
            warehouseId: 2,
            supplierName: 'Industrial Parts Co',
            status: 'done',
            notes: 'Standard monthly parts delivery. Invoice #INV-2024-0234 attached.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            receiptNumber: 'REC-2024-003',
            warehouseId: 1,
            supplierName: 'Electronics Wholesale',
            status: 'done',
            notes: 'Electronic components for new product line. Temperature-sensitive items stored in climate-controlled area.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            receiptNumber: 'REC-2024-004',
            warehouseId: 3,
            supplierName: 'Office Depot',
            status: 'done',
            notes: 'Office supplies and packaging materials. Partial delivery - remaining items expected next week.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            receiptNumber: 'REC-2024-005',
            warehouseId: 2,
            supplierName: 'Tool Mart',
            status: 'done',
            notes: 'Heavy machinery tools and equipment. Forklift required for unloading.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            receiptNumber: 'REC-2024-006',
            warehouseId: 1,
            supplierName: 'Metal Works',
            status: 'draft',
            notes: 'Awaiting final approval from purchasing department. Estimated delivery date: next Monday.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: null,
        },
        {
            receiptNumber: 'REC-2024-007',
            warehouseId: 2,
            supplierName: 'Parts Direct',
            status: 'waiting',
            notes: 'Order confirmed by supplier. Truck scheduled to arrive tomorrow morning at 9 AM.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: null,
        },
        {
            receiptNumber: 'REC-2024-008',
            warehouseId: 3,
            supplierName: 'Tech Components',
            status: 'ready',
            notes: 'Shipment arrived and ready for inspection. Quality team scheduled for tomorrow afternoon.',
            createdBy: 'user_placeholder_123',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            validatedAt: null,
        }
    ];

    await db.insert(receipts).values(sampleReceipts);
    
    console.log('✅ Receipts seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});