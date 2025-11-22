import { db } from '@/db';
import { productStock } from '@/db/schema';

async function main() {
    const sampleProductStock = [
        // Product 1: Steel Sheets (250 kg total)
        {
            productId: 1,
            warehouseId: 1,
            quantity: 140,
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            productId: 1,
            warehouseId: 2,
            quantity: 70,
            updatedAt: new Date('2024-01-15').toISOString(),
        },
        {
            productId: 1,
            warehouseId: 3,
            quantity: 40,
            updatedAt: new Date('2024-01-15').toISOString(),
        },

        // Product 2: Aluminum Bars (30 kg total)
        {
            productId: 2,
            warehouseId: 1,
            quantity: 15,
            updatedAt: new Date('2024-01-16').toISOString(),
        },
        {
            productId: 2,
            warehouseId: 2,
            quantity: 10,
            updatedAt: new Date('2024-01-16').toISOString(),
        },
        {
            productId: 2,
            warehouseId: 3,
            quantity: 5,
            updatedAt: new Date('2024-01-16').toISOString(),
        },

        // Product 3: Copper Wire (150 kg total)
        {
            productId: 3,
            warehouseId: 1,
            quantity: 85,
            updatedAt: new Date('2024-01-17').toISOString(),
        },
        {
            productId: 3,
            warehouseId: 2,
            quantity: 40,
            updatedAt: new Date('2024-01-17').toISOString(),
        },
        {
            productId: 3,
            warehouseId: 3,
            quantity: 25,
            updatedAt: new Date('2024-01-17').toISOString(),
        },

        // Product 4: Industrial Pump (25 units total)
        {
            productId: 4,
            warehouseId: 1,
            quantity: 14,
            updatedAt: new Date('2024-01-18').toISOString(),
        },
        {
            productId: 4,
            warehouseId: 2,
            quantity: 7,
            updatedAt: new Date('2024-01-18').toISOString(),
        },
        {
            productId: 4,
            warehouseId: 3,
            quantity: 4,
            updatedAt: new Date('2024-01-18').toISOString(),
        },

        // Product 5: Valve Assembly (15 units total)
        {
            productId: 5,
            warehouseId: 1,
            quantity: 8,
            updatedAt: new Date('2024-01-19').toISOString(),
        },
        {
            productId: 5,
            warehouseId: 2,
            quantity: 4,
            updatedAt: new Date('2024-01-19').toISOString(),
        },
        {
            productId: 5,
            warehouseId: 3,
            quantity: 3,
            updatedAt: new Date('2024-01-19').toISOString(),
        },

        // Product 6: Pressure Gauge (45 units total)
        {
            productId: 6,
            warehouseId: 1,
            quantity: 25,
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            productId: 6,
            warehouseId: 2,
            quantity: 12,
            updatedAt: new Date('2024-01-20').toISOString(),
        },
        {
            productId: 6,
            warehouseId: 3,
            quantity: 8,
            updatedAt: new Date('2024-01-20').toISOString(),
        },

        // Product 7: Power Drill (12 units total)
        {
            productId: 7,
            warehouseId: 1,
            quantity: 7,
            updatedAt: new Date('2024-01-21').toISOString(),
        },
        {
            productId: 7,
            warehouseId: 2,
            quantity: 3,
            updatedAt: new Date('2024-01-21').toISOString(),
        },
        {
            productId: 7,
            warehouseId: 3,
            quantity: 2,
            updatedAt: new Date('2024-01-21').toISOString(),
        },

        // Product 8: Welding Machine (2 units total)
        {
            productId: 8,
            warehouseId: 1,
            quantity: 1,
            updatedAt: new Date('2024-01-22').toISOString(),
        },
        {
            productId: 8,
            warehouseId: 2,
            quantity: 1,
            updatedAt: new Date('2024-01-22').toISOString(),
        },
        {
            productId: 8,
            warehouseId: 3,
            quantity: 0,
            updatedAt: new Date('2024-01-22').toISOString(),
        },

        // Product 9: Safety Gloves (180 pairs total)
        {
            productId: 9,
            warehouseId: 1,
            quantity: 100,
            updatedAt: new Date('2024-01-23').toISOString(),
        },
        {
            productId: 9,
            warehouseId: 2,
            quantity: 50,
            updatedAt: new Date('2024-01-23').toISOString(),
        },
        {
            productId: 9,
            warehouseId: 3,
            quantity: 30,
            updatedAt: new Date('2024-01-23').toISOString(),
        },

        // Product 10: Copy Paper (75 boxes total)
        {
            productId: 10,
            warehouseId: 1,
            quantity: 42,
            updatedAt: new Date('2024-01-24').toISOString(),
        },
        {
            productId: 10,
            warehouseId: 2,
            quantity: 20,
            updatedAt: new Date('2024-01-24').toISOString(),
        },
        {
            productId: 10,
            warehouseId: 3,
            quantity: 13,
            updatedAt: new Date('2024-01-24').toISOString(),
        },

        // Product 11: Printer Ink (18 units total)
        {
            productId: 11,
            warehouseId: 1,
            quantity: 10,
            updatedAt: new Date('2024-01-25').toISOString(),
        },
        {
            productId: 11,
            warehouseId: 2,
            quantity: 5,
            updatedAt: new Date('2024-01-25').toISOString(),
        },
        {
            productId: 11,
            warehouseId: 3,
            quantity: 3,
            updatedAt: new Date('2024-01-25').toISOString(),
        },

        // Product 12: Notebooks (200 units total)
        {
            productId: 12,
            warehouseId: 1,
            quantity: 110,
            updatedAt: new Date('2024-01-26').toISOString(),
        },
        {
            productId: 12,
            warehouseId: 2,
            quantity: 55,
            updatedAt: new Date('2024-01-26').toISOString(),
        },
        {
            productId: 12,
            warehouseId: 3,
            quantity: 35,
            updatedAt: new Date('2024-01-26').toISOString(),
        },

        // Product 13: Circuit Boards (60 units total)
        {
            productId: 13,
            warehouseId: 1,
            quantity: 34,
            updatedAt: new Date('2024-01-27').toISOString(),
        },
        {
            productId: 13,
            warehouseId: 2,
            quantity: 16,
            updatedAt: new Date('2024-01-27').toISOString(),
        },
        {
            productId: 13,
            warehouseId: 3,
            quantity: 10,
            updatedAt: new Date('2024-01-27').toISOString(),
        },

        // Product 14: LED Displays (20 units total)
        {
            productId: 14,
            warehouseId: 1,
            quantity: 11,
            updatedAt: new Date('2024-01-28').toISOString(),
        },
        {
            productId: 14,
            warehouseId: 2,
            quantity: 6,
            updatedAt: new Date('2024-01-28').toISOString(),
        },
        {
            productId: 14,
            warehouseId: 3,
            quantity: 3,
            updatedAt: new Date('2024-01-28').toISOString(),
        },

        // Product 15: Sensors (90 units total)
        {
            productId: 15,
            warehouseId: 1,
            quantity: 50,
            updatedAt: new Date('2024-01-29').toISOString(),
        },
        {
            productId: 15,
            warehouseId: 2,
            quantity: 25,
            updatedAt: new Date('2024-01-29').toISOString(),
        },
        {
            productId: 15,
            warehouseId: 3,
            quantity: 15,
            updatedAt: new Date('2024-01-29').toISOString(),
        },
    ];

    await db.insert(productStock).values(sampleProductStock);
    
    console.log('✅ Product stock seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});