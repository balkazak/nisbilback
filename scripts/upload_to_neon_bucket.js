const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath });
} else {
    require('dotenv').config();
}

const uploadsDir = path.join(__dirname, '..', 'uploads');
const bucketName = 'uploads';

const s3 = new S3Client({
    forcePathStyle: true,
    region: process.env.AWS_REGION || 'us-east-2',
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

async function uploadAll() {
    const files = fs.readdirSync(uploadsDir).filter(f => f !== 'database.sqlite');
    console.log(`Found ${files.length} media files to upload to Neon bucket '${bucketName}'...`);

    let uploaded = 0;
    let failed = 0;

    const concurrency = 15;
    let index = 0;

    async function worker() {
        while (index < files.length) {
            const fileName = files[index++];
            const filePath = path.join(uploadsDir, fileName);
            try {
                const body = fs.readFileSync(filePath);
                let contentType = 'application/octet-stream';
                const lower = fileName.toLowerCase();
                if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
                    contentType = 'image/jpeg';
                } else if (lower.endsWith('.png')) {
                    contentType = 'image/png';
                } else if (lower.endsWith('.pdf')) {
                    contentType = 'application/pdf';
                }

                await s3.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: fileName,
                    Body: body,
                    ContentType: contentType
                }));

                uploaded++;
                if (uploaded % 50 === 0 || uploaded === files.length) {
                    console.log(`Uploaded: ${uploaded}/${files.length}...`);
                }
            } catch (err) {
                console.error(`Failed to upload ${fileName}:`, err.message);
                failed++;
            }
        }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    console.log(`\n🎉 Upload finished! Successfully uploaded: ${uploaded}, Failed: ${failed}`);
}

if (require.main === module) {
    uploadAll();
}

module.exports = { uploadAll };
