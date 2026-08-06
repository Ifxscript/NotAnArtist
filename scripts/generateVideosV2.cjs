const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { processVideo } = require('./convertAndUploadMp4.cjs');

const SEEDS_PATH = path.join(__dirname, "../public/motor/curated-seeds.json");
const OUTPUT_DIR = path.join(__dirname, "../public/videos-v2");

const LOCAL_HTML_PATH = path.join(__dirname, "../public/motor/index.html");
const BASE_URL = process.env.BASE_URL || `file://${LOCAL_HTML_PATH}`;

async function recordSeed(page, index, seed, maxRetries = 3) {
    const videoPath = path.join(OUTPUT_DIR, `${index}.webm`);
    const gifPath = path.join(OUTPUT_DIR, `${index}.gif`);

    // Skip if GIF already exists and we're not forcing regen
    if (!process.env.FORCE_REGEN && fs.existsSync(gifPath) && fs.statSync(gifPath).size > 10000) {
        console.log(`[${index}] ⏭️  GIF already exists, skipping.`);
        return;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const url = `${BASE_URL}?seed=${seed}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Set normal speed
            await page.evaluate(() => { window._exportSpeedBoost = 1.0; });

            // Wait for first frame to render
            await page.waitForFunction(() => window._firstFrameDrawn === true, { timeout: 20000 });

            // Record 10 seconds of canvas at 60 FPS, 15 Mbps
            const RECORD_DURATION = parseInt(process.env.DURATION_MS || '10000', 10);
            const base64Data = await page.evaluate(async (duration) => {
                const canvas = document.querySelector('canvas');
                const stream = canvas.captureStream(60);
                const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
                const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 15000000 });
                const chunks = [];

                return new Promise((resolve) => {
                    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                    recorder.onstop = async () => {
                        const blob = new Blob(chunks, { type: mimeType });
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    };

                    recorder.start(100);
                    setTimeout(() => recorder.stop(), duration);
                });
            }, RECORD_DURATION);

            // Save WebM
            const base64Buffer = Buffer.from(base64Data.split(',')[1], 'base64');
            fs.writeFileSync(videoPath, base64Buffer);

            // Convert to MP4 + GIF and upload to R2
            await processVideo(`${index}.webm`);

            console.log(`[${index}] ✅ Recorded 10s HD + Converted + Uploaded MP4 & GIF`);
            return; // Success

        } catch (err) {
            console.warn(`[${index}] ⚠️  Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
            if (attempt === maxRetries) {
                console.error(`[${index}] ❌ Skipped after ${maxRetries} attempts.`);
            } else {
                await new Promise(r => setTimeout(r, 2000)); // Wait before retry
            }
        }
    }
}

async function main() {
    if (!fs.existsSync(SEEDS_PATH)) {
        console.error("Error: curated-seeds.json not found!");
        process.exit(1);
    }

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const startIndex = parseInt(process.env.START_INDEX || '0', 10);
    const endIndex = parseInt(process.env.END_INDEX || '49', 10);
    const durationMs = parseInt(process.env.DURATION_MS || '10000', 10);

    console.log(`🚀 BATCH GENERATION STARTing: Items ${startIndex + 1} to ${Math.min(endIndex + 1, seeds.length)} (${durationMs / 1000}s 1080p MP4)...`);
    console.log(`📡 Using server: ${BASE_URL}`);

    const browser = await puppeteer.launch({
        headless: "new"
    });

    for (let i = startIndex; i <= Math.min(endIndex, seeds.length - 1); i++) {
        const item = seeds[i];
        const index = i + 1; // 1-based token index
        const seed = typeof item === 'object' ? item.seed : item;
        console.log(`\n▶️  [Batch Item ${i - startIndex + 1}/${endIndex - startIndex + 1}] Processing Token #${index}...`);
        
        const page = await browser.newPage();
        await page.setViewport({
            width: 1080,
            height: 1080,
            deviceScaleFactor: 1
        });
        
        try {
            await recordSeed(page, index, seed);
        } finally {
            await page.close().catch(() => {});
        }
    }


    await browser.close();
    console.log(`\n🛑 BATCH FINISHED! Items ${startIndex + 1} to ${Math.min(endIndex + 1, seeds.length)} generated and uploaded.`);
}

main().catch(console.error);

