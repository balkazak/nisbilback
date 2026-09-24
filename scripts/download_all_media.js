const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const sqliteDbPath = path.join(__dirname, '..', 'backups', 'prod_live_database.sqlite');
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

async function downloadMedia() {
    const db = new sqlite3.Database(sqliteDbPath);
    const files = new Set();

    await new Promise((resolve) => {
        db.serialize(() => {
            db.all('SELECT thumbnail_url FROM Courses WHERE thumbnail_url IS NOT NULL', [], (err, rows) => {
                rows.forEach(r => files.add(r.thumbnail_url));
            });
            db.all('SELECT materials FROM Lessons WHERE materials IS NOT NULL', [], (err, rows) => {
                rows.forEach(r => {
                    try {
                        const mats = JSON.parse(r.materials);
                        if (Array.isArray(mats)) mats.forEach(m => m.url && files.add(m.url));
                    } catch (e) {}
                });
            });
            db.all('SELECT image_url, options FROM Questions', [], (err, rows) => {
                rows.forEach(r => {
                    if (r.image_url) files.add(r.image_url);
                    try {
                        const opts = JSON.parse(r.options);
                        if (Array.isArray(opts)) opts.forEach(o => o.image_url && files.add(o.image_url));
                    } catch (e) {}
                });
                resolve();
            });
        });
    });

    const fileList = Array.from(files).filter(f => f && f.includes('/uploads/'));
    console.log(`Found ${fileList.length} files to download.`);

    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    // Concurrency pool
    const concurrency = 10;
    let index = 0;

    async function worker() {
        while (index < fileList.length) {
            const fileUrl = fileList[index++];
            const fileName = path.basename(fileUrl);
            const localPath = path.join(uploadsDir, fileName);

            if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
                skipped++;
                continue;
            }

            try {
                // Ensure https/http URL
                let normalizedUrl = fileUrl;
                if (!normalizedUrl.startsWith('http')) {
                    normalizedUrl = 'https://nisbilback-production.up.railway.app' + normalizedUrl;
                }
                const res = await fetch(normalizedUrl);
                if (res.ok) {
                    const buffer = Buffer.from(await res.arrayBuffer());
                    fs.writeFileSync(localPath, buffer);
                    downloaded++;
                    if (downloaded % 50 === 0 || downloaded === fileList.length) {
                        console.log(`Progress: ${downloaded}/${fileList.length} downloaded (${skipped} cached)...`);
                    }
                } else {
                    failed++;
                }
            } catch (err) {
                failed++;
            }
        }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);

    console.log(`\n🎉 Download complete! Downloaded: ${downloaded}, Cached: ${skipped}, Failed: ${failed}`);
    db.close();
}

downloadMedia();
