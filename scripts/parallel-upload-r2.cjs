const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const BUCKET = 'notanartist';
const SRC_DIR = path.join(__dirname, '../public/videos-v2');
const CONCURRENCY = 8;

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.mp4'));
console.log(`Found ${files.length} MP4 files to upload in parallel (${CONCURRENCY} workers)...`);

let index = 0;
let completed = 0;
let failed = 0;

function uploadNextWorker() {
    if (index >= files.length) return;
    const filename = files[index++];
    const filePath = path.join(SRC_DIR, filename);
    const r2Key = `videos-v2/${filename}`;

    const cmd = `npx wrangler r2 object put "${BUCKET}/${r2Key}" --file "${filePath}" --content-type "video/mp4" --remote`;

    exec(cmd, (err) => {
        completed++;
        if (err) {
            console.error(`[${completed}/${files.length}] FAILED: ${r2Key}`);
            failed++;
        } else {
            console.log(`[${completed}/${files.length}] OK: ${r2Key}`);
        }
        uploadNextWorker();
    });
}

for (let i = 0; i < CONCURRENCY; i++) {
    uploadNextWorker();
}
