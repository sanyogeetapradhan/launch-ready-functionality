import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';



// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});

// Warehouses table
export const warehouses = sqliteTable('warehouses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  location: text('location'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
});

// Categories table
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

// Products table
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  categoryId: integer('category_id').references(() => categories.id),
  unitOfMeasure: text('unit_of_measure').notNull(),
  reorderLevel: integer('reorder_level').default(0),
  currentStock: integer('current_stock').default(0),
  costPrice: integer('cost_price', { mode: 'number' }).default(0),
  sellingPrice: integer('selling_price', { mode: 'number' }).default(0),
  description: text('description'),
  image: text('image'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Product stock per warehouse
export const productStock = sqliteTable('product_stock', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  quantity: integer('quantity').default(0),
  updatedAt: text('updated_at').notNull(),
});

// Receipts (incoming stock)
export const receipts = sqliteTable('receipts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  receiptNumber: text('receipt_number').notNull().unique(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  supplierName: text('supplier_name').notNull(),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => user.id),
  createdAt: text('created_at').notNull(),
  validatedAt: text('validated_at'),
});

// Receipt items
export const receiptItems = sqliteTable('receipt_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  receiptId: integer('receipt_id').references(() => receipts.id),
  productId: integer('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price', { mode: 'number' }).default(0),
  createdAt: text('created_at').notNull(),
});

// Deliveries (outgoing stock)
export const deliveries = sqliteTable('deliveries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deliveryNumber: text('delivery_number').notNull().unique(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  customerName: text('customer_name').notNull(),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => user.id),
  createdAt: text('created_at').notNull(),
  validatedAt: text('validated_at'),
});

// Delivery items
export const deliveryItems = sqliteTable('delivery_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deliveryId: integer('delivery_id').references(() => deliveries.id),
  productId: integer('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price', { mode: 'number' }).default(0),
  createdAt: text('created_at').notNull(),
});

// Transfers (internal movements)
export const transfers = sqliteTable('transfers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transferNumber: text('transfer_number').notNull().unique(),
  fromWarehouseId: integer('from_warehouse_id').references(() => warehouses.id),
  toWarehouseId: integer('to_warehouse_id').references(() => warehouses.id),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  createdBy: text('created_by').references(() => user.id),
  createdAt: text('created_at').notNull(),
  validatedAt: text('validated_at'),
});

// Transfer items
export const transferItems = sqliteTable('transfer_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  transferId: integer('transfer_id').references(() => transfers.id),
  productId: integer('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  createdAt: text('created_at').notNull(),
});

// Adjustments (stock corrections)
export const adjustments = sqliteTable('adjustments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adjustmentNumber: text('adjustment_number').notNull().unique(),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  productId: integer('product_id').references(() => products.id),
  countedQuantity: integer('counted_quantity').notNull(),
  systemQuantity: integer('system_quantity').notNull(),
  difference: integer('difference').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('draft'),
  createdBy: text('created_by').references(() => user.id),
  createdAt: text('created_at').notNull(),
  validatedAt: text('validated_at'),
});

// Stock ledger (audit trail)
export const stockLedger = sqliteTable('stock_ledger', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id),
  warehouseId: integer('warehouse_id').references(() => warehouses.id),
  operationType: text('operation_type').notNull(),
  referenceNumber: text('reference_number').notNull(),
  quantityChange: integer('quantity_change').notNull(),
  quantityAfter: integer('quantity_after').notNull(),
  createdBy: text('created_by').references(() => user.id),
  createdAt: text('created_at').notNull(),
  notes: text('notes'),
});