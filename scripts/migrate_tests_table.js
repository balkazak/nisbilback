const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

const runQuery = (query) => {
    return new Promise((resolve, reject) => {
        db.run(query, (err) => {
            if (err) {
                // Ignore "duplicate column name" error in case user ran it twice
                if (err.message.includes('duplicate column name')) {
                    resolve();
                } else {
                    reject(err);
                }
            } else {
                resolve();
            }
        });
    });
};

const migrate = async () => {
    try {
        console.log('Adding missing columns to Tests table...');
        await runQuery("ALTER TABLE Tests ADD COLUMN category TEXT DEFAULT 'standard'");
        console.log('Added category');
        await runQuery("ALTER TABLE Tests ADD COLUMN is_trial BOOLEAN DEFAULT 0");
        console.log('Added is_trial');
        await runQuery("ALTER TABLE Tests ADD COLUMN coin_price INTEGER DEFAULT 0");
        console.log('Added coin_price');
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        db.close();
    }
};

migrate();
