const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("PRAGMA table_info(Tests)", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Columns in Tests table:', rows.map(r => r.name));
    });
});

db.close();
