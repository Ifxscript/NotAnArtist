const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const SEEDS_PATH = path.join(__dirname, "../public/motor/curated-seeds.json");
const META_PATH = path.join(__dirname, "../public/motor/seeds-metadata.json");
const OUTPUT_PATH = path.join(__dirname, "../public/all-traits.json");
const OUTPUT_PATH_V2 = path.join(__dirname, "../public/all-traits-v2.json");
const HTML_PATH = `file://${path.join(__dirname, "../../motor/index.html")}`;

const paletteNames = [
  "Classic Sand",         // 0
  "Warm Terracotta",      // 1
  "Deep Oceanic",         // 2
  "Autumn Red",           // 3
  "Monochrome Orange",    // 4
  "Ocean Sunset",         // 5
  "Golden Bronze",        // 6
  "Teal Harmony",         // 7
  "Forest Olive",         // 8
  "Sage Muted Emerald",   // 9
  "Sand Teal Accent",     // 10
  "Industrial Sunset"     // 11
];

const artModeDisplayNames = {
  circle: "Circular Arc",
  l: "Linework",
  paper: "Textured Paper",
  straight: "Mechanical Straight"
};

async function main() {
    const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    const metadata = JSON.parse(fs.readFileSync(META_PATH, "utf8"));
    console.log(`Extracting traits for ${seeds.length} seeds via Puppeteer...`);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const allTraits = [];

    for (let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        const index = i + 1;
        const meta = metadata[String(seed)] || {};

        await page.evaluateOnNewDocument((injectedSeed) => {
            window.HASH = Number(injectedSeed);
        }, seed);

        await page.goto(HTML_PATH);

        try {
            await page.waitForFunction(() => window.traits && window.traits["Palette"] !== undefined, { timeout: 5000 });
        } catch (e) {
            console.warn(`Timeout waiting for traits on seed ${seed}`);
        }

        const rawTraits = await page.evaluate(() => window.traits || {});

        const paletteIdx = rawTraits["Palette"] !== undefined ? Number(rawTraits["Palette"]) : Number(meta.palette || 0);
        const paletteName = paletteNames[paletteIdx] || `Palette ${paletteIdx}`;

        let artModeRaw = rawTraits["Art Mode"] || meta.artMode || "paper";
        const artMode = artModeDisplayNames[artModeRaw] || artModeRaw || "Standard";

        const position = meta.position || "center";
        const gearLayout = rawTraits["Gear Layout Mode"] || "Layout 1";

        allTraits.push({
            inscriptionId: String(index),
            seed: Number(seed),
            traits: {
                "Palette": paletteName,
                "Art Mode": artMode,
                "Position": position,
                "Gear Layout Mode": gearLayout
            }
        });

        if ((i + 1) % 50 === 0 || i === seeds.length - 1) {
            console.log(`Processed ${i + 1}/${seeds.length} seeds...`);
        }
    }

    await browser.close();

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allTraits, null, 2));
    fs.writeFileSync(OUTPUT_PATH_V2, JSON.stringify(allTraits, null, 2));
    console.log(`🎉 Successfully generated traits with Gear Layout Mode for all 456 seeds!`);
}

main().catch(console.error);
