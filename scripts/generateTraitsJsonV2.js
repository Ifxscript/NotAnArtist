import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEEDS_PATH = path.join(__dirname, "../src/curated_seeds_v2.json");
const OUTPUT_PATH = path.join(__dirname, "../public/all-traits-v2.json");
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

async function main() {
    if (!fs.existsSync(SEEDS_PATH)) {
        console.error("Error: curated_seeds_v2.json not found!");
        process.exit(1);
    }

    const curated = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
    console.log(`Extracting dynamic engine traits for ${curated.length} V2 seeds...`);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const allTraits = [];

    for (let i = 0; i < curated.length; i++) {
        const item = curated[i];
        const seed = item.seed;
        const index = item.index;

        await page.evaluateOnNewDocument((injectedSeed) => {
            window.HASH = Number(injectedSeed);
        }, seed);

        await page.goto(HTML_PATH);

        // Wait for setup() to complete and populate window.traits
        await page.waitForFunction(() => window.traits && window.traits["Palette"] !== undefined, { timeout: 5000 });

        const rawTraits = await page.evaluate(() => window.traits);

        const paletteIdx = Number(rawTraits["Palette"]);
        const paletteName = paletteNames[paletteIdx] || `Palette ${paletteIdx}`;

        let artMode = rawTraits["Art Mode"] || "Standard";
        if (artMode === "circle") artMode = "Circular Arc";
        if (artMode === "l") artMode = "Linework";
        if (artMode === "paper") artMode = "Textured Paper";
        if (artMode === "straight") artMode = "Mechanical Straight";

        const gearLayout = rawTraits["Gear Layout Mode"] || item.traits["Gear Layout Mode"] || "Layout 1";

        allTraits.push({
            inscriptionId: String(index),
            seed: Number(seed),
            traits: {
                "Palette": paletteName,
                "Art Mode": artMode,
                "Gear Layout Mode": gearLayout
            }
        });

        if ((i + 1) % 50 === 0 || i === curated.length - 1) {
            console.log(`Processed ${i + 1}/${curated.length} seeds...`);
        }
    }

    await browser.close();

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allTraits, null, 2));
    console.log(`🎉 Successfully generated 100% accurate dynamic traits in ${OUTPUT_PATH}`);
}

main().catch(console.error);
