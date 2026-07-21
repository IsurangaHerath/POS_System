-- =============================================
-- POS System Seed Data
-- =============================================

USE pos_system;

-- =============================================
-- Seed Data: Users
-- Password for all users: "password123" (bcrypt hashed)
-- =============================================

INSERT INTO users (username, email, password_hash, full_name, role, phone, is_active) VALUES
('admin', 'admin@pos-system.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'System Administrator', 'admin', '+1-555-0100', TRUE),
('manager', 'manager@pos-system.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'John Smith', 'manager', '+1-555-0101', TRUE),
('cashier', 'cashier@pos-system.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'Mike Wilson', 'cashier', '+1-555-0201', TRUE);

-- =============================================
-- Seed Data: Categories
-- =============================================

INSERT INTO categories (name, description, parent_id, is_active) VALUES
('Electronics', 'Electronic devices and accessories', NULL, TRUE),
('Food & Beverages', 'Food items and drinks', NULL, TRUE),
('Household', 'Home and kitchen items', NULL, TRUE),
('Personal Care', 'Personal hygiene and beauty products', NULL, TRUE),
('Stationery', 'Office and school supplies', NULL, TRUE);

-- =============================================
-- Seed Data: Suppliers
-- =============================================

INSERT INTO suppliers (name, contact_person, phone, email, address, city, tax_id, payment_terms, is_active) VALUES
('TechSupply Co.', 'Robert Chen', '+1-555-1001', 'robert@techsupply.com', '100 Tech Boulevard', 'San Francisco', 'TAX-001234', 'Net 30', TRUE),
('Global Foods Inc.', 'Maria Garcia', '+1-555-1002', 'maria@globalfoods.com', '250 Food Court Drive', 'Los Angeles', 'TAX-002345', 'Net 15', TRUE),
('Home Essentials Ltd.', 'David Kim', '+1-555-1003', 'david@homeessentials.com', '75 Home Street', 'Chicago', 'TAX-003456', 'Net 30', TRUE);

-- =============================================
-- Seed Data: Products
-- =============================================

INSERT INTO products (name, barcode, sku, category_id, cost_price, selling_price, quantity_in_stock, reorder_level, unit, description, tax_rate, is_active) VALUES
-- Electronics
('iPhone 15 Pro 128GB', '8901234567890', 'IPH15P128', 1, 899.00, 1099.00, 25, 5, 'piece', 'Apple iPhone 15 Pro 128GB Storage', 10.00, TRUE),
('Samsung Galaxy S24 256GB', '8901234567891', 'SAMGS24256', 1, 749.00, 949.00, 30, 5, 'piece', 'Samsung Galaxy S24 256GB Storage', 10.00, TRUE),
('AirPods Pro 2nd Gen', '8901234567896', 'AIRPP2', 1, 199.00, 249.00, 50, 10, 'piece', 'Apple AirPods Pro 2nd Generation', 10.00, TRUE),
('USB-C Fast Charger 65W', '8901234567900', 'USBC65W', 1, 19.00, 39.00, 75, 15, 'piece', 'USB-C PD Fast Charger 65W', 10.00, TRUE),

-- Food & Beverages
('Potato Chips Classic 150g', '8901234567902', 'CHIPCL150', 2, 1.50, 3.00, 200, 50, 'piece', 'Classic Salted Potato Chips 150g', 0.00, TRUE),
('Chocolate Bar Milk 100g', '8901234567903', 'CHOCMLK100', 2, 1.00, 2.50, 150, 40, 'piece', 'Milk Chocolate Bar 100g', 0.00, TRUE),
('Mineral Water 500ml', '8901234567906', 'WATER500', 2, 0.30, 1.00, 300, 100, 'piece', 'Mineral Water Bottle 500ml', 0.00, TRUE),
('Cola Soft Drink 330ml', '8901234567907', 'COLA330', 2, 0.50, 1.50, 250, 75, 'piece', 'Cola Flavored Soft Drink 330ml Can', 0.00, TRUE),
('Orange Juice 1L', '8901234567908', 'OJUICE1L', 2, 1.50, 3.50, 100, 25, 'piece', 'Fresh Orange Juice 1 Liter', 0.00, TRUE),

-- Household
('Non-Stick Frying Pan 28cm', '8901234567915', 'PANNS28', 3, 12.00, 25.00, 35, 10, 'piece', 'Non-Stick Frying Pan 28cm', 10.00, TRUE),
('Dishwashing Liquid 500ml', '8901234567918', 'DISH500', 3, 1.50, 3.50, 100, 30, 'piece', 'Dishwashing Liquid 500ml', 0.00, TRUE),

-- Personal Care
('Face Moisturizer 50ml', '8901234567921', 'MOIST50', 4, 8.00, 18.00, 45, 15, 'piece', 'Daily Face Moisturizer 50ml', 10.00, TRUE),
('Shampoo 400ml', '8901234567924', 'SHMP400', 4, 4.00, 9.00, 70, 20, 'piece', 'Daily Shampoo 400ml', 10.00, TRUE),

-- Stationery
('Ballpoint Pens 12 Pack', '8901234567927', 'BPEN12', 5, 2.00, 5.00, 100, 30, 'piece', 'Ballpoint Pens Pack of 12', 0.00, TRUE),
('A4 Notebook 200 Pages', '8901234567930', 'NOTE200', 5, 2.00, 5.00, 120, 30, 'piece', 'A4 Spiral Notebook 200 Pages', 0.00, TRUE);

-- =============================================
-- Seed Data: Inventory
-- =============================================

INSERT INTO inventory (product_id, quantity_available, quantity_reserved, quantity_ordered, last_stock_check)
SELECT id, quantity_in_stock, 0, 0, CURRENT_TIMESTAMP FROM products;

-- =============================================
-- Seed Data: Settings
-- =============================================

INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('store_name', 'POS Demo Store', 'string', 'Store display name'),
('store_address', '123 Main Street, City', 'string', 'Store address'),
('store_phone', '+1-555-0000', 'string', 'Store phone number'),
('currency_code', 'USD', 'string', 'Default currency code'),
('currency_symbol', '$', 'string', 'Currency symbol'),
('tax_rate', '10', 'number', 'Default tax rate percentage'),
('receipt_footer', 'Thank you for shopping with us!', 'string', 'Receipt footer message');

-- =============================================
-- Seed Data Complete
-- =============================================
