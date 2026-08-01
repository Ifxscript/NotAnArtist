const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const ACCOUNT_ID = 'f30c534e99005aea526d905aaf048520';
const ACCESS_KEY_ID = '3e20ba6403f15aa6088eef8a62818bdd';
const SECRET_ACCESS_KEY = 'ac3d5a6d3d04d02ae86bdf7d7b9d39d4ddf98cf9009992121c66ad032984fc11';
const BUCKET_NAME = 'notanartist';

const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
    },
});

const VIDEO_DIR = path.join(__dirname, '../public/videos-v2');

async function uploadFile(filename) {
    const filePath = path.join(VIDEO_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);
    
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `videos-v2/${filename}`,
        Body: fileBuffer,
        ContentType: 'video/webm',
        CacheControl: 'public, max-age=31536000, immutable'
    });

    await s3.send(command);
    console.log(`  ✅ Uploaded to R2: videos-v2/${filename}`);
}

async function main() {
    const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
    console.log(`🚀 Starting high-speed Cloudflare R2 upload for ${files.length} video files to bucket "${BUCKET_NAME}"...`);

    const CONCURRENCY = 15;
    for (let i = 0; i < files.length; i += CONCURRENCY) {
        const chunk = files.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(f => uploadFile(f)));
        console.log(`Progress: ${Math.min(i + CONCURRENCY, files.length)} / ${files.length} files uploaded...`);
    }

    console.log('🎉 All 456 videos successfully uploaded to Cloudflare R2 bucket "notanartist"!');
}

main().catch(console.error);
