-- =============================================
-- POS System Seed Data
-- Sri Lankan Commercial POS System
-- =============================================

USE pos_system;

-- =============================================
-- Seed Data: Users
-- Password for all users: "password123" (bcrypt hashed)
-- =============================================

INSERT INTO users (username, email, password_hash, full_name, role, phone, is_active) VALUES
('admin', 'admin@pos-system.lk', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'System Administrator', 'admin', '+94 77 000 0000', TRUE),
('manager', 'manager@pos-system.lk', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'John Silva', 'manager', '+94 77 111 1111', TRUE),
('accountant', 'accountant@pos-system.lk', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'Niranjana Perera', 'accountant', '+94 77 222 2222', TRUE),
('inventory_manager', 'inventory@pos-system.lk', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'Ajith Karunarathna', 'inventory_manager', '+94 77 333 3333', TRUE),
('cashier', 'cashier@pos-system.lk', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'Mike Wijesinghe', 'cashier', '+94 77 444 4444', TRUE),
('owner', 'owner@pos-system.lk', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe', 'Chaminda Silva', 'owner', '+94 77 555 5555', TRUE);

-- =============================================
-- Seed Data: Brands
-- =============================================

INSERT INTO brands (name, description, is_active) VALUES
('Apple', 'Apple Inc. products', TRUE),
('Samsung', 'Samsung Electronics', TRUE),
('Xiaomi', 'Xiaomi Technology', TRUE),
('Generic', 'Generic brands', TRUE);

-- =============================================
-- Seed Data: Units
-- =============================================

INSERT INTO units (name, abbreviation, is_active) VALUES
('piece', 'pcs', TRUE),
('kilogram', 'kg', TRUE),
('gram', 'g', TRUE),
('liter', 'L', TRUE),
('milliliter', 'mL', TRUE),
('meter', 'm', TRUE),
('centimeter', 'cm', TRUE),
('pack', 'pack', TRUE),
('box', 'box', TRUE);

-- =============================================
-- Seed Data: Categories
-- =============================================

INSERT INTO categories (name, description, parent_id, is_active) VALUES
('Electronics', 'Electronic devices and accessories', NULL, TRUE),
('Food & Beverages', 'Food items and drinks', NULL, TRUE),
('Household', 'Home and kitchen items', NULL, TRUE),
('Personal Care', 'Personal hygiene and beauty products', NULL, TRUE),
('Stationery', 'Office and school supplies', NULL, TRUE),
('Clothing', 'Apparel and fashion items', NULL, TRUE),
('Health', 'Health and medicine', NULL, TRUE);

-- =============================================
-- Seed Data: Suppliers
-- =============================================

INSERT INTO suppliers (name, contact_person, phone, email, address, city, tax_id, payment_terms, is_active) VALUES
('TechSupply (Pvt) Ltd', 'Robert Chen', '+94 11 234 5678', 'robert@techsupply.lk', '100, Galle Road, Colombo 03', 'Colombo', 'TAX-001234', 'Net 30', TRUE),
('Global Foods (Pvt) Ltd', 'Maria Garcia', '+94 11 345 6789', 'maria@globalfoods.lk', '250, Kandy Road, Negombo', 'Negombo', 'TAX-002345', 'Net 15', TRUE),
('Home Essentials (Pvt) Ltd', 'David Kim', '+94 11 456 7890', 'david@homeessentials.lk', '75, Main Street, Battaramulla', 'Battaramulla', 'TAX-003456', 'Net 30', TRUE),
('Local Distributors', 'Sam Perera', '+94 76 123 4567', 'sam@localdist.lk', '50, Market Street, Galle', 'Galle', 'TAX-004567', 'Cash', TRUE);

-- =============================================
-- Seed Data: Expense Categories
-- =============================================

INSERT INTO expense_categories (name, description, is_active) VALUES
('Rent', 'Office/warehouse rent', TRUE),
('Utilities', 'Electricity, water, internet', TRUE),
('Staff Salaries', 'Employee salaries and wages', TRUE),
('Transport', 'Delivery and transportation costs', TRUE),
('Marketing', 'Advertising and promotions', TRUE),
('Office Supplies', 'Stationery and office materials', TRUE),
('Maintenance', 'Equipment and facility maintenance', TRUE),
('Other', 'Miscellaneous expenses', TRUE);

-- =============================================
-- Seed Data: Customers (with credit facilities)
-- =============================================

INSERT INTO customers (code, name, phone, email, address, city, nic, credit_limit, balance, discount, is_active) VALUES
('CUS0001', 'ABC Traders', '+94 71 123 4567', 'abc@traders.lk', '123, Main Street, Colombo 01', 'Colombo', '123456789V', 50000.00, 15500.00, 5.00, TRUE),
('CUS0002', 'XYZ Electronics', '+94 71 234 5678', 'xyz@electronics.lk', '45, Galle Road, Colombo 02', 'Colombo', '987654321V', 100000.00, 25500.00, 3.00, TRUE),
('CUS0003', 'Sri Lanka Textiles', '+94 72 123 4567', 'textiles@lk.com', '10, Factory Road, Kandy', 'Kandy', '111111111V', 75000.00, 0.00, 0.00, TRUE),
('CUS0004', 'Rajapaksa Group', '+94 72 234 5678', 'rajapaksa@group.lk', '200, Lawalla, Colombo 10', 'Colombo', '222222222V', 200000.00, 125000.00, 2.00, TRUE);

-- =============================================
-- Seed Data: Products
-- =============================================

INSERT INTO products (name, barcode, sku, category_id, brand_id, unit_id, cost_price, selling_price, wholesale_price, quantity_in_stock, reorder_level, min_stock, unit, description, tax_rate, is_active) VALUES
-- Electronics
('iPhone 15 Pro 128GB', '8901234567890', 'IPH15P128', 1, 1, 1, 120000.00, 155000.00, 135000.00, 25, 5, 0, 'piece', 'Apple iPhone 15 Pro 128GB Storage', 10.00, TRUE),
('Samsung Galaxy S24 256GB', '8901234567891', 'SAMGS24256', 1, 2, 1, 105000.00, 135000.00, 120000.00, 30, 5, 0, 'piece', 'Samsung Galaxy S24 256GB Storage', 10.00, TRUE),
('AirPods Pro 2nd Gen', '8901234567896', 'AIRPP2', 1, 1, 1, 28000.00, 35000.00, 30000.00, 50, 10, 0, 'piece', 'Apple AirPods Pro 2nd Generation', 10.00, TRUE),
('USB-C Fast Charger 65W', '8901234567900', 'USBC65W', 1, 4, 1, 2700.00, 5500.00, 4000.00, 75, 15, 0, 'piece', 'USB-C PD Fast Charger 65W', 10.00, TRUE),

-- Food & Beverages
('Potato Chips Classic 150g', '8901234567902', 'CHIPCL150', 2, 4, 1, 210.00, 450.00, 350.00, 200, 50, 0, 'piece', 'Classic Salted Potato Chips 150g', 0.00, TRUE),
('Chocolate Bar Milk 100g', '8901234567903', 'CHOCMLK100', 2, 4, 1, 140.00, 350.00, 280.00, 150, 40, 0, 'piece', 'Milk Chocolate Bar 100g', 0.00, TRUE),
('Mineral Water 500ml', '8901234567906', 'WATER500', 2, 4, 1, 45.00, 150.00, 100.00, 300, 100, 0, 'piece', 'Mineral Water Bottle 500ml', 0.00, TRUE),
('Cola Soft Drink 330ml', '8901234567907', 'COLA330', 2, 4, 1, 70.00, 220.00, 150.00, 250, 75, 0, 'piece', 'Cola Flavored Soft Drink 330ml Can', 0.00, TRUE),
('Orange Juice 1L', '8901234567908', 'OJUICE1L', 2, 4, 1, 210.00, 500.00, 350.00, 100, 25, 0, 'piece', 'Fresh Orange Juice 1 Liter', 0.00, TRUE),

-- Household
('Non-Stick Frying Pan 28cm', '8901234567915', 'PANNS28', 3, 4, 1, 170.00, 350.00, 250.00, 35, 10, 0, 'piece', 'Non-Stick Frying Pan 28cm', 10.00, TRUE),
('Dishwashing Liquid 500ml', '8901234567918', 'DISH500', 3, 4, 1, 210.00, 500.00, 350.00, 100, 30, 0, 'piece', 'Dishwashing Liquid 500ml', 0.00, TRUE),

-- Personal Care
('Face Moisturizer 50ml', '8901234567921', 'MOIST50', 4, 4, 1, 1200.00, 2600.00, 2000.00, 45, 15, 0, 'piece', 'Daily Face Moisturizer 50ml', 10.00, TRUE),
('Shampoo 400ml', '8901234567924', 'SHMP400', 4, 4, 1, 600.00, 1350.00, 900.00, 70, 20, 0, 'piece', 'Daily Shampoo 400ml', 10.00, TRUE),

-- Stationery
('Ballpoint Pens 12 Pack', '8901234567927', 'BPEN12', 5, 4, 1, 300.00, 750.00, 500.00, 100, 30, 0, 'piece', 'Ballpoint Pens Pack of 12', 0.00, TRUE),
('A4 Notebook 200 Pages', '8901234567930', 'NOTE200', 5, 4, 1, 300.00, 750.00, 500.00, 120, 30, 0, 'piece', 'A4 Spiral Notebook 200 Pages', 0.00, TRUE);

-- =============================================
-- Seed Data: Inventory
-- =============================================

INSERT INTO inventory (product_id, quantity_available, quantity_reserved, quantity_ordered, last_stock_check)
SELECT id, quantity_in_stock, 0, 0, CURRENT_TIMESTAMP FROM products;

-- =============================================
-- Seed Data: Settings (LKR Currency)
-- =============================================

INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
('store_name', 'POS Lanka Solutions', 'string', 'Store display name'),
('store_address', '123, Galle Road, Colombo 03, Sri Lanka', 'string', 'Store address'),
('store_phone', '+94 11 234 5678', 'string', 'Store phone number'),
('currency_code', 'LKR', 'string', 'Default currency code'),
('currency_symbol', 'Rs', 'string', 'Currency symbol'),
('currency_exchange_rate', '1', 'number', 'Exchange rate to base currency (USD)'),
('tax_rate', '10', 'number', 'Default tax rate percentage'),
('receipt_footer', 'Thank you for your purchase! ස්තුතියි! Thank you! வாழ்த்துகள்!', 'string', 'Receipt footer message in multiple languages'),
('language_default', 'en', 'string', 'Default application language'),
('language_supported', '["en","si","ta"]', 'json', 'Supported languages: English, Sinhala, Tamil'),
('phone_format', 'LK', 'string', 'Default phone number format for Sri Lanka'),
('rounding_enabled', 'true', 'boolean', 'Enable rounding of totals'),
('receipt_logo', '/logo.png', 'string', 'Receipt logo path');

-- =============================================
-- Seed Data: Expense Entries Example
-- =============================================

INSERT INTO expenses (category_id, amount, expense_date, description, payment_method, user_id) VALUES
(1, 150000.00, '2024-01-01', 'January Rent', 'cash', 2),
(4, 25000.00, '2024-01-05', 'Transport - Delivery van fuel', 'cash', 2);

-- =============================================
-- Seed Data Complete
-- =============================================