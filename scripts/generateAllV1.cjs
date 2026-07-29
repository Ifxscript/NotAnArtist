const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, "../../motor-contracts/curated_seeds.json");
const OUTPUT_DIR = path.join(__dirname, "../public/images");
const HTML_PATH = `file://${path.join(__dirname, "../../motor/index.html")}`;

async function main() {
    if (!fs.existsSync(SEEDS_PATH)) {
        console.error("Error: curated_seeds.json not found!");
        process.exit(1);
    }

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    console.log(`Generating all ${seeds.length} v1 images at 2x Retina + 78q...`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: "new"
    });
    const page = await browser.newPage();
    
    await page.setViewport({
        width: 300,
        height: 400,
        deviceScaleFactor: 2
    });

    for (let i = 0; i < seeds.length; i++) {
        const item = seeds[i];
        const index = item.index;
        const seed = item.seed;

        console.log(`[${i + 1}/${seeds.length}] Generating v1 image for seed: ${seed}...`);

        const imagePath = path.join(OUTPUT_DIR, `${index}.jpg`);

        await page.evaluateOnNewDocument((injectedSeed) => {
            window.HASH = Number(injectedSeed);
        }, seed);

        await page.goto(HTML_PATH);

        // Wait for motor.js to signal first frame has rendered
        try {
            await page.waitForFunction(() => window._firstFrameDrawn === true, { timeout: 15000 });
            // Small extra delay for canvas buffer flush
            await new Promise(r => setTimeout(r, 200));
        } catch (err) {
            console.warn(`  ⚠️ Timeout waiting for first frame on seed ${seed}, attempting capture anyway...`);
        }

        const canvasSelector = 'canvas';
        const canvas = await page.$(canvasSelector);
        
        if (canvas) {
            await canvas.screenshot({
                path: imagePath,
                type: 'jpeg',
                quality: 78
            });
            console.log(`  Saved: ${imagePath}`);
        } else {
            console.error(`  ❌ Failed to find canvas for seed ${seed}`);
        }
    }

    await browser.close();
    console.log(`\n🎉 Generated all v1 images inside: ${OUTPUT_DIR}`);
}

main().catch(console.error);
