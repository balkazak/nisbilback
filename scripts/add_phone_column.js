const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await c.connect();
    await c.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);');
    console.log('✓ phone column added to Users table successfully.');
    await c.end();
}

run().catch(console.error);
