const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, "../public/motor/curated-seeds.json");
const OUTPUT_DIR = path.join(__dirname, "../public/images-test-1350x1800");
const HTML_PATH = `file://${path.join(__dirname, "../public/motor/index.html")}`;

async function main() {
    if (!fs.existsSync(SEEDS_PATH)) {
        console.error("Error: curated-seeds.json not found!");
        process.exit(1);
    }

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    const testSeeds = seeds.slice(0, 5);

    console.log(`Generating 5 test images at 1350x1800 resolution...`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: "new"
    });
    const page = await browser.newPage();
    
    await page.setViewport({
        width: 1350,
        height: 1800,
        deviceScaleFactor: 1
    });

    for (let i = 0; i < testSeeds.length; i++) {
        const item = testSeeds[i];
        const seed = typeof item === 'object' ? item.seed : item;
        const index = i + 1;

        console.log(`[${index}/5] Generating 1350x1800 image for seed: ${seed}...`);

        const imagePath = path.join(OUTPUT_DIR, `${index}.jpg`);
        const pngPath = path.join(OUTPUT_DIR, `${index}.png`);

        await page.goto(`${HTML_PATH}?seed=${seed}`, { waitUntil: 'domcontentloaded' });

        // Wait for motor.js to signal first frame has rendered
        try {
            await page.waitForFunction(() => window._firstFrameDrawn === true, { timeout: 15000 });
            await page.addStyleTag({ content: 'canvas { border-radius: 0 !important; box-shadow: none !important; }' });
            await new Promise(r => setTimeout(r, 400));
        } catch (err) {
            console.warn(`  ⚠️ Timeout waiting for first frame on seed ${seed}`);
        }

        const canvas = await page.$('canvas');
        
        if (canvas) {
            await canvas.screenshot({
                path: imagePath,
                type: 'jpeg',
                quality: 90
            });
            await canvas.screenshot({
                path: pngPath,
                type: 'png'
            });
            const stats = fs.statSync(imagePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            console.log(`  ✅ Saved: ${index}.jpg (${sizeKB} KB) & ${index}.png`);
        } else {
            console.error(`  ❌ Failed to find canvas for seed ${seed}`);
        }
    }

    await browser.close();
    console.log(`\n🎉 Generated 5 test images (1350x1800) inside: ${OUTPUT_DIR}`);
}

main().catch(console.error);

