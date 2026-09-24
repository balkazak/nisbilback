const { Client } = require('pg');

const railwayUrl = 'postgresql://postgres:yuwrvHLIRAkBPezZEBipIgKYVCSYbRea@ballast.proxy.rlwy.net:36547/railway';
const neonUrl = 'postgresql://neondb_owner:npg_nweVL4mkvC8J@ep-still-mud-b47jx7nt-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function test() {
    console.log('--- Testing Railway connection ---');
    const rClient = new Client({
        connectionString: railwayUrl,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await rClient.connect();
        const rRes = await rClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log('Railway tables:', rRes.rows.map(r => r.table_name));
        for (const t of rRes.rows) {
            const countRes = await rClient.query(`SELECT COUNT(*) FROM "${t.table_name}"`);
            console.log(`  Table ${t.table_name}: ${countRes.rows[0].count} rows`);
        }
        await rClient.end();
    } catch (e) {
        console.error('Railway error:', e.message);
    }

    console.log('\n--- Testing Neon connection ---');
    const nClient = new Client({
        connectionString: neonUrl,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await nClient.connect();
        const nRes = await nClient.query('SELECT NOW() as now, current_database() as db');
        console.log('Neon connected successfully! Database:', nRes.rows[0].db, 'Time:', nRes.rows[0].now);
        const nTables = await nClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log('Neon existing tables:', nTables.rows.map(r => r.table_name));
        await nClient.end();
    } catch (e) {
        console.error('Neon error:', e.message);
    }
}

test();
