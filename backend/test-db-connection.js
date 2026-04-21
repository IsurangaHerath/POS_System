const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_4ZTyQNVLeI0j@ep-late-darkness-anpoy1ej-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkConnection() {
  try {
    const start = Date.now();
    const res = await pool.query('SELECT NOW()');
    const end = Date.now();
    console.log('Successfully connected to PostgreSQL!');
    console.log('Current time from DB:', res.rows[0].now);
    console.log(`Response time: ${end - start}ms`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to connect to PostgreSQL:');
    console.error(err);
    process.exit(1);
  }
}

checkConnection();
