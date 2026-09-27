/**
 * POS System Upgrade Migration (v2)
 *
 * Non-destructive, idempotent migration that adds the Sri Lankan commercial
 * POS feature set on top of the existing MySQL schema WITHOUT dropping or
 * losing existing data:
 *   - customers (credit / udharata workflows)
 *   - payments (sale / credit / supplier / expense cash tracking)
 *   - returns + return_items (full / partial)
 *   - expenses + expense_categories
 *   - cash_registers + cash_register_entries (open/close shift)
 *   - held_bills (hold / resume bills)
 *   - brands + units (+ product columns)
 *   - supplier balance + payments support
 *   - expanded user roles (owner, inventory_manager, accountant)
 *   - expanded sales columns (customer_id, invoice discount, credit balance)
 *
 * Run from the backend directory:
 *   node src/migrations/upgrade.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function ensureColumn(conn, table, column, ddl) {
    const [rows] = await conn.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
    );
    if (rows[0].c === 0) {
        await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
        console.log(`+ column ${table}.${column}`);
    } else {
        console.log(`= column ${table}.${column} (exists)`);
    }
}

async function ensureTable(conn, createSql, name) {
    await conn.query(createSql);
    const [rows] = await conn.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [name]
    );
    console.log(`${rows[0].c > 0 ? '=' : '!'} table ${name}`);
}

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pos_system',
        multipleStatements: true
    });

    console.log('Connected. Starting v2 upgrade migration...\n');
// ============ CUSTOMERS ============
    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(20) NULL UNIQUE,
            name VARCHAR(200) NOT NULL,
            phone VARCHAR(20) NULL,
            email VARCHAR(100) NULL,
            address TEXT NULL,
            city VARCHAR(100) NULL,
            date_of_birth DATE NULL,
            nic VARCHAR(20) NULL,
            credit_limit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            discount DECIMAL(5,2) NOT NULL DEFAULT 0.00,
            notes TEXT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_customers_phone (phone),
            INDEX idx_customers_name (name),
            INDEX idx_customers_balance (balance),
            INDEX idx_customers_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'customers');

    // ============ PAYMENTS ============
    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            payment_type ENUM('sale','credit','supplier','expense') NOT NULL,
            sale_id INT NULL,
            customer_id INT NULL,
            supplier_id INT NULL,
            amount DECIMAL(12,2) NOT NULL,
            method ENUM('cash','card','bank_transfer','qr','credit') NOT NULL,
            reference VARCHAR(100) NULL,
            user_id INT NULL,
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_payments_type (payment_type),
            INDEX idx_payments_sale (sale_id),
            INDEX idx_payments_customer (customer_id),
            INDEX idx_payments_supplier (supplier_id),
            INDEX idx_payments_method (method),
            INDEX idx_payments_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'payments');

    // ============ RETURNS ============
    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS returns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            return_number VARCHAR(50) NOT NULL UNIQUE,
            sale_id INT NOT NULL,
            user_id INT NOT NULL,
            return_type ENUM('full','partial') NOT NULL DEFAULT 'partial',
            subtotal DECIMAL(12,2) NOT NULL,
            tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            refund_amount DECIMAL(12,2) NOT NULL,
            refund_method ENUM('cash','card','bank_transfer','qr','store_credit') NOT NULL DEFAULT 'cash',
            customer_id INT NULL,
            status ENUM('completed','voided') NOT NULL DEFAULT 'completed',
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_returns_sale (sale_id),
            INDEX idx_returns_user (user_id),
            INDEX idx_returns_customer (customer_id),
            INDEX idx_returns_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'returns');

    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS return_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            return_id INT NOT NULL,
            product_id INT NULL,
            product_name VARCHAR(200) NOT NULL,
            product_barcode VARCHAR(50) NULL,
            unit_price DECIMAL(10,2) NOT NULL,
            quantity INT NOT NULL,
            subtotal DECIMAL(12,2) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ri_return (return_id),
            INDEX idx_ri_product (product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'return_items');

// ============ EXPENSES ============
    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS expense_categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'expense_categories');

    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS expenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_id INT NULL,
            amount DECIMAL(12,2) NOT NULL,
            expense_date DATE NOT NULL,
            description TEXT NULL,
            payment_method ENUM('cash','card','bank_transfer','qr') NOT NULL DEFAULT 'cash',
            employee_id INT NULL,
            reference VARCHAR(100) NULL,
            user_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_expenses_category (category_id),
            INDEX idx_expenses_date (expense_date),
            INDEX idx_expenses_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'expenses');

    // ============ CASH REGISTERS (SHIFTS) ============
    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS cash_registers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cashier_id INT NOT NULL,
            opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            opening_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            closing_time DATETIME NULL,
            status ENUM('open','closed') NOT NULL DEFAULT 'open',
            expected_cash DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            actual_cash DECIMAL(12,2) NULL,
            variance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cr_cashier (cashier_id),
            INDEX idx_cr_status (status),
            INDEX idx_cr_opening (opening_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'cash_registers');

    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS cash_register_entries (
            id INT AUTO_INCREMENT PRIMARY KEY,
            register_id INT NOT NULL,
            entry_type ENUM('sale','refund','expense','withdrawal','addition') NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            reference_id INT NULL,
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cre_register (register_id),
            INDEX idx_cre_type (entry_type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'cash_register_entries');

    // ============ HELD BILLS ============
    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS held_bills (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reference VARCHAR(50) NULL,
            user_id INT NOT NULL,
            customer_id INT NULL,
            cart JSON NOT NULL,
            notes TEXT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_hb_user (user_id),
            INDEX idx_hb_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'held_bills');

    // ============ BRANDS + UNITS ============
    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS brands (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'brands');

    await ensureTable(conn, `
        CREATE TABLE IF NOT EXISTS units (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            abbreviation VARCHAR(10) NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `, 'units');

    // ============ SALES EXPANSION ============
    // Expand payment_method enum to cover Sri Lankan methods.
    await conn.query(`ALTER TABLE sales
        MODIFY COLUMN payment_method
        ENUM('cash','card','bank_transfer','qr','credit','mixed')
        NOT NULL DEFAULT 'cash'`);
    console.log('= sales.payment_method enum expanded');

    await ensureColumn(conn, 'sales', 'customer_id', 'INT NULL');
    await ensureColumn(conn, 'sales', 'invoice_discount_amount', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn(conn, 'sales', 'discount_type', "VARCHAR(10) NOT NULL DEFAULT 'fixed'");
    await ensureColumn(conn, 'sales', 'rounded_total', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn(conn, 'sales', 'amount_due', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');

    // Foreign key for sales.customer_id (only if the new column was just added).
    const [fkRows] = await conn.query(
        `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales' AND INDEX_NAME = 'fk_sales_customer'`
    );
    if (fkRows[0].c === 0) {
        await conn.query(
            'ALTER TABLE sales ADD CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL'
        ).catch(() => console.log('= sales->customers FK exists'));
        console.log('+ sales->customers FK');
    }

    // ============ PRODUCTS EXPANSION ============
    await ensureColumn(conn, 'products', 'brand_id', 'INT NULL');
    await ensureColumn(conn, 'products', 'unit_id', 'INT NULL');
    await ensureColumn(conn, 'products', 'wholesale_price', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
    await ensureColumn(conn, 'products', 'min_stock', 'INT NOT NULL DEFAULT 0');

    // ============ SUPPLIERS EXPANSION ============
    await ensureColumn(conn, 'suppliers', 'opening_balance', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn(conn, 'suppliers', 'balance', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');

    // ============ USERS ROLE EXPANSION ============
    await conn.query(`ALTER TABLE users
        MODIFY COLUMN role
        ENUM('owner','admin','manager','cashier','inventory_manager','accountant')
        NOT NULL DEFAULT 'cashier'`);
    console.log('= users.role enum expanded');

    // ============ SESSION REVOCATION ============
    // token_version is bumped on logout to invalidate all outstanding refresh tokens.
    await ensureColumn(conn, 'users', 'token_version', 'INT NOT NULL DEFAULT 0');

    // ============ SEED DEFAULT LOOKUPS ============
    const [unitCount] = await conn.query('SELECT COUNT(*) AS c FROM units');
    if (unitCount[0].c === 0) {
        await conn.query("INSERT INTO units (name, abbreviation) VALUES ('Piece','pc'),('Kilogram','kg'),('Gram','g'),('Liter','l'),('Box','box'),('Packet','pkt'),('Bottle','btl'),('Carton','ctn')");
        console.log('+ seeded default units');
    }
    const [expCatCount] = await conn.query('SELECT COUNT(*) AS c FROM expense_categories');
    if (expCatCount[0].c === 0) {
        await conn.query("INSERT INTO expense_categories (name, description) VALUES ('Utilities','Electricity, water, internet'),('Rent','Premises rental'),('Salaries','Staff wages'),('Supplies','Pantry & office supplies'),('Transport','Delivery and fuel'),('Maintenance','Repairs and upkeep'),('Other','Miscellaneous')");
        console.log('+ seeded expense categories');
    }
    const [catCount] = await conn.query('SELECT COUNT(*) AS c FROM categories');
    if (catCount[0].c === 0) {
        await conn.query("INSERT INTO categories (name, description) VALUES ('Grocery & Food','Rice, flour, spices, canned goods'),('Beverages','Water, soft drinks, juice, tea, coffee'),('Dairy & Eggs','Milk, cheese, yogurt, eggs'),('Bakery & Snacks','Bread, biscuits, chips, confectionery'),('Frozen Foods','Frozen meat, vegetables, ice cream'),('Personal Care','Shampoo, soap, toothpaste, deodorant'),('Household Cleaning','Detergents, dishwash, floor cleaner'),('Stationery & Office','Pens, notebooks, printer supplies'),('Health & Medicine','OTC medicines, vitamins, supplements'),('Electronics & Accessories','Batteries, cables, small gadgets'),('Clothing & Textiles','Apparel, fabrics, accessories'),('Baby & Kids','Diapers, baby food, toys'),('Pet Supplies','Pet food, accessories'),('Hardware & Tools','Hand tools, fixtures, fasteners'),('Miscellaneous','General / uncategorised items')");
        console.log('+ seeded default categories');
    }

    console.log('\nMigration complete.');
    await conn.end();
}

// Run directly from CLI
if (require.main === module) {
    migrate().then(() => process.exit(0)).catch((err) => {
        console.error('Migration failed:', err.message);
        process.exit(1);
    });
}

module.exports = migrate;