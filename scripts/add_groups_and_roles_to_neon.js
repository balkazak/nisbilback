const { Client } = require('pg');

const neonUrl = 'postgresql://neondb_owner:npg_nweVL4mkvC8J@ep-still-mud-b47jx7nt-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function migrateNeon() {
    console.log('Connecting to Neon PostgreSQL...');
    const client = new Client({
        connectionString: neonUrl,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
        console.log('1. Updating enum_Users_role...');
        // Add curator and operator to enum
        await client.query("ALTER TYPE \"enum_Users_role\" ADD VALUE IF NOT EXISTS 'curator'");
        await client.query("ALTER TYPE \"enum_Users_role\" ADD VALUE IF NOT EXISTS 'operator'");
        console.log('✓ Enum updated with curator and operator.');

        console.log('2. Creating Groups table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Groups" (
                "id" SERIAL PRIMARY KEY,
                "name" VARCHAR(255) NOT NULL UNIQUE,
                "description" TEXT,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✓ Groups table created.');

        console.log('3. Adding groupId to Users table...');
        const colCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'Users' AND column_name = 'groupId';
        `);
        if (colCheck.rows.length === 0) {
            await client.query(`
                ALTER TABLE "Users" 
                ADD COLUMN "groupId" INTEGER REFERENCES "Groups"("id") ON DELETE SET NULL;
            `);
            console.log('✓ groupId column added to Users.');
        } else {
            console.log('✓ groupId column already exists in Users.');
        }

        console.log('4. Creating CuratorGroups table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS "CuratorGroups" (
                "id" SERIAL PRIMARY KEY,
                "UserId" INTEGER NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
                "GroupId" INTEGER NOT NULL REFERENCES "Groups"("id") ON DELETE CASCADE,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT "unique_curator_group" UNIQUE ("UserId", "GroupId")
            );
        `);
        console.log('✓ CuratorGroups table created.');

        console.log('\n--- VERIFYING SCHEMA ---');
        const rolesRes = await client.query(`
            SELECT enumlabel FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE typname = 'enum_Users_role'
        `);
        console.log('Roles enum:', rolesRes.rows.map(r => r.enumlabel));

        const tablesRes = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' ORDER BY table_name;
        `);
        console.log('Tables in Neon:', tablesRes.rows.map(r => r.table_name));

        console.log('\n🎉 NEON SCHEMA MIGRATED SUCCESSFULLY!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await client.end();
    }
}

migrateNeon();
