const { Client } = require('pg');

const neonUrl = 'postgresql://neondb_owner:npg_nweVL4mkvC8J@ep-still-mud-b47jx7nt-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function cleanup() {
    console.log('Connecting to Neon PostgreSQL...');
    const client = new Client({
        connectionString: neonUrl,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
        console.log('\n--- BEFORE CLEANUP ---');
        const beforeUsers = await client.query('SELECT COUNT(*) FROM "Users"');
        const beforeResults = await client.query('SELECT COUNT(*) FROM "Results"');
        const beforeUC = await client.query('SELECT COUNT(*) FROM "UserCourses"');
        const beforeUT = await client.query('SELECT COUNT(*) FROM "UserTests"');
        console.log(`Users: ${beforeUsers.rows[0].count}`);
        console.log(`Results: ${beforeResults.rows[0].count}`);
        console.log(`UserCourses: ${beforeUC.rows[0].count}`);
        console.log(`UserTests: ${beforeUT.rows[0].count}`);

        // Find Admin
        const adminRes = await client.query('SELECT id, username, role FROM "Users" WHERE username = \'admin\'');
        if (adminRes.rows.length === 0) {
            throw new Error('Admin user not found! Aborting cleanup to prevent complete lockout.');
        }
        const adminUser = adminRes.rows[0];
        console.log(`\nFound Admin: ID ${adminUser.id}, username: '${adminUser.username}', role: '${adminUser.role}'`);

        // 1. Clear all Results
        console.log('\nClearing all Results...');
        await client.query('DELETE FROM "Results"');
        await client.query('SELECT setval(pg_get_serial_sequence(\'"Results"\', \'id\'), 1, false)');
        console.log('✓ Results cleared and ID sequence reset.');

        // 2. Clear UserCourses and UserTests for non-admin users
        console.log('Clearing user access relations for deleted users...');
        await client.query('DELETE FROM "UserCourses" WHERE "UserId" != $1', [adminUser.id]);
        await client.query('DELETE FROM "UserTests" WHERE "UserId" != $1', [adminUser.id]);
        console.log('✓ UserCourses and UserTests cleared.');

        // 3. Clear Users except admin
        console.log('Deleting all users except admin...');
        const deleteRes = await client.query('DELETE FROM "Users" WHERE id != $1', [adminUser.id]);
        console.log(`✓ Deleted ${deleteRes.rowCount} users.`);

        // 4. Reset Users sequence
        await client.query('SELECT setval(pg_get_serial_sequence(\'"Users"\', \'id\'), (SELECT MAX(id) FROM "Users"))');
        console.log('✓ Users ID sequence reset to Admin ID.');

        console.log('\n--- AFTER CLEANUP ---');
        const afterUsers = await client.query('SELECT id, username, role FROM "Users"');
        const afterResults = await client.query('SELECT COUNT(*) FROM "Results"');
        const afterUC = await client.query('SELECT COUNT(*) FROM "UserCourses"');
        const afterUT = await client.query('SELECT COUNT(*) FROM "UserTests"');
        const afterCourses = await client.query('SELECT COUNT(*) FROM "Courses"');
        const afterLessons = await client.query('SELECT COUNT(*) FROM "Lessons"');
        const afterTests = await client.query('SELECT COUNT(*) FROM "Tests"');
        const afterQuestions = await client.query('SELECT COUNT(*) FROM "Questions"');

        console.log(`Remaining Users: ${JSON.stringify(afterUsers.rows)}`);
        console.log(`Results: ${afterResults.rows[0].count}`);
        console.log(`UserCourses: ${afterUC.rows[0].count}`);
        console.log(`UserTests: ${afterUT.rows[0].count}`);
        console.log(`\n(Unchanged) Courses: ${afterCourses.rows[0].count}, Lessons: ${afterLessons.rows[0].count}, Tests: ${afterTests.rows[0].count}, Questions: ${afterQuestions.rows[0].count}`);

        console.log('\n🎉 CLEANUP COMPLETED SUCCESSFULLY!');
    } catch (err) {
        console.error('Error during cleanup:', err.message);
    } finally {
        await client.end();
    }
}

cleanup();
