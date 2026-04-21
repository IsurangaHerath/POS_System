const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function checkAdminUser() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.query('SELECT id, username, email, full_name, role, is_active, password_hash FROM users WHERE username = "admin"');
        
        if (rows.length === 0) {
            console.log('Admin user NOT FOUND in database!');
        } else {
            const admin = rows[0];
            console.log('Admin user found:');
            console.log(`ID: ${admin.id}`);
            console.log(`Username: ${admin.username}`);
            console.log(`Email: ${admin.email}`);
            console.log(`Role: ${admin.role}`);
            console.log(`Is Active: ${admin.is_active}`);
            console.log(`Password Hash: ${admin.password_hash}`);
            
            const expectedHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe';
            if (admin.password_hash === expectedHash) {
                console.log('Password hash MATCHES expected hash for "password123"');
            } else {
                console.log('Password hash DOES NOT MATCH expected hash!');
            }
        }
    } catch (error) {
        console.error('Error checking admin user:', error);
    } finally {
        await connection.end();
    }
}

checkAdminUser();
