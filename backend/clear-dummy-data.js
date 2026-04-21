/**
 * Clear Dummy Data Script
 * 
 * Truncates all transactional and master data tables.
 * Resets the database to a clean state.
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function clearData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log(`Connected to database: ${process.env.DB_NAME}`);

    try {
        // Disable foreign key checks to allow truncation
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'audit_logs',
            'inventory_logs',
            'sale_items',
            'sales',
            'purchase_order_items',
            'purchase_orders',
            'inventory',
            'product_suppliers',
            'products',
            'suppliers',
            'categories',
            'users',
            'settings'
        ];

        for (const table of tables) {
            console.log(`Clearing table: ${table}...`);
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        // Re-enable foreign key checks
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\nAll dummy data cleared successfully!');
        
        // Optional: Re-insert a clean admin user so you can still log in
        console.log('Re-inserting default admin user...');
        const adminPassHash = '$2a$12$Z/R.UUXCcQ5rPTtTJYuRHOsOWqhE.I4F07cAjjEQ3tB62Q4p81iri'; // password123 (bcryptjs)
        await connection.query(`
            INSERT INTO users (username, email, password_hash, full_name, role, is_active) 
            VALUES ('admin', 'admin@pos-system.com', ?, 'System Administrator', 'admin', TRUE)
        `, [adminPassHash]);

        // Optional: Re-insert default settings
        console.log('Re-inserting default settings...');
        await connection.query(`
            INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
            ('store_name', 'POS System', 'string', 'Store display name'),
            ('currency_code', 'USD', 'string', 'Default currency code'),
            ('currency_symbol', '$', 'string', 'Currency symbol'),
            ('tax_rate', '10', 'number', 'Default tax rate percentage')
        `);

        console.log('Clean state initialized. You can login with admin/password123');

    } catch (error) {
        console.error('Error clearing data:', error);
    } finally {
        await connection.end();
    }
}

clearData();
