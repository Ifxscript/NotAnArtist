const puppeteer = require('puppeteer');
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

const V2_SEEDS_PATH = path.join(__dirname, "../src/curated_seeds_v2.json");
const OUTPUT_DIR = path.join(__dirname, "../public/images-1350x1800");
const HTML_PATH = `file://${path.join(__dirname, "../public/motor/index.html")}`;

async function uploadImage(imagePath, key, contentType) {
    try {
        const fileBuffer = fs.readFileSync(imagePath);
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable'
        });
        await s3.send(command);
    } catch (err) {
        console.warn(`  ⚠️ Upload failed for ${key}:`, err.message);
    }
}

async function processSeed(browser, seed, index, totalStraightCount, currentStraightNum, maxRetries = 3) {
    const imagePath = path.join(OUTPUT_DIR, `${index}.jpg`);

    console.log(`[Straight Mode Item ${currentStraightNum}/${totalStraightCount} — Token #${index}] Generating 1350x1800 image for seed: ${seed}...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let page;
        try {
            page = await browser.newPage();
            await page.setViewport({
                width: 1350,
                height: 1800,
                deviceScaleFactor: 1
            });

            await page.goto(`${HTML_PATH}?seed=${seed}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForFunction(() => window._firstFrameDrawn === true, { timeout: 15000 });
            await page.addStyleTag({ content: 'canvas { border-radius: 0 !important; box-shadow: none !important; }' });
            await new Promise(r => setTimeout(r, 400));

            const canvas = await page.$('canvas');
            if (canvas) {
                await canvas.screenshot({
                    path: imagePath,
                    type: 'jpeg',
                    quality: 90
                });
                const stats = fs.statSync(imagePath);
                const sizeKB = (stats.size / 1024).toFixed(1);

                // Upload to Cloudflare R2
                await uploadImage(imagePath, `images-1350x1800/${index}.jpg`, 'image/jpeg');

                console.log(`  ✅ Saved & Uploaded: ${index}.jpg (${sizeKB} KB)`);
                return true;
            } else {
                console.error(`  ❌ Canvas not found for seed ${seed}`);
            }
        } catch (err) {
            console.warn(`  ⚠️ Attempt ${attempt}/${maxRetries} failed for #${index}:`, err.message);
            if (attempt === maxRetries) {
                console.error(`  ❌ Failed #${index} after ${maxRetries} retries.`);
                return false;
            } else {
                await new Promise(r => setTimeout(r, 1000));
            }
        } finally {
            if (page) {
                await page.close().catch(() => {});
            }
        }
    }
    return false;
}

async function main() {
    if (!fs.existsSync(V2_SEEDS_PATH)) {
        console.error("Error: curated_seeds_v2.json not found!");
        process.exit(1);
    }

    const allItems = JSON.parse(fs.readFileSync(V2_SEEDS_PATH, "utf8"));
    const straightItems = allItems.filter(item => {
        const mode = item.traits ? item.traits["Art Mode"] : "";
        return mode === "straight";
    });

    console.log(`🚀 Found ${straightItems.length} tokens with Straight Art Mode out of ${allItems.length} total tokens.`);
    console.log(`🎯 TARGETED RE-GENERATION: Only processing the ${straightItems.length} Straight Mode tokens!`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const BATCH_SIZE = 25;
    for (let i = 0; i < straightItems.length; i += BATCH_SIZE) {
        const chunk = straightItems.slice(i, i + BATCH_SIZE);
        const browser = await puppeteer.launch({
            headless: "new",
            protocolTimeout: 120000
        });

        for (let j = 0; j < chunk.length; j++) {
            const item = chunk[j];
            const seed = item.seed;
            const index = item.index; // Exact token ID (1 to 456)
            const currentNum = i + j + 1;
            await processSeed(browser, seed, index, straightItems.length, currentNum);
        }

        await browser.close().catch(() => {});
    }

    console.log(`\n🎉 All ${straightItems.length} Straight Mode images (1350x1800) successfully re-generated & uploaded to Cloudflare R2!`);
}

main().catch(console.error);
