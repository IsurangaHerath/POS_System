/**
 * PostgreSQL Initialization Script
 * 
 * This script connects to the Neon database and executes the PostgreSQL schema.
 * It also inserts initial admin user and default settings.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database connection string from command line or environment
const connectionString = process.argv[2] || process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_4ZTyQNVLeI0j@ep-late-darkness-anpoy1ej-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function initializeDatabase() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Neon PostgreSQL...');
        await client.connect();
        console.log('Successfully connected.');

        // 1. Execute Schema
        console.log('Reading schema file...');
        const schemaSql = fs.readFileSync(path.join(__dirname, 'postgres_schema.sql'), 'utf8');
        
        console.log('Executing schema (this may take a few seconds)...');
        await client.query(schemaSql);
        console.log('Schema created successfully.');

        // 2. Insert Default Admin User
        console.log('Checking for existing admin user...');
        const userCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
        
        if (userCheck.rows.length === 0) {
            console.log('Creating default admin user...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await client.query(
                'INSERT INTO users (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)',
                ['admin', 'admin@pos-system.com', hashedPassword, 'System Administrator', 'admin']
            );
            console.log('Admin user created: admin / admin123');
        } else {
            console.log('Admin user already exists.');
        }

        // 3. Insert Default Settings
        console.log('Inserting default settings...');
        const settings = [
            ['store_name', 'My POS Store', 'string', 'Name of the store'],
            ['currency_code', 'USD', 'string', 'Local currency code'],
            ['currency_symbol', '$', 'string', 'Local currency symbol'],
            ['tax_rate', '10.00', 'number', 'Default tax rate percentage'],
            ['low_stock_threshold', '10', 'number', 'Global low stock alert threshold']
        ];

        for (const [key, value, type, desc] of settings) {
            await client.query(
                'INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES ($1, $2, $3, $4) ON CONFLICT (setting_key) DO NOTHING',
                [key, value, type, desc]
            );
        }
        console.log('Default settings initialized.');

        console.log('\nDatabase initialization complete!');
        console.log('You can now deploy to Netlify.');

    } catch (error) {
        console.error('Initialization failed:', error);
    } finally {
        await client.end();
    }
}

initializeDatabase();
