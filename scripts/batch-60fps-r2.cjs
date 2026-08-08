const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const BUCKET = 'notanartist';
const SRC_DIR = path.join(__dirname, '../public/videos-v2');
const TMP_DIR = path.join(__dirname, '../public/videos-v2-60fps');
const CONCURRENCY = 6; // 6 parallel ffmpeg + r2 workers

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.mp4') && !f.includes('_test'));
console.log(`Starting 60fps conversion + R2 upload for ${files.length} MP4 files (${CONCURRENCY} workers)...`);

let index = 0;
let completed = 0;
let failed = 0;

function processNext() {
    if (index >= files.length) {
        if (completed + failed === files.length) {
            console.log(`\n=== ALL DONE! ${completed}/${files.length} converted to 60fps & uploaded to R2 ===`);
        }
        return;
    }

    const filename = files[index++];
    const srcPath = path.join(SRC_DIR, filename);
    const tmpPath = path.join(TMP_DIR, filename);
    const r2Key = `videos-v2/${filename}`;

    // Step 1: FFmpeg convert to 60fps with faststart
    const ffmpegCmd = `ffmpeg -y -i "${srcPath}" -filter:v "fps=60" -c:v libx264 -crf 20 -preset fast -pix_fmt yuv420p -movflags +faststart -an "${tmpPath}"`;

    exec(ffmpegCmd, (err) => {
        if (err) {
            console.error(`[FFMPEG ERROR] ${filename}:`, err.message);
            failed++;
            completed++;
            processNext();
            return;
        }

        // Step 2: Upload 60fps video to R2
        const r2Cmd = `npx wrangler r2 object put "${BUCKET}/${r2Key}" --file "${tmpPath}" --content-type "video/mp4" --remote`;

        exec(r2Cmd, (r2Err) => {
            completed++;
            if (r2Err) {
                console.error(`[${completed}/${files.length}] R2 UPLOAD ERROR ${filename}:`, r2Err.message);
                failed++;
            } else {
                console.log(`[${completed}/${files.length}] OK (60fps & uploaded): ${filename}`);
                // Replace local source with 60fps version to save disk space
                try {
                    fs.renameSync(tmpPath, srcPath);
                } catch (e) {}
            }
            processNext();
        });
    });
}

for (let i = 0; i < CONCURRENCY; i++) {
    processNext();
}
