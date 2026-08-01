const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, "../public/motor/curated-seeds.json");
const OUTPUT_DIR = path.join(__dirname, "../public/videos-v2");

async function main() {
    if (!fs.existsSync(SEEDS_PATH)) {
        console.error("Error: curated-seeds.json not found!");
        process.exit(1);
    }

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log(`Testing video generation for first 3 seeds at 1080x1440 resolution...`);

    const browser = await puppeteer.launch({
        headless: "new"
    });

    const page = await browser.newPage();
    await page.setViewport({
        width: 1080,
        height: 1440,
        deviceScaleFactor: 1
    });

    for (let i = 0; i < 3; i++) {
        const item = seeds[i];
        const index = i + 1;
        const seed = typeof item === 'object' ? item.seed : item;

        console.log(`[${index}/${seeds.length}] Recording high-res video for seed: ${seed}...`);

        const HTML_PATH = `file://${path.join(__dirname, "../../motor/index.html")}?seed=${seed}`;

        await page.goto(HTML_PATH);

        // Wait for first frame drawn
        await page.waitForFunction(() => window._firstFrameDrawn === true, { timeout: 15000 });

        // Record 3 seconds using MediaRecorder
        const base64Data = await page.evaluate(async () => {
            const canvas = document.querySelector('canvas');
            const stream = canvas.captureStream(60); // 60 FPS
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
            const chunks = [];

            return new Promise((resolve) => {
                recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                };

                recorder.start();
                setTimeout(() => recorder.stop(), 3000); // 3 seconds video
            });
        });

        const base64Buffer = Buffer.from(base64Data.split(',')[1], 'base64');
        const videoPath = path.join(OUTPUT_DIR, `${index}.webm`);
        fs.writeFileSync(videoPath, base64Buffer);

        const stats = fs.statSync(videoPath);
        console.log(`  Saved: ${videoPath} (${(stats.size / 1024).toFixed(1)} KB)`);
    }

    await browser.close();
    console.log('✅ Test complete!');
}

main().catch(console.error);
