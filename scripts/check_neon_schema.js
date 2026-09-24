const { Client } = require('pg');

const c = new Client({
    connectionString: 'postgresql://neondb_owner:npg_nweVL4mkvC8J@ep-still-mud-b47jx7nt-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await c.connect();
    const res = await c.query('SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = \'enum_Users_role\'');
    console.log('Current roles enum:', res.rows.map(r => r.enumlabel));
    await c.end();
}

run();
