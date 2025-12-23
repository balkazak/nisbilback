const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Cleaning up backup tables...');

db.serialize(() => {
    // Drop all backup tables
    db.run(`DROP TABLE IF EXISTS Users_backup`, (err) => {
        if (err) console.error('Error dropping Users_backup:', err.message);
        else console.log('✓ Dropped Users_backup');
    });

    db.run(`DROP TABLE IF EXISTS Courses_backup`, (err) => {
        if (err) console.error('Error dropping Courses_backup:', err.message);
        else console.log('✓ Dropped Courses_backup');
    });

    db.run(`DROP TABLE IF EXISTS Lessons_backup`, (err) => {
        if (err) console.error('Error dropping Lessons_backup:', err.message);
        else console.log('✓ Dropped Lessons_backup');
    });

    db.run(`DROP TABLE IF EXISTS Tests_backup`, (err) => {
        if (err) console.error('Error dropping Tests_backup:', err.message);
        else console.log('✓ Dropped Tests_backup');
    });

    db.run(`DROP TABLE IF EXISTS Questions_backup`, (err) => {
        if (err) console.error('Error dropping Questions_backup:', err.message);
        else console.log('✓ Dropped Questions_backup');
    });

    db.run(`DROP TABLE IF EXISTS Results_backup`, (err) => {
        if (err) console.error('Error dropping Results_backup:', err.message);
        else console.log('✓ Dropped Results_backup');
    });
});

db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('\n✅ Cleanup complete! You can now restart the server.');
    }
});
