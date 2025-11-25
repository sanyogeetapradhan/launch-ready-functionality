import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { receipts, warehouses, receiptItems } from "@/db/schema";
import { eq, like, and, or, gte, lte, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const ALLOWED_STATUSES = ["draft", "waiting", "ready", "done", "cancelled"];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    // Single record fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          {
            error: "Valid ID is required",
            code: "INVALID_ID",
          },
          { status: 400 }
        );
      }

      const receipt = await db
        .select()
        .from(receipts)
        .where(eq(receipts.id, parseInt(id)))
        .limit(1);

      if (receipt.length === 0) {
        return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
      }

      // fetch associated items (optional)
      const items = await db
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, parseInt(id)));

      return NextResponse.json({ ...receipt[0], items }, { status: 200 });
    }

    // List with filters
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const warehouseId = searchParams.get("warehouse");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
          code: "INVALID_STATUS",
        },
        { status: 400 }
      );
    }

    // Validate warehouse ID if provided
    if (warehouseId && isNaN(parseInt(warehouseId))) {
      return NextResponse.json(
        {
          error: "Valid warehouse ID is required",
          code: "INVALID_WAREHOUSE_ID",
        },
        { status: 400 }
      );
    }

    // Build conditions array
    const conditions: any[] = [];

    // Status filter
    if (status) {
      conditions.push(eq(receipts.status, status));
    }

    // Warehouse filter
    if (warehouseId) {
      conditions.push(eq(receipts.warehouseId, parseInt(warehouseId)));
    }

    // Date range filters (assumes createdAt is stored as ISO string or Date)
    if (dateFrom) {
      // include from start of dateFrom
      const fromIso = new Date(dateFrom).toISOString();
      conditions.push(gte(receipts.createdAt, fromIso));
    }
    if (dateTo) {
      // include entire dateTo day by adding one day and using lt (or lte with end of day)
      const dateToEnd = new Date(dateTo);
      dateToEnd.setDate(dateToEnd.getDate() + 1);
      const toIso = dateToEnd.toISOString();
      conditions.push(lte(receipts.createdAt, toIso));
    }

    // Search filter
    if (search) {
      conditions.push(
        or(
          like(receipts.receiptNumber, `%${search}%`),
          like(receipts.supplierName, `%${search}%`)
        )
      );
    }

    // Build query
    let query = db.select().from(receipts);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(receipts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("GET error:", error);
    return NextResponse.json(
      {
        error: "Internal server error: " + (error?.message ?? String(error)),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();

    // Security check: reject if user ID fields provided in body
    if ("createdBy" in body && body.createdBy !== user.id) {
      return NextResponse.json(
        {
          error: "User ID cannot be provided in request body",
          code: "USER_ID_NOT_ALLOWED",
        },
        { status: 400 }
      );
    }

    const { receiptNumber, warehouseId, supplierName, status, notes, items } = body;

    // Validate required fields
    if (!receiptNumber || receiptNumber.trim() === "") {
      return NextResponse.json(
        {
          error: "Receipt number is required",
          code: "MISSING_RECEIPT_NUMBER",
        },
        { status: 400 }
      );
    }

    if (warehouseId === undefined || warehouseId === null || warehouseId === "") {
      return NextResponse.json(
        {
          error: "Warehouse ID is required",
          code: "MISSING_WAREHOUSE_ID",
        },
        { status: 400 }
      );
    }

    if (!supplierName || supplierName.trim() === "") {
      return NextResponse.json(
        {
          error: "Supplier name is required",
          code: "MISSING_SUPPLIER_NAME",
        },
        { status: 400 }
      );
    }

    // Validate warehouse ID is a valid integer
    if (isNaN(parseInt(String(warehouseId)))) {
      return NextResponse.json(
        {
          error: "Valid warehouse ID is required",
          code: "INVALID_WAREHOUSE_ID",
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}`,
          code: "INVALID_STATUS",
        },
        { status: 400 }
      );
    }

    // Check if receiptNumber already exists
    const existingReceipt = await db
      .select()
      .from(receipts)
      .where(eq(receipts.receiptNumber, receiptNumber.trim()))
      .limit(1);

    if (existingReceipt.length > 0) {
      return NextResponse.json(
        {
          error: "Receipt number already exists",
          code: "DUPLICATE_NUMBER",
        },
        { status: 409 }
      );
    }

    // Validate warehouse exists
    const warehouse = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, parseInt(String(warehouseId))))
      .limit(1);

    if (warehouse.length === 0) {
      return NextResponse.json(
        {
          error: "Warehouse not found",
          code: "WAREHOUSE_NOT_FOUND",
        },
        { status: 400 }
      );
    }

    // Insert receipt
    const now = new Date();
    const insertedReceipts = await db
      .insert(receipts)
      .values({
        receiptNumber: receiptNumber.trim(),
        warehouseId: parseInt(String(warehouseId)),
        supplierName: supplierName.trim(),
        status: status || "draft",
        notes: notes?.trim() || null,
        createdBy: user.id,
        createdAt: now.toISOString(),
        validatedAt: null,
      })
      .returning();

    const newReceipt = insertedReceipts[0];

    // Insert receipt items (if any)
    let insertedItems: any[] = [];
    if (Array.isArray(items) && items.length > 0) {
      // validate and prepare items
      const itemsToInsert = items
        .map((it: any) => {
          const productId = Number(it.productId);
          const quantity = Number(it.quantity);
          const unitPrice = Number(it.unitPrice ?? 0);

          if (!productId || isNaN(productId)) return null;
          if (!quantity || isNaN(quantity) || quantity <= 0) return null;

          return {
            receiptId: newReceipt.id,
            productId,
            productName: it.productName ?? null,
            quantity,
            unitPrice,
            createdAt: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (itemsToInsert.length > 0) {
        insertedItems = await db
          .insert(receiptItems)
          .values(itemsToInsert)
          .returning();
      }
    }

    return NextResponse.json({ ...newReceipt, items: insertedItems }, { status: 201 });
  } catch (error: any) {
    console.error("POST error:", error);
    return NextResponse.json(
      {
        error: "Internal server error: " + (error?.message ?? String(error)),
      },
      { status: 500 }
    );
  }
}