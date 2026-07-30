const fs = require('fs');
const path = require('path');

const TRAITS_PATH = path.join(__dirname, "../public/all-traits.json");
const META_PATH_1 = path.join(__dirname, "../public/motor/seeds-metadata.json");
const META_PATH_2 = path.join(__dirname, "../../motor/seeds-metadata.json");

const traitsData = JSON.parse(fs.readFileSync(TRAITS_PATH, 'utf8'));
const metaData1 = JSON.parse(fs.readFileSync(META_PATH_1, 'utf8'));
const metaData2 = fs.existsSync(META_PATH_2) ? JSON.parse(fs.readFileSync(META_PATH_2, 'utf8')) : null;

traitsData.forEach(item => {
    const seedStr = String(item.seed);
    const gearLayout = item.traits ? item.traits["Gear Layout Mode"] : undefined;

    if (metaData1[seedStr]) {
        metaData1[seedStr].gearLayoutMode = gearLayout;
    }
    if (metaData2 && metaData2[seedStr]) {
        metaData2[seedStr].gearLayoutMode = gearLayout;
    }
});

fs.writeFileSync(META_PATH_1, JSON.stringify(metaData1, null, 2));
console.log(`Updated ${META_PATH_1} with gearLayoutMode`);

if (metaData2) {
    fs.writeFileSync(META_PATH_2, JSON.stringify(metaData2, null, 2));
    console.log(`Updated ${META_PATH_2} with gearLayoutMode`);
}
