/**
 * POS Schema Reconciliation (v3)
 *
 * Non-destructive, idempotent. Adds columns that upgrade.js omitted so the
 * customers table matches schema.sql. Additive only.
 *
 * Run from the backend directory:
 *   node src/migrations/reconcile_v3.js
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

async function reconcile() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pos_system',
        multipleStatements: true
    });

    console.log('Reconciling schema (v3)...');
    await ensureColumn(conn, 'customers', 'city', 'VARCHAR(100) NULL');
    await ensureColumn(conn, 'customers', 'date_of_birth', 'DATE NULL');
    await ensureColumn(conn, 'customers', 'nic', 'VARCHAR(20) NULL');
    console.log('Done.');
    await conn.end();
}

// Run directly from CLI
if (require.main === module) {
    reconcile().then(() => process.exit(0)).catch((e) => {
        console.error('Migration failed:', e.message);
        process.exit(1);
    });
}

module.exports = reconcile;
