const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
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

async function processVideo(filename) {
    const baseName = filename.replace('.webm', '');
    const webmPath = path.join(VIDEO_DIR, filename);
    const mp4Path = path.join(VIDEO_DIR, `${baseName}.mp4`);

    // Convert to iOS-compatible H.264 MP4 if not already converted
    if (!fs.existsSync(mp4Path) || fs.statSync(mp4Path).size < 10000) {
        execSync(`${ffmpegPath} -y -i ${webmPath} -c:v libx264 -preset fast -crf 26 -pix_fmt yuv420p ${mp4Path}`, { stdio: 'ignore' });
    }

    // Upload MP4 to Cloudflare R2
    const fileBuffer = fs.readFileSync(mp4Path);
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `videos-v2/${baseName}.mp4`,
        Body: fileBuffer,
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000, immutable'
    });

    await s3.send(command);
    console.log(`  ✅ Converted & Uploaded MP4 for iOS: videos-v2/${baseName}.mp4`);
}

async function main() {
    const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.webm'));
    console.log(`📱 Converting & Uploading ${files.length} MP4 videos for 100% iPhone iOS compatibility...`);

    const CONCURRENCY = 10;
    for (let i = 0; i < files.length; i += CONCURRENCY) {
        const chunk = files.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(f => processVideo(f)));
        console.log(`Progress: ${Math.min(i + CONCURRENCY, files.length)} / ${files.length} MP4s completed...`);
    }

    console.log('🎉 All 456 MP4 videos successfully uploaded to Cloudflare R2!');
}

main().catch(console.error);
