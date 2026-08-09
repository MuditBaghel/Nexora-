-- Seed data for Mini ERP + CRM
-- Users are created by the seed script (backend/src/db/seed.ts) with bcrypt hashes.
-- Default password for all seeded users: Password123!

INSERT INTO customers (customer_name, mobile, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes) VALUES
('Rajesh Kumar', '9876543210', 'rajesh@retailmart.com', 'Retail Mart Pvt Ltd', '22AAAAA0000A1Z5', 'RETAIL', '123 MG Road, Mumbai', 'ACTIVE', '2026-08-15', 'Regular buyer, prefers bulk orders on weekends'),
('Priya Sharma', '9876543211', 'priya@wholesalehub.in', 'Wholesale Hub', '27BBBBB0000B1Z5', 'WHOLESALE', '456 Industrial Area, Pune', 'ACTIVE', NULL, 'Key wholesale account'),
('Amit Patel', '9876543212', 'amit@distrib.com', 'Patel Distributors', NULL, 'DISTRIBUTOR', '789 Ring Road, Ahmedabad', 'LEAD', '2026-08-10', 'New lead from trade show'),
('Sneha Reddy', '9876543213', 'sneha@shop.com', 'Reddy General Store', NULL, 'RETAIL', '321 Main Street, Hyderabad', 'INACTIVE', NULL, 'Account on hold');

INSERT INTO products (product_name, sku, category, unit_price, current_stock, minimum_stock, warehouse_location) VALUES
('Wireless Keyboard', 'KB-WL-001', 'Electronics', 1299.00, 50, 10, 'A-01-01'),
('USB Mouse', 'MS-USB-001', 'Electronics', 499.00, 100, 20, 'A-01-02'),
('A4 Paper Ream', 'PP-A4-500', 'Stationery', 250.00, 200, 50, 'B-02-01'),
('Ballpoint Pen Box', 'PN-BP-50', 'Stationery', 150.00, 5, 20, 'B-02-02'),
('HDMI Cable 2m', 'CB-HDMI-2M', 'Electronics', 399.00, 30, 15, 'A-01-03'),
('Office Chair', 'FR-CHR-001', 'Furniture', 4500.00, 8, 5, 'C-03-01');
