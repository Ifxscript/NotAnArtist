const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, "../public/motor/curated-seeds.json");
const OUTPUT_DIR = path.join(__dirname, "../public/images-test");
const HTML_PATH = `file://${path.join(__dirname, "../../motor/index.html")}`;

async function main() {
    if (!fs.existsSync(SEEDS_PATH)) {
        console.error("Error: curated-seeds.json not found!");
        process.exit(1);
    }

    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    const testSeeds = seeds.slice(0, 5);

    console.log(`Generating test images for first 5 seeds at 3x High-Res (900x1200)...`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: "new"
    });
    const page = await browser.newPage();

    // 300x400 at scale 3 = 900x1200 resolution
    await page.setViewport({
        width: 300,
        height: 400,
        deviceScaleFactor: 3
    });

    const generatedFiles = [];

    for (let i = 0; i < testSeeds.length; i++) {
        const seed = testSeeds[i];
        console.log(`[${i + 1}/5] Rendering seed ${seed}...`);

        await page.goto(`${HTML_PATH}?seed=${seed}`);

        // Wait 2.5 seconds to guarantee all shaders, textures, and canvas baking are 100% complete
        await new Promise(r => setTimeout(r, 2500));

        const canvas = await page.$('canvas');
        if (canvas) {
            const fileName = `seed_${i + 1}_${seed}.jpg`;
            const imagePath = path.join(OUTPUT_DIR, fileName);
            await canvas.screenshot({
                path: imagePath,
                type: 'jpeg',
                quality: 90
            });
            const stats = fs.statSync(imagePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            generatedFiles.push({ fileName, path: imagePath, sizeKB });
            console.log(`  ✅ Saved: ${fileName} (${sizeKB} KB)`);
        } else {
            console.error(`  ❌ Failed to find canvas for seed ${seed}`);
        }
    }

    await browser.close();

    console.log(`\n🎉 Test images generated inside: ${OUTPUT_DIR}`);
    console.log(`\nImage details:`);
    for (const f of generatedFiles) {
        console.log(`  • ${f.fileName} — ${f.sizeKB} KB (Resolution: 900x1200 @ 3x scale)`);
    }
}

main().catch(console.error);
