-- promoteIt Ventures development seed
-- Run after: npx prisma migrate dev
-- Example: psql "$DATABASE_URL" -f prisma/seed.sql
-- This is destructive for the application tables and is intended for development only.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

TRUNCATE TABLE
  "AuditLog",
  "InventoryMovement",
  "Payment",
  "SaleItem",
  "ReturnItem",
  "Return",
  "Sale",
  "PurchaseItem",
  "Purchase",
  "Expense",
  "ProductVariant",
  "Product",
  "Customer",
  "Supplier",
  "Brand",
  "Category",
  "RolePermission",
  "Permission",
  "User",
  "Role",
  "Location"
RESTART IDENTITY CASCADE;

CREATE TEMP TABLE seed_ids (
  name text PRIMARY KEY,
  id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO "Role" (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'OWNER'),
  ('00000000-0000-0000-0000-000000000002', 'MANAGER'),
  ('00000000-0000-0000-0000-000000000003', 'CASHIER'),
  ('00000000-0000-0000-0000-000000000004', 'INVENTORY_OFFICER');

INSERT INTO "Permission" (id, key) VALUES
  ('10000000-0000-0000-0000-000000000001', 'products.view'),
  ('10000000-0000-0000-0000-000000000002', 'products.create'),
  ('10000000-0000-0000-0000-000000000003', 'products.update'),
  ('10000000-0000-0000-0000-000000000004', 'products.deactivate'),
  ('10000000-0000-0000-0000-000000000005', 'inventory.view'),
  ('10000000-0000-0000-0000-000000000006', 'inventory.adjust'),
  ('10000000-0000-0000-0000-000000000007', 'inventory.receive'),
  ('10000000-0000-0000-0000-000000000008', 'sales.create'),
  ('10000000-0000-0000-0000-000000000009', 'sales.view'),
  ('10000000-0000-0000-0000-000000000010', 'sales.return'),
  ('10000000-0000-0000-0000-000000000011', 'purchases.create'),
  ('10000000-0000-0000-0000-000000000012', 'purchases.view'),
  ('10000000-0000-0000-0000-000000000013', 'purchases.receive'),
  ('10000000-0000-0000-0000-000000000014', 'reports.view'),
  ('10000000-0000-0000-0000-000000000015', 'users.manage'),
  ('10000000-0000-0000-0000-000000000016', 'settings.manage'),
  ('10000000-0000-0000-0000-000000000017', 'audit_logs.view');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT '00000000-0000-0000-0000-000000000001', id FROM "Permission";

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT '00000000-0000-0000-0000-000000000002', id FROM "Permission"
WHERE key NOT IN ('users.manage', 'settings.manage');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT '00000000-0000-0000-0000-000000000003', id FROM "Permission"
WHERE key IN ('products.view', 'inventory.view', 'sales.create', 'sales.view');

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT '00000000-0000-0000-0000-000000000004', id FROM "Permission"
WHERE key IN ('products.view', 'products.create', 'products.update', 'inventory.view', 'inventory.adjust', 'inventory.receive', 'purchases.view', 'purchases.receive');

INSERT INTO "Location" (id, name, address, "createdAt", "updatedAt") VALUES
  ('20000000-0000-0000-0000-000000000001', 'Adenta-Accountancy, Accra', 'Adenta-Accountancy, Accra', NOW(), NOW());

INSERT INTO "User" (id, name, email, "passwordHash", status, "roleId", "createdAt", "updatedAt") VALUES
  ('30000000-0000-0000-0000-000000000001', 'Kofi Owusu', 'kofi@promoteit.ventures', crypt('password123', gen_salt('bf', 8)), 'ACTIVE', '00000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002', 'Ama Mensah', 'ama@promoteit.ventures', crypt('password123', gen_salt('bf', 8)), 'ACTIVE', '00000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000003', 'Yaw Boateng', 'yaw@promoteit.ventures', crypt('password123', gen_salt('bf', 8)), 'ACTIVE', '00000000-0000-0000-0000-000000000003', NOW(), NOW());

INSERT INTO "Category" (id, name, "createdAt", "updatedAt") VALUES
  ('40000000-0000-0000-0000-000000000001', 'Books & Stationery', NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000002', 'Cosmetics & Beauty', NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000003', 'Phone Accessories & Gadgets', NOW(), NOW());

INSERT INTO "Brand" (id, name, "createdAt", "updatedAt") VALUES
  ('50000000-0000-0000-0000-000000000001', 'Evergreen Stationery', NOW(), NOW()),
  ('50000000-0000-0000-0000-000000000002', 'Glow Essentials', NOW(), NOW()),
  ('50000000-0000-0000-0000-000000000003', 'Tecno Accessories', NOW(), NOW());

INSERT INTO "Supplier" (id, name, "contactPerson", phone, email, address, active, "createdAt", "updatedAt") VALUES
  ('60000000-0000-0000-0000-000000000001', 'ABC Distributors', 'Kwame Asante', '+233 24 510 2281', 'orders@abcdistributors.gh', 'Accra, Greater Accra', TRUE, NOW(), NOW()),
  ('60000000-0000-0000-0000-000000000002', 'Glow Essentials GH', 'Esi Boateng', '+233 20 884 1024', 'hello@glowessentials.gh', 'Kumasi, Ashanti', TRUE, NOW(), NOW()),
  ('60000000-0000-0000-0000-000000000003', 'Techline Wholesale', 'Daniel Ofori', '+233 55 221 9004', 'sales@techline.gh', 'Accra, Greater Accra', TRUE, NOW(), NOW());

INSERT INTO "Product" (id, name, description, active, "categoryId", "brandId", "createdAt", "updatedAt") VALUES
  ('70000000-0000-0000-0000-000000000001', 'USB-C Cable', 'Durable fast-charge USB-C cable.', TRUE, '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', NOW(), NOW()),
  ('70000000-0000-0000-0000-000000000002', 'A5 Premium Notebook', 'Hardcover ruled notebook.', TRUE, '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('70000000-0000-0000-0000-000000000003', 'Hydrating Face Serum', 'Daily hydrating facial serum.', TRUE, '40000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('70000000-0000-0000-0000-000000000004', 'Wireless Earbuds Pro', 'Bluetooth wireless earbuds.', TRUE, '40000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', NOW(), NOW()),
  ('70000000-0000-0000-0000-000000000005', 'Executive Ballpoint Pen', 'Smooth black ink ballpoint pen.', TRUE, '40000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', NOW(), NOW());

INSERT INTO "ProductVariant" (id, "productId", name, sku, barcode, unit, "costPrice", "sellingPrice", stock, "reorderLevel", "locationId", "createdAt", "updatedAt") VALUES
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'USB-C Cable', 'GAD-2048', '6151234002048', 'piece', 40.00, 65.00, 140, 20, '20000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 'A5 Premium Notebook', 'STA-1021', '6151234001021', 'piece', 28.00, 48.00, 142, 25, '20000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'Hydrating Face Serum', 'BEA-3033', '6151234003033', 'piece', 76.00, 125.00, 18, 10, '20000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('80000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000004', 'Wireless Earbuds Pro', 'GAD-1990', '6151234001990', 'piece', 210.00, 320.00, 36, 8, '20000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('80000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000005', 'Executive Ballpoint Pen', 'STA-0912', '6151234000912', 'piece', 12.00, 22.00, 0, 15, '20000000-0000-0000-0000-000000000001', NOW(), NOW());

INSERT INTO "Purchase" (id, "purchaseNumber", "supplierId", "locationId", "createdById", status, total, "receivedAt", "createdAt", "updatedAt") VALUES
  ('90000000-0000-0000-0000-000000000001', 'PUR-000031', '60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'RECEIVED', 2100.00, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW());

INSERT INTO "PurchaseItem" (id, "purchaseId", "productVariantId", quantity, "unitCost", total) VALUES
  ('91000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 50, 42.00, 2100.00);

INSERT INTO "InventoryMovement" (id, "productVariantId", "locationId", "userId", type, quantity, "unitCost", reference, reason, "createdAt") VALUES
  ('a0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'OPENING_BALANCE', 100, 40.00, 'OPENING-2026', 'Development opening balance', NOW() - INTERVAL '3 days'),
  ('a0000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PURCHASE', 50, 42.00, 'PUR-000031', 'Received stock', NOW() - INTERVAL '1 day'),
  ('a0000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SALE', -10, 42.00, 'SAL-000923', 'Development sale', NOW());

INSERT INTO "Customer" (id, name, phone, email, "createdAt", "updatedAt") VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Ama Owusu', '+233 24 555 0192', 'ama@example.com', NOW(), NOW());

INSERT INTO "Sale" (id, "saleNumber", "locationId", "cashierId", "customerId", status, subtotal, discount, total, "createdAt", "updatedAt") VALUES
  ('c0000000-0000-0000-0000-000000000001', 'SAL-000923', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'COMPLETED', 650.00, 0.00, 650.00, NOW(), NOW());

INSERT INTO "SaleItem" (id, "saleId", "productVariantId", quantity, "unitPrice", "unitCost", discount, total) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 10, 65.00, 42.00, 0.00, 650.00);

INSERT INTO "Payment" (id, "saleId", method, amount, reference, status, "paidAt") VALUES
  ('c2000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'MOBILE_MONEY', 650.00, 'MOMO-DEV-923', 'PAID', NOW());

INSERT INTO "AuditLog" (id, "userId", action, "entityType", "entityId", "newValues", "createdAt") VALUES
  ('d0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'SEED_COMPLETED', 'System', '20000000-0000-0000-0000-000000000001', '{"products": 5, "suppliers": 3, "purchase": "PUR-000031", "sale": "SAL-000923"}', NOW());

COMMIT;

SELECT 'Seed complete' AS status, (SELECT COUNT(*) FROM "Product") AS products, (SELECT COUNT(*) FROM "Supplier") AS suppliers, (SELECT COUNT(*) FROM "Sale") AS sales;
