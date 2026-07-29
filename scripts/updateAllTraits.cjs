const fs = require('fs');
const path = require('path');

const SEEDS_PATH = path.join(__dirname, "../public/motor/curated-seeds.json");
const META_PATH = path.join(__dirname, "../public/motor/seeds-metadata.json");
const OUT_PATH_V2 = path.join(__dirname, "../public/all-traits-v2.json");
const OUT_PATH_V1 = path.join(__dirname, "../public/all-traits.json");

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

const seeds = JSON.parse(fs.readFileSync(SEEDS_PATH, "utf8"));
const metadata = JSON.parse(fs.readFileSync(META_PATH, "utf8"));

const allTraits = [];

for (let i = 0; i < seeds.length; i++) {
  const seed = seeds[i];
  const index = i + 1;
  const meta = metadata[String(seed)] || {};

  const paletteIdx = Number(meta.palette !== undefined ? meta.palette : 0);
  const paletteName = paletteNames[paletteIdx] || `Palette ${paletteIdx}`;
  const artMode = artModeDisplayNames[meta.artMode] || meta.artMode || "Standard";
  const position = meta.position || "center";

  allTraits.push({
    inscriptionId: String(index),
    seed: Number(seed),
    traits: {
      "Palette": paletteName,
      "Art Mode": artMode,
      "Position": position
    }
  });
}

fs.writeFileSync(OUT_PATH_V2, JSON.stringify(allTraits, null, 2));
fs.writeFileSync(OUT_PATH_V1, JSON.stringify(allTraits, null, 2));

console.log(`✅ Generated all-traits JSON for ${allTraits.length} seeds!`);
