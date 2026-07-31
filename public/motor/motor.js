let gearsArr = [];
let belts = [];
let arms = [];
let piping;
let pistons = [];

let machiningShader;
let shaderBuffer;
let bufferCanvas;
let artLayer;
let topt;
let sopt;
let spt;

let pipingBuffer;
let maxLayer = 0;
let layerGears = {};
let layerBelts = {};
let layerArms = {};
let layerPistons = {};
let pangle = 0;
let isAnimating = true;
let artLayerCache;
let isArtBaking = false;
let globalBandDepth;
let tth = 3.3;
let nR = 20;

const LAYER_BAND = 6;
const CONNECTOR_LAYER = LAYER_BAND * 6;
const OVERLAY_BAND = 7;
const STRAIGHT_ARC_LENGTH = 1800;

let colorPalettes = [
    ['#BFBAA8', '#D9D3C1', '#575243', '#DED9C7', '#736B5C'],
    ['#BFBAA8', '#9F8170', '#575243', '#29AB87', '#736B5C'],
    ['#F2E6D0', '#0DB3D9', '#D96A29', '#e3d4baff', '#11796D'],
    ['#F2EBDC', '#d2aa26', '#BF3C30', '#BFB9AE', '#262626'],
    ['#BFBFBF', '#D96A29', '#11796D', ' #A3A68D', '#0D0D0D',],
    ['#e3d4baff', '#D96A29', '#11796D', ' #A3A68D', '#0F3759'],
    ["#C8AD26", "#d2aa26", "#AA9320", "#615412", "#534810"],
    ['#1DCEB9', '#159586', '#11796D', '#0D5D54', '#09403A'],
    ['#d9a336', '#25241fff', '#607049', '#255c3e', '#bf7f24',],
    ['#B2BEB5', '#98817B', '#EAE0C8', '#868F88', '#11796D'],
    ['#BFC1AF', '#D9C091', '#CB6844', '#A3A68D', '#007BA7'],
    ['#D2C0B0', '#d9a336', '#11796D', '#746A61', '#0F3759']

];

function setup() {
    // Use ?seed= URL parameter, injected window.HASH, or fallback to a random integer
    let urlParams = new URLSearchParams(window.location.search);
    let seedParam = urlParams.get('seed');
    let seed = seedParam ? parseInt(seedParam, 10) : (window.HASH || Math.floor(Math.random() * 999999999));
    randomSeed(seed);   // makes random() deterministic per token
    noiseSeed(seed);    // makes noise() deterministic per token

    // Initialize traits object to capture what we generate
    window.traits = {};

    // Burn a few random numbers to fix p5.js seeded random bias
    // This ensures the first real random() call (palette selection) is evenly distributed
    random(); random(); random(); random(); random();
    // ─────────────────────────────────────────────────────────────────────

    col = random(colorPalettes);
    document.body.style.backgroundColor = col[0];
    window.traits["Palette"] = colorPalettes.indexOf(col);

    let tintOptions = ['tinted', 'notTinted'];
    tintMode = tintOptions[0];
    window.traits["Tint"] = tintMode;
    // Set mobile canvas resolution to 1.5x for crisp visuals + 60 FPS performance
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        pixelDensity(1.5);
    }
    let cvs = createCanvas(windowHeight * 0.675, windowHeight * 0.9);
    cvs.style('box-shadow', '0 0 5px rgba(0, 0, 0, 1)');
    cvs.style('border-radius', '10px');
    cvs.elt.addEventListener('pointerdown', (e) => {
        isAnimating = !isAnimating;
        if (isAnimating) loop();
        else noLoop();
    });

    rectMode(CENTER);
    let ap = [45, 90, 135, 180, 225, 270, 315, 0]
    pangle = random(ap);

    spt = getSoptPositions();
    let opt = getOptPositions();
    sopt = random(spt);

    topt = random(opt);

    shaderBuffer = createGraphics(400, 400, WEBGL);
    machiningShader = shaderBuffer.createShader(VERT_SHADER, FRAG_SHADER);
    bufferCanvas = createGraphics(width, height);
    let config = getArtConfig(topt);
    let chosenMode = config.chosenMode;
    window.traits["Art Mode"] = chosenMode;
    tth = config.tth;
    nR = config.nR;

    // Define custom art layer rows
    artLayer = buildArtLayer(nR, tth, chosenMode, col);

    let x = width / 2;
    let y = height / 2;

    // Build the gear layout — pass bandOffset to stack multiple layouts without layer conflicts
    let engine = buildEngineSystem(x, y, col, height / 1000);
    layout = engine.layout;
    piping = engine.piping;
    gearsArr = engine.gearsArr;
    belts = engine.belts;
    arms = engine.arms;
    pistons = engine.pistons;
    sets = engine.sets;
    maxLayer = engine.maxLayer;

    // --- BAKE THE ART LAYER BACKGROUND ---
    isArtBaking = true;
    clear();
    if (artLayer.drawMode === 'paper') {
        push();
        artLayer.display(0, 0, width);
        pop();
    } else if (artLayer.drawMode === 'circle') {
        push();
        translate(topt.x, topt.y);
        artLayer.display(width * 0.5, height * 0.5, min(width, height) * 0.45);
        pop();
    } else if (artLayer.drawMode === 'l') {
        push();
        if (!globalBandDepth) globalBandDepth = random([0.5, 0.65]);
        let bandDepth = min(width, height) * globalBandDepth;
        artLayer.display(width * 0.5, height * 0.5, bandDepth / tth);
        pop();
    } else {
        let r = min(width, height) * 0.5;
        let cx = width - r;
        let cy = height * 0.5;
        push();
        translate(sopt.x, sopt.y);
        translate(cx, cy);
        rotate(radians(sopt.a));
        translate(-cx, -cy);
        artLayer.display(cx, cy, r);
        pop();
    }
    artLayerCache = get();
    isArtBaking = false;
    // -------------------------------------
}
function draw() {
    background(col[0]);
    push()
    stroke(col[3]);
    strokeWeight(2);
    for (let y = 9; y < height; y += 15) {
        for (let x = 7; x < width; x += 15) {
            point(x, y);
        }
    }
    pop();
    layout.update();

    for (let layer = 0; layer <= layout.maxLayer; layer++) {
        layout.displayLayer(layer, piping);
    }

    // Stamp the pre-baked background
    imageMode(CORNER);
    image(artLayerCache, 0, 0, width, height);

    // Top art layer (replaces previous cover layer)
    if (artLayer.drawMode === 'paper') {
        // paper mode draws from canvas origin — no outer transforms
        push()
        artLayer.display(0, 0, width);
        pop()
    } else if (artLayer.drawMode === 'circle') {
        push();
        let tcx = topt.x;
        let tcy = topt.y;
        translate(tcx, tcy);
        artLayer.display(width * 0.5, height * 0.5, min(width, height) * 0.45);
        pop();
    } else if (artLayer.drawMode === 'l') {
        push();
        let bandDepth = min(width, height) * (globalBandDepth || 0.5);
        artLayer.display(width * 0.5, height * 0.5, bandDepth / tth);
        pop();
    } else {
        let r = min(width, height) * 0.5;
        let cx = width - r;
        let cy = height * 0.5;
        push();
        let scx = sopt.x
        let scy = sopt.y
        let sa = sopt.a;
        translate(scx, scy);
        translate(cx, cy);
        rotate(radians(sa));
        translate(-cx, -cy);
        artLayer.display(cx, cy, r);
        pop();
    }

    // Palette Color Grade Overlay (Conditional Tint)
    push();
    blendMode(OVERLAY);
    let tintCol = color(0, 40);
    fill(tintCol);
    noStroke();
    rectMode(CORNER);
    rect(0, 0, width, height);
    pop();
    blendMode(BLEND);

    // Canvas border frame
    stroke(col[3]);
    strokeWeight(width * 0.069);
    noFill();
    rectMode(CORNER);
    rect(0, 0, width, height);

    // Signal that first frame is ready for gallery capture
    if (!window._firstFrameDrawn) window._firstFrameDrawn = true;
}
class Bolt {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.r = options.r || 10;
        this.a = options.a || 0;
        this.c = options.c || "#3c321e";
    }

    display(pg) {
        pg.push();
        pg.translate(this.x, this.y);
        pg.rotate(this.a);

        // 1. Draw the "Well" (the recessed hole in the gear)
        pg.fill(0, 0, 0, 60);
        pg.noStroke();
        pg.circle(0, 1, this.r * 2.4); // Subtle bottom shadow
        pg.fill(40, 35, 25, 120);
        pg.circle(0, 0, this.r * 2.2);

        // 2. Draw the metallic head body
        pg.fill(this.c);
        pg.circle(0, 0, this.r * 2);

        // 3. Add 3D Metallic Highlights
        pg.noFill();
        pg.strokeWeight(1.5);
        pg.stroke(255, 255, 255, 150); // Top-left highlight
        pg.arc(0, 0, this.r * 1.8, this.r * 1.8, PI + QUARTER_PI, TWO_PI);
        pg.stroke(0, 0, 0, 80); // Bottom-right shadow
        pg.arc(0, 0, this.r * 1.8, this.r * 1.8, QUARTER_PI, PI - QUARTER_PI);

        // 4. Hex Driver Cutout
        pg.fill(20, 15, 10, 180);
        pg.noStroke();
        pg.beginShape();
        for (let i = 0; i < 6; i++) {
            let ang = i * TWO_PI / 6;
            pg.vertex(cos(ang) * this.r * 0.6, sin(ang) * this.r * 0.6);
        }
        pg.endShape(CLOSE);

        pg.pop();
    }
}
class Gear {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;

        // Basic Gear Properties
        this.a = options.a || 0;
        this.c = options.c || 150;

        // Treat options.r directly as a dynamic scale factor multiplier (e.g. 0.5 for half size)
        this.scale = options.r !== undefined ? options.r : 0.583;

        // Establish a fixed high-res reference radius for crisp offscreen rendering
        this.renderR = 60;

        // Temporarily set this.r to the reference radius so ALL drawing routines 
        // inside renderMachined(), cutout functions, and bolts automatically use 60
        this.r = this.renderR;

        this.speed = options.speed || -0.02;
        this.e = options.e || 0.5;
        this.layer = options.layer !== undefined ? options.layer : 0;
        this.style = options.style !== undefined ? options.style : "ix-1";
        this.noTeeth = options.noTeeth || false; // Wheel mode

        // Tooth profile parameters (rendered at fixed high-res)
        this.toothHB = 0;
        this.toothHT = min(this.renderR * 0.7, this.renderR * 0.1 / this.scale);
        this.toothB = -0.05;

        // Plate Properties (Nested)
        let pc = options.plate || {};
        this.hasPlate = pc.enabled || false;
        this.sectorAngle = radians(pc.angle !== undefined ? pc.angle : 180);
        this.sectorSize = radians(pc.size !== undefined ? pc.size : 90);
        this.plateColor = pc.color || color(30, 25, 20);

        // Bolt Properties (Nested)
        let bc = options.bolt || {};
        this.centerBolt = new Bolt(0, 0, {
            r: bc.r || this.renderR * 0.15,
            style: bc.style || 1,
            c: bc.c || this.c, // Inherit gear color by default
            a: bc.a !== undefined ? bc.a : random(TWO_PI)
        });

        // Plate Fasteners (Stationary mounting screws)
        this.plateBolts = [];
        if (this.hasPlate) {
            let rb = this.renderR + this.toothHT + 1.5; // Moved bolts slightly outwards
            let ang1 = this.sectorAngle + 0.15;
            let ang2 = this.sectorAngle + this.sectorSize - 0.15;
            this.plateBolts.push(new Bolt(cos(ang1) * rb, sin(ang1) * rb, { r: 3.5, style: 1, c: this.c }));
            this.plateBolts.push(new Bolt(cos(ang2) * rb, sin(ang2) * rb, { r: 3.5, style: 1, c: this.c }));
        }

        // Offscreen Buffers (sized to reference radius renderR for high-res crispness)
        this.pg = createGraphics(this.renderR * 3 + 20, this.renderR * 3 + 20);
        this.pg.rectMode(CENTER);
        this.shadowPg = createGraphics(this.renderR * 3 + 20, this.renderR * 3 + 20);
        this.shadowPg.rectMode(CENTER);
        this.machinedPg = createGraphics(this.renderR * 3 + 20, this.renderR * 3 + 20);

        this.renderMachined();
        this._renderBoss();

        if (this.hasPlate) {
            this.renderPlateMachined();
        }

        // Now assign this.r to the actual dynamic fluid screen radius (width/5 * scale)
        let baseR = (typeof width !== 'undefined' && width > 0) ? (width / 5) : 60;
        this.r = baseR * this.scale;
    }

    _renderBoss() {
        let archR = this.renderR * 0.28;
        let size = ceil(archR * 2 + 14); // margin for shadow offset + outline
        this.bossPg = createGraphics(size, size);
        let cx = size / 2, cy = size / 2;

        let bossCol = color(this.c);
        let bRed = red(bossCol), bGreen = green(bossCol), bBlue = blue(bossCol);
        let darkB = color(bRed * 0.4, bGreen * 0.4, bBlue * 0.4);
        let lightB = color(min(255, bRed + 40), min(255, bGreen + 40), min(255, bBlue + 40));

        this.bossPg.push();
        this.bossPg.translate(cx, cy);
        this.bossPg.noStroke();

        // Shadow
        this.bossPg.fill(20, 15, 10, 110);
        this.bossPg.circle(3, 3, archR * 2);

        // Gradient — runs once at construction, never again
        for (let r = archR; r >= 0; r -= 0.5) {
            let t = map(r, 0, archR, 1, 0);
            this.bossPg.fill(lerpColor(darkB, lightB, t));
            this.bossPg.circle(0, 0, r * 2);
        }

        // Outline
        this.bossPg.noFill();
        this.bossPg.stroke(5, 4, 3);
        this.bossPg.strokeWeight(1);
        this.bossPg.circle(0, 0, archR * 2);
        this.bossPg.pop();
    }

    renderPlateMachined() {
        let rInner = this.r * 0.25;
        let rOuter = this.r + this.toothHT + 7; // Increased radius to completely hide teeth

        let s = rOuter * 2 + 10;
        let pg = createGraphics(s, s);
        pg.translate(s / 2, s / 2);

        pg.noStroke();
        pg.fill(this.plateColor);
        pg.beginShape();
        // Outer arc
        for (let a = 0; a <= this.sectorSize; a += 0.05) {
            pg.vertex(cos(a + this.sectorAngle) * rOuter, sin(a + this.sectorAngle) * rOuter);
        }
        // Inner arc (winding back)
        for (let a = this.sectorSize; a >= 0; a -= 0.05) {
            pg.vertex(cos(a + this.sectorAngle) * rInner, sin(a + this.sectorAngle) * rInner);
        }
        pg.endShape(CLOSE);

        // Stationary central hub for the plate
        pg.circle(0, 0, rInner * 2.2);

        // Apply Shader
        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", pg);
        machiningShader.setUniform("amt", 0.22);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        this.platePg = createGraphics(s, s);
        this.platePg.drawingContext.shadowOffsetX = 3;
        this.platePg.drawingContext.shadowOffsetY = 3;
        this.platePg.drawingContext.shadowBlur = 10;
        this.platePg.drawingContext.shadowColor = 'rgba(20, 15, 10, 0.8)';
        this.platePg.image(shaderBuffer, 0, 0, s, s);
        this.platePg.drawingContext.shadowColor = 'rgba(0,0,0,0)';
        pg.remove();
    }

    renderMachined() {
        // 1. Render the FLAT gear to this.pg at angle 0
        let g = this.pg;
        g.clear();
        let cx = g.width / 2;
        let cy = g.height / 2;

        g.push();
        g.translate(cx, cy);
        g.noStroke();
        g.fill(this.c);

        if (this.noTeeth) {
            g.beginShape();
            for (let a = 0; a < TWO_PI; a += 0.05) {
                g.vertex(this.r * cos(a), this.r * sin(a));
            }
            this.applyHolePattern(g, 0); // Use 0 for static pattern
            g.endShape(CLOSE);
        } else {
            let numTeeth = max(6, floor(48 * this.scale));
            g.beginShape();
            const pts = [0.0, 0.2, 0.4, 0.6, 1.0];
            const rads = [this.r - this.toothHB, this.r + this.toothHT, this.r + this.toothHT, this.r - this.toothHB, this.r - this.toothHB];
            for (let j = 0; j < numTeeth; j++) {
                let angBase = TWO_PI * j / numTeeth;
                for (let k = 0; k < 5; k++) {
                    let a = angBase + (pts[k] + this.toothB) * TWO_PI / numTeeth;
                    g.vertex(rads[k] * cos(a), rads[k] * sin(a));
                }
            }
            this.applyHolePattern(g, 0); // Static angle 0
            g.endShape(CLOSE);
        }

        // Decorative rings (static)
        this.drawDecorativeRings(g);
        this.centerBolt.display(g);
        g.pop();

        // 2. APPLY SHADER
        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", g);
        machiningShader.setUniform("amt", 0.20);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        // Map the rectangular pg to the square shader rect
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        // 3. COPY BACK — bake drop shadow once so display() needs no per-frame drawingContext blur
        this.machinedPg.clear();
        this.machinedPg.drawingContext.shadowOffsetX = 5;
        this.machinedPg.drawingContext.shadowOffsetY = 5;
        this.machinedPg.drawingContext.shadowBlur = 10;
        this.machinedPg.drawingContext.shadowColor = 'rgba(20, 15, 10, 0.5)';
        this.machinedPg.image(shaderBuffer, 0, 0, this.machinedPg.width, this.machinedPg.height);
        this.machinedPg.drawingContext.shadowColor = 'rgba(0,0,0,0)';
    }

    vx(pg, a, t, div) {
        const x = cos(a) * (t / div);
        const y = sin(a) * (t / div);
        pg.vertex(x, y);
    }

    applyHolePattern(pg, angle = 0) {
        let styleNum = parseInt(this.style) || 0;
        const cats = ["iv", "v", "vi"];
        let category = cats[Math.floor(styleNum / 4) % cats.length];
        let presetIdx = (styleNum % 4) + 1;

        if (this[category]) this[category](pg, this.r, presetIdx, angle);
    }

    iv(pg, t, p, angle = 0) {
        const i = 4 + p * 2;
        const o = p === 1 ? 1.1 : 1.15;
        const r = TWO_PI / i;
        for (let n = i; n > 0; n -= 2) {
            pg.beginContour();
            this.vx(pg, (n - 0.4) * r + angle, t, o);
            this.vx(pg, (n + 0.5) * r + angle, t, 6);
            for (let s = 1; s > 0; s -= 0.2) this.vx(pg, (n + s + 0.4) * r + angle, t, o);
            pg.endContour(CLOSE);
        }
    }

    v(pg, t, p, angle = 0) {
        const step = TWO_PI / 20;
        const rCount = p === 1 ? 0 : 3 + p;
        const o = 10;
        const nStep = TWO_PI / rCount;
        for (let s = 0; s < rCount; s++) {
            const c = s * nStep + angle;
            pg.beginContour();
            for (let d = 20; d > 0; d -= 1) {
                const g = d * step;
                const x = (cos(g) * t) / o + (cos(c) * t) / 1.25;
                const y = (sin(g) * t) / o + (sin(c) * t) / 1.25;
                pg.vertex(x, y);
            }
            pg.endContour(CLOSE);
        }
    }

    vi(pg, t, p, angle = 0) {
        const i = p === 4 ? 104 : p * 6;
        const o = 1.2;
        const r = TWO_PI / i;
        for (let n = i; n > 0; n -= 2) {
            pg.beginContour();
            this.vx(pg, n * r + angle, t, o);
            this.vx(pg, n * r + angle, t, 6);
            this.vx(pg, (n + 1) * r + angle, t, 6);
            for (let s = 1; s > 0; s -= 0.2) this.vx(pg, (n + s) * r + angle, t, o);
            pg.endContour(CLOSE);
        }
    }

    // The true "ve()" logic from gears.js
    drawDecorativeRings(pg) {
        pg.push();
        let t = this.r - (this.r * 0.1); // Base radius for rings

        // Always draw 2-3 rings for variety
        let numRings = 2;
        let ringRadii = [0.85, 1.25]; // Standard decorative positions

        for (let i = 0; i < numRings; i++) {
            const rFact = ringRadii[i];
            pg.noFill();

            // Derive colors from gear color
            let gearCol = color(this.c);
            let r = red(gearCol), g = green(gearCol), b = blue(gearCol);

            // 1. Dark Outline Stroke (darker version of gear color)
            pg.strokeWeight(t / 20);
            pg.stroke(r * 0.4, g * 0.4, b * 0.4, 100);
            pg.circle(0, 0, t * rFact);

            // 2. Vibrant Highlight Stroke (lighter version of gear color)
            pg.strokeWeight(t / 25);
            pg.stroke(min(255, r * 1.3), min(255, g * 1.3), min(255, b * 1.3), 150);
            pg.circle(0, 0, t * rFact);
        }
        pg.pop();
    }

    // Stationary Sector Plate: A non-rotating cover
    drawSectorPlate() {
        let drawR = this.r;
        let scaleRatio = drawR / this.renderR;

        let rOuter = this.renderR + this.toothHT + 7;
        let s = rOuter * 2 + 10;
        let drawS = s * scaleRatio;

        push();
        translate(this.x, this.y);

        // Draw the pre-baked stationary plate
        imageMode(CENTER);
        image(this.platePg, 0, 0, drawS, drawS);

        // Draw the mounting screws for the plate, scaled down
        for (let b of this.plateBolts) {
            push();
            scale(scaleRatio);
            b.display(window);
            pop();
        }

        pop();
    }

    update() {
        this.a += this.speed;
    }



    display() {
        let drawR = this.r; // Dynamic screen radius
        let scaleRatio = drawR / this.renderR;

        let drawW = (this.renderR * 3 + 20) * scaleRatio;
        let drawH = (this.renderR * 3 + 20) * scaleRatio;

        push();
        translate(this.x, this.y);

        // Boss Collar — pre-rendered buffer, single blit per gear per frame
        push();
        let bossSize = this.bossPg.width * scaleRatio;
        imageMode(CENTER);
        image(this.bossPg, 0, 0, bossSize, bossSize);
        pop();

        rotate(this.a);
        image(this.machinedPg, -drawW / 2, -drawH / 2, drawW, drawH);
        pop();

        // Only draw the stationary sector plate if enabled
        if (this.hasPlate) {
            this.drawSectorPlate();
        }
    }
}
class Belt {
    constructor(gears, layer = 0, speed = 1.5, style = 'chain', c = null) {
        this.gears = gears; // Array of {gear: Gear, cw: boolean} or raw Gear objects
        this.layer = layer;
        this.speed = speed;
        this.style = style; // 'chain' or 'rubber'
        this.offset = 0;
        this.c = c; // Base color for the chain links (null = default steel)
        // Dynamic properties (initially set for reference width of 300)
        // this.linkWidth = 7.5;
        // this.linkHeight = 3.5;
        // this.linkSpacing = 6;
        // this.linkRadius = 20;

        // Pre-compute derived colors once (avoids per-link color() calls)
        this._colorsComputed = false;

        // Cache offscreen graphics (even/odd plate link textures)
        this._evenLinkPg = null;
        this._oddLinkPg = null;
        this._lastWRef = null;

        // Cache path geometry to avoid solving tangents twice per frame
        this._path = null;
    }

    _computeColors() {
        if (this._colorsComputed) return;
        this._colorsComputed = true;

        if (this.c) {
            let c = color(this.c);
            let r = red(c), g = green(c), b = blue(c);
            this._darkR = r * 0.28; this._darkG = g * 0.28; this._darkB = b * 0.28;
            this._mainR = r * 0.55; this._mainG = g * 0.55; this._mainB = b * 0.55;
            this._coreR = r * 0.55; this._coreG = g * 0.55; this._coreB = b * 0.55;
            this._cordR = min(255, r * 1.3); this._cordG = min(255, g * 1.3); this._cordB = min(255, b * 1.3);
        } else {
            this._darkR = this._darkG = this._darkB = 70;
            this._mainR = 38; this._mainG = 41; this._mainB = 44;
            this._coreR = 38; this._coreG = 41; this._coreB = 44;
            this._cordR = 91; this._cordG = 97; this._cordB = 104;
        }
    }

    drawLink(x, y, ang, _pinSpacing = this.linkSpacing, isEven = true) {
        push();
        translate(x, y);
        rotate(ang);
        imageMode(CENTER);
        image(isEven ? this._evenLinkPg : this._oddLinkPg, 0, 0);
        pop();
    }

    _renderLinkPgs(wRef) {
        this._lastWRef = wRef;

        let halfGap = wRef * 0.015;
        let outerRadius = halfGap * 0.77;
        let holeRadius = halfGap * 0.33;
        let waist = halfGap * 0.43;
        let innerX = halfGap - outerRadius * 0.58;
        let k = 0.5522847498;

        let pad = 3;
        let pgW = ceil(2 * (halfGap + outerRadius) + pad * 2);
        let pgH = ceil(2 * outerRadius + pad * 2);
        let cx = pgW / 2, cy = pgH / 2;

        let makeBuffer = (plateCol) => {
            let pg = createGraphics(pgW, pgH);
            pg.pixelDensity(pixelDensity());
            pg.clear();

            let r0 = red(plateCol), g0 = green(plateCol), b0 = blue(plateCol);

            // Clip to dogbone shape
            let dc = pg.drawingContext;
            dc.save();
            dc.beginPath();
            dc.moveTo(cx - halfGap, cy - outerRadius);
            dc.bezierCurveTo(cx - halfGap - outerRadius * k, cy - outerRadius, cx - halfGap - outerRadius, cy - outerRadius * k, cx - halfGap - outerRadius, cy);
            dc.bezierCurveTo(cx - halfGap - outerRadius, cy + outerRadius * k, cx - halfGap - outerRadius * k, cy + outerRadius, cx - halfGap, cy + outerRadius);
            dc.bezierCurveTo(cx - innerX, cy + outerRadius, cx - innerX, cy + waist, cx, cy + waist);
            dc.bezierCurveTo(cx + innerX, cy + waist, cx + innerX, cy + outerRadius, cx + halfGap, cy + outerRadius);
            dc.bezierCurveTo(cx + halfGap + outerRadius * k, cy + outerRadius, cx + halfGap + outerRadius, cy + outerRadius * k, cx + halfGap + outerRadius, cy);
            dc.bezierCurveTo(cx + halfGap + outerRadius, cy - outerRadius * k, cx + halfGap + outerRadius * k, cy - outerRadius, cx + halfGap, cy - outerRadius);
            dc.bezierCurveTo(cx + innerX, cy - outerRadius, cx + innerX, cy - waist, cx, cy - waist);
            dc.bezierCurveTo(cx - innerX, cy - waist, cx - innerX, cy - outerRadius, cx - halfGap, cy - outerRadius);
            dc.closePath();
            dc.clip();

            // Solid base fill
            pg.noStroke();
            pg.fill(plateCol);
            pg.rect(0, 0, pgW, pgH);

            // Paper scanlines — noise for xSplit so texture is stable across frames
            pg.strokeCap(SQUARE);
            let fullX = halfGap + outerRadius;
            for (let sy = cy - outerRadius; sy < cy + outerRadius; sy += 0.1) {
                let t = (sy - cy) / (outerRadius * 2);
                let n = noise(t + 10);
                let xSplit = cx + (noise(t * 3 + 50) * 2 - 1) * fullX;
                pg.strokeWeight(0.1);
                pg.stroke(r0 - 30 * n, g0 - 30 * n, b0 - 30 * n);
                pg.line(cx - fullX, sy, xSplit, sy);
                pg.stroke(min(255, r0 + 10 * (1 - n)), min(255, g0 + 10 * (1 - n)), min(255, b0 + 5 * (1 - n)));
                pg.line(xSplit, sy, cx + fullX, sy);
            }

            dc.restore();

            // Dogbone outline stroke on top of texture
            pg.noFill();
            pg.stroke(this._darkR, this._darkG, this._darkB);
            pg.strokeWeight(1.25);
            this._drawDogBoneOnPg(pg, cx, cy, halfGap, outerRadius, waist);

            // Pin holes
            pg.noStroke();
            pg.fill(this._darkR, this._darkG, this._darkB);
            pg.circle(cx - halfGap, cy, holeRadius * 2);
            pg.circle(cx + halfGap, cy, holeRadius * 2);

            return pg;
        };

        let evenCol = color(this._darkR, this._darkG, this._darkB);
        let oddCol = this.c ? color(this.c) : color(150);

        if (this._evenLinkPg) this._evenLinkPg.remove();
        if (this._oddLinkPg) this._oddLinkPg.remove();
        this._evenLinkPg = makeBuffer(evenCol);
        this._oddLinkPg = makeBuffer(oddCol);
    }

    _drawDogBoneOnPg(pg, x, y, halfGap, endR, waist) {
        let k = 0.5522847498;
        let innerX = halfGap - endR * 0.58;
        pg.beginShape();
        pg.vertex(x - halfGap, y - endR);
        pg.bezierVertex(x - halfGap - endR * k, y - endR, x - halfGap - endR, y - endR * k, x - halfGap - endR, y);
        pg.bezierVertex(x - halfGap - endR, y + endR * k, x - halfGap - endR * k, y + endR, x - halfGap, y + endR);
        pg.bezierVertex(x - innerX, y + endR, x - innerX, y + waist, x, y + waist);
        pg.bezierVertex(x + innerX, y + waist, x + innerX, y + endR, x + halfGap, y + endR);
        pg.bezierVertex(x + halfGap + endR * k, y + endR, x + halfGap + endR, y + endR * k, x + halfGap + endR, y);
        pg.bezierVertex(x + halfGap + endR, y - endR * k, x + halfGap + endR * k, y - endR, x + halfGap, y - endR);
        pg.bezierVertex(x + innerX, y - endR, x + innerX, y - waist, x, y - waist);
        pg.bezierVertex(x - innerX, y - waist, x - innerX, y - endR, x - halfGap, y - endR);
        pg.endShape(CLOSE);
    }



    // Single source of truth: the full belt loop as one continuous, ordered
    // list of points (arc-wrap on each gear + tangent line to the next gear).
    // Arc end and line start are the SAME point (pCurr.p1), so there is no seam.
    _loopPoints(sample = 0.2) {
        let points = [];
        let n = this.gears.length;
        if (n < 2 || !this._path) return points;

        // Global winding of the gear-center polygon (shoelace). Every arc sweeps in
        // this ONE direction so the path can never fold back into a cusp.
        let area = 0;
        for (let i = 0; i < n; i++) {
            let a = this.gears[i].gear || this.gears[i];
            let b = this.gears[(i + 1) % n].gear || this.gears[(i + 1) % n];
            area += a.x * b.y - b.x * a.y;
        }
        let wind = area >= 0 ? 1 : -1;   // +1 = increasing-angle sweep, -1 = decreasing

        for (let i = 0; i < n; i++) {
            let pPrev = this._path[(i + n - 1) % n], pCurr = this._path[i];
            let o = this.gears[i], g = o.gear || o;
            let cw = o.cw !== undefined ? o.cw : true;
            let r = g.noTeeth ? g.r * 1.03 : g.r + width / 50;

            if (!pPrev || !pCurr) continue;

            // Arc wrap: pPrev.entryA → pCurr.exitA. Normal gears sweep in the global
            // winding dir; a cw:false gear is wrapped on the OPPOSITE side (reverse
            // idler), so its arc sweeps the other way.
            let dir = cw ? wind : -wind;
            let startA = pPrev.entryA, endA = pCurr.exitA;
            let sweep = endA - startA;
            if (dir > 0) { while (sweep < 0) sweep += TWO_PI; while (sweep >= TWO_PI) sweep -= TWO_PI; }
            else { while (sweep > 0) sweep -= TWO_PI; while (sweep <= -TWO_PI) sweep += TWO_PI; }

            let steps = max(8, ceil((abs(sweep) * r) / (this.linkSpacing * sample)));
            for (let j = 0; j <= steps; j++) {
                let a = startA + sweep * (j / steps);
                points.push(createVector(g.x + cos(a) * r, g.y + sin(a) * r));
            }

            // Tangent line from this arc's end (pCurr.p1) to the next gear (pCurr.p2).
            let lineSteps = max(1, ceil(pCurr.len / (this.linkSpacing * sample)));
            for (let j = 1; j <= lineSteps; j++) {
                let t = j / lineSteps;
                points.push(createVector(lerp(pCurr.p1.x, pCurr.p2.x, t), lerp(pCurr.p1.y, pCurr.p2.y, t)));
            }
        }

        return points;
    }

    // Draw an ordered point list as ONE continuous closed shape (no seams).
    _strokeLoop(points) {
        if (points.length < 2) return;
        beginShape();
        for (let p of points) vertex(p.x, p.y);
        endShape(CLOSE);
    }


    resampleChainPins(points) {
        if (points.length < 2) return [];

        let segments = [];
        let total = 0;
        for (let i = 0; i < points.length; i++) {
            let a = points[i];
            let b = points[(i + 1) % points.length];
            let len = dist(a.x, a.y, b.x, b.y);
            if (len <= 0) continue;
            segments.push({ a, b, len, start: total });
            total += len;
        }

        // Adjust link spacing to fit the total path length perfectly
        let numLinks = Math.round(total / this.linkSpacing);
        if (numLinks < 2) return [];
        let actualSpacing = total / numLinks;

        let pins = [];
        let start = this.offset % total; // Use modulo total so it wraps cleanly
        if (start < 0) start += total;

        for (let i = 0; i < numLinks; i++) {
            let d = (start + i * actualSpacing) % total;
            for (let s of segments) {
                if (d >= s.start && d <= s.start + s.len) {
                    let amt = (d - s.start) / s.len;
                    pins.push(p5.Vector.lerp(s.a, s.b, amt));
                    break;
                }
            }
        }

        return pins;
    }

    drawChainFromPath() {
        let points = this._loopPoints();
        let pins = this.resampleChainPins(points);
        let links = [];

        for (let i = 0; i < pins.length; i++) {
            let p1 = pins[i];
            let p2 = pins[(i + 1) % pins.length];
            let mid = p5.Vector.add(p1, p2).mult(0.5);
            let ang = atan2(p2.y - p1.y, p2.x - p1.x);
            let spacing = dist(p1.x, p1.y, p2.x, p2.y);
            links.push({ x: mid.x, y: mid.y, a: ang, spacing });
        }

        for (let i = 0; i < links.length; i += 2) {
            this.drawLink(links[i].x, links[i].y, links[i].a, links[i].spacing, true);
        }

        for (let i = 1; i < links.length; i += 2) {
            this.drawLink(links[i].x, links[i].y, links[i].a, links[i].spacing, false);
        }
    }

    _computePath() {
        if (this._path) return;
        let n = this.gears.length;
        if (n < 2) return;

        this._path = [];
        for (let i = 0; i < n; i++) {
            let o1 = this.gears[i], o2 = this.gears[(i + 1) % n];
            let g1 = o1.gear || o1, g2 = o2.gear || o2;
            let cw1 = o1.cw !== undefined ? o1.cw : true;
            let cw2 = o2.cw !== undefined ? o2.cw : true;

            let r1 = g1.noTeeth ? g1.r * 1.03 : g1.r + width / 50;
            let r2 = g2.noTeeth ? g2.r * 1.03 : g2.r + width / 50;

            let dx = g2.x - g1.x, dy = g2.y - g1.y;
            let d = max(0.1, sqrt(dx * dx + dy * dy));

            let gamma = atan2(dy, dx), a1, a2;
            if (cw1 === cw2) {
                let ratio = (r1 - r2) / d;
                let alpha = acos(max(-1, min(1, ratio)));
                a1 = cw1 ? gamma - alpha : gamma + alpha;
                a2 = a1;
            } else {
                let ratio = (r1 + r2) / d;
                let alpha = acos(max(-1, min(1, ratio)));
                a1 = cw1 ? gamma - alpha : gamma + alpha;
                a2 = a1 + PI;
            }
            this._path.push({
                exitA: a1, entryA: a2,
                p1: { x: g1.x + cos(a1) * r1, y: g1.y + sin(a1) * r1 },
                p2: { x: g2.x + cos(a2) * r2, y: g2.y + sin(a2) * r2 },
                len: dist(g1.x + cos(a1) * r1, g1.y + sin(a1) * r1, g2.x + cos(a2) * r2, g2.y + sin(a2) * r2)
            });
        }
    }


    display() {
        this._computeColors();
        let wRef = (typeof width !== 'undefined' && width > 0) ? width : 300;
        this.linkWidth = wRef * 0.0125;
        this.linkHeight = wRef * 0.00875;
        this.linkRadius = wRef * 0.005;

        // Link size fixed to canvas width only — independent of gear size
        this.linkSpacing = wRef * 0.03;

        if (wRef !== this._lastWRef) this._renderLinkPgs(wRef);

        // Scroll speed from actual belt surface velocity (gear angular speed × belt radius)
        let firstEntry = this.gears[0];
        let g0 = firstEntry.gear || firstEntry;
        let beltR = g0.noTeeth ? g0.r * 1.03 : g0.r + width / 50;
        this.offset += (g0.speed !== undefined ? g0.speed : this.speed) * beltR;

        this._computePath();
        let n = this.gears.length;
        if (n < 2 || !this._path) return;

        if (this.style === 'rubber') {
            this.drawRubberBelt(this._path);
            return;
        }

        this.drawChainFromPath();
    }

    drawRubberBelt(path) {
        let wRef = (typeof width !== 'undefined' && width > 0) ? width : 300;
        let thickness = wRef * 0.0167;      // ~5px
        let innerThickness = wRef * 0.0083; // ~2.5px
        let cordThickness = wRef * 0.002;   // ~0.6px
        let shadowOffset = wRef * 0.01;

        // Build the belt loop once; every pass draws the same single shape.
        let loop = this._loopPoints();
        const drawGeometry = () => this._strokeLoop(loop);

        noFill();
        strokeJoin(ROUND);

        // Use cached colors
        let mainR = this._mainR, mainG = this._mainG, mainB = this._mainB;
        let coreR = this._coreR, coreG = this._coreG, coreB = this._coreB;
        let cordR = this._cordR, cordG = this._cordG, cordB = this._cordB;



        // 2. Draw Main Rubber Body (Industrial Charcoal or Custom Color)
        stroke(mainR, mainG, mainB);
        strokeWeight(thickness);
        drawGeometry();

        // 3. Draw Inner V-Groove Core (Darker contrast stripe)
        stroke(coreR, coreG, coreB);
        strokeWeight(innerThickness);
        drawGeometry();

        // 4. Draw Slick Reinforcement Cords (Metallic Grey/Gold or Custom stripe)
        stroke(cordR, cordG, cordB, 180);
        strokeWeight(cordThickness);
        drawGeometry();

        // 5. Draw Smooth Scrolling Marks (Simulated printed markings/timing notches)
        push();
        drawingContext.setLineDash([wRef * 0.03, wRef * 0.15]); // Dash specs
        drawingContext.lineDashOffset = -this.offset; // Smooth GPU scroll
        stroke(200, 205, 210, 150); // Sleek silver printed label stripe
        strokeWeight(wRef * 0.0033);
        drawGeometry();
        drawingContext.setLineDash([]); // Reset line dash
        pop();
    }
}
class Arm {
    constructor(g1, g2, pinR, angOffset1 = 0, layer = 0, armThickness, armColor, style = 'truss') {
        this.style = style;
        this.g1 = g1;
        this.g2 = g2;
        this.pinPercent = pinR !== undefined ? pinR : 0.5;
        this.pinR1 = this.pinPercent * g1.r;
        this.pinR2 = this.pinPercent * g2.r;
        this.a1 = angOffset1;
        // Automatically sync a2 for initial position
        this.a2 = (g1.a + angOffset1) - g2.a;
        this.layer = layer;

        // Dynamically scale width based on gear size if not provided
        let avgGearR = (g1.r + g2.r) / 2;
        this.armR = armThickness !== undefined ? armThickness : max(1.0, avgGearR * 0.2);

        // Color derivation from user-supplied color
        if (armColor) {
            let c = color(armColor);
            let r = red(c), g = green(c), b = blue(c);
            this._rawCol = c;
            this.barCol = color(r * 0.55, g * 0.55, b * 0.55);
            this.capCol = color(min(255, r * 1.3), min(255, g * 1.3), min(255, b * 1.3));
        } else {
            this._rawCol = color(110, 112, 115);
            this.barCol = color(70, 75, 80);
            this.capCol = color(220, 215, 200);
        }

        // Rigid body parallel linkage: fixed physical distance
        this.d = dist(g1.x, g1.y, g2.x, g2.y);

        if (style === 'plank') this.renderPlank();
        else this.renderMachined();
    }

    drawConnectingRod(g, dx, armR) {
        let smallR = max(4.0, armR * 0.75);
        let bigR = max(5.0, armR * 1.1);
        let channelW = max(3.0, armR * 0.55);

        let leftX = -dx;
        let rightX = dx;

        let channelLeftX = leftX + smallR * 1.25;
        let channelRightX = rightX - bigR * 1.25;
        let channelLen = channelRightX - channelLeftX;

        // 1. Tapered Forged Shank Body with Clean Center Cutout (beginContour)
        g.beginShape();
        // Outer boundary (Clockwise)
        g.vertex(leftX, -smallR);
        g.vertex(rightX, -bigR);
        g.vertex(rightX + bigR * 0.5, -bigR * 0.7);
        g.vertex(rightX + bigR * 0.5, bigR * 0.7);
        g.vertex(rightX, bigR);
        g.vertex(leftX, smallR);
        g.vertex(leftX - smallR * 0.5, smallR * 0.7);
        g.vertex(leftX - smallR * 0.5, -smallR * 0.7);

        // Center Slot Cutout (Counter-Clockwise)
        if (channelLen > 5) {
            g.beginContour();
            let cH = channelW * 0.5;
            g.vertex(channelLeftX, -cH);
            g.vertex(channelLeftX, cH);
            g.vertex(channelRightX, cH);
            g.vertex(channelRightX, -cH);
            g.endContour();
        }
        g.endShape(CLOSE);

        // 2. Circular Eye Collars at Both Ends
        g.circle(leftX, 0, smallR * 2.2);
        g.circle(rightX, 0, bigR * 2.2);
    }

    renderMachined() {
        let cr = this.armR * 0.55;
        let pad = cr * 4;
        let w = this.d + pad * 2;
        let h = pad * 2 + this.armR * 2;

        let g = createGraphics(w, h);
        g.rectMode(CENTER);
        g.translate(w / 2, h / 2);

        let barCol = this.barCol;
        let dx = this.d / 2;

        g.strokeJoin(ROUND);

        // Shadow pass (subtle soft offset)
        g.push();
        g.translate(0, 1);
        g.noStroke();
        g.fill(0, 0, 0, 18);
        this.drawConnectingRod(g, dx, this.armR);
        g.pop();

        // Main connecting rod body
        g.noStroke();
        g.fill(barCol);
        this.drawConnectingRod(g, dx, this.armR);

        // Bigger bolt at each end — no bearer disc
        g.noStroke();
        for (let cx of [-dx, dx]) {
            g.push();
            g.translate(cx, 0);
            new Bolt(0, 0, { r: cr * 1.4, style: 2, c: this._rawCol }).display(g);
            g.pop();
        }

        // Apply Shader
        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", g);
        machiningShader.setUniform("amt", 0.13);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        this.machinedPg = createGraphics(w, h);
        this.machinedPg.drawingContext.shadowOffsetX = 2;
        this.machinedPg.drawingContext.shadowOffsetY = 2;
        this.machinedPg.drawingContext.shadowBlur = 4;
        this.machinedPg.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.machinedPg.image(shaderBuffer, 0, 0, w, h);
        this.machinedPg.drawingContext.shadowColor = 'rgba(0,0,0,0)';
        g.remove();
    }

    renderPlank() {
        let thickness = this.armR * 1.3;
        let cr = this.armR * 0.6;
        let pad = cr * 4;
        let w = this.d + pad * 2;
        let h = (thickness + pad) * 2;
        let dx = this.d / 2;
        let plankW = this.d + thickness * 0.5;
        let plankH = thickness;
        let rx = plankH / 2;

        let g = createGraphics(w, h);
        g.rectMode(CENTER);
        g.translate(w / 2, h / 2);

        let r0 = red(this._rawCol), g0 = green(this._rawCol), b0 = blue(this._rawCol);

        // Drop shadow
        g.push();
        g.translate(0, 3);
        g.noStroke();
        g.fill(0, 0, 0, 40);
        g.rect(0, 0, plankW, plankH * 1.05, rx);
        g.pop();

        // Main plank body
        g.noStroke();
        g.fill(this.barCol);
        g.rect(0, 0, plankW, plankH, rx);

        // Specular highlight line along top edge
        g.stroke(255, 255, 255, 75);
        g.strokeWeight(1);
        g.line(-plankW * 0.4, -plankH * 0.35, plankW * 0.4, -plankH * 0.35);

        // Bolts at both ends
        g.noStroke();
        for (let cx of [-dx, dx]) {
            g.push();
            g.translate(cx, 0);
            new Bolt(0, 0, { r: cr * 1.3, style: 2, c: this._rawCol }).display(g);
            g.pop();
        }

        // Apply Shader
        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", g);
        machiningShader.setUniform("amt", 0.12);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        this.machinedPg = createGraphics(w, h);
        this.machinedPg.drawingContext.shadowOffsetX = 5;
        this.machinedPg.drawingContext.shadowOffsetY = 5;
        this.machinedPg.drawingContext.shadowBlur = 10;
        this.machinedPg.drawingContext.shadowColor = 'rgba(20, 15, 10, 0.5)';
        this.machinedPg.image(shaderBuffer, 0, 0, w, h);
        this.machinedPg.drawingContext.shadowColor = 'rgba(0,0,0,0)';
        g.remove();
    }

    _applyShader(g, w, h) {
        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", g);
        machiningShader.setUniform("amt", 0.12);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();
        this.machinedPg = createGraphics(w, h);
        this.machinedPg.drawingContext.shadowOffsetX = 5;
        this.machinedPg.drawingContext.shadowOffsetY = 5;
        this.machinedPg.drawingContext.shadowBlur = 10;
        this.machinedPg.drawingContext.shadowColor = 'rgba(20, 15, 10, 0.5)';
        this.machinedPg.image(shaderBuffer, 0, 0, w, h);
        this.machinedPg.drawingContext.shadowColor = 'rgba(0,0,0,0)';
    }



    display() {
        if (this.g1.speed !== this.g2.speed || this.g1.r !== this.g2.r) return;

        let ax = this.g1.x + cos(this.g1.a + this.a1) * this.pinR1;
        let ay = this.g1.y + sin(this.g1.a + this.a1) * this.pinR1;
        let bx = this.g2.x + cos(this.g2.a + this.a2) * this.pinR2;
        let by = this.g2.y + sin(this.g2.a + this.a2) * this.pinR2;

        let ang = atan2(by - ay, bx - ax);
        let cx = this.machinedPg.width / 2;
        let cy = this.machinedPg.height / 2;

        push();
        translate((ax + bx) / 2, (ay + by) / 2);
        rotate(ang);

        image(this.machinedPg, -cx, -cy);
        pop();
    }
}
class PistonEngine {
    constructor(gear, options = {}) {
        this.gear = gear;

        let pinPercent = options.pinR !== undefined ? options.pinR : 0.5;
        this.pinR = pinPercent * this.gear.r;
        this.angOffset = options.angOffset || 0;

        this.armThickness = options.armThickness !== undefined ? options.armThickness : max(3.0, this.gear.r * 0.15);

        this.cylinderWidth = options.cylinderWidth || 10;
        this.cylinderLength = options.cylinderLength || 100;

        this.isBottom = options.isBottom !== undefined ? options.isBottom : (this.gear.y > height / 2);
        this.layer = options.layer !== undefined ? options.layer : (this.gear.layer || 0);

        this.startX = options.x !== undefined ? options.x : this.gear.x;
        this.startY = options.y !== undefined ? options.y : (this.isBottom ? height : 0);

        this.endY = this.isBottom ? this.startY - this.cylinderLength : this.startY + this.cylinderLength;

        let lowestPinY = this.gear.y + (this.isBottom ? this.pinR : -this.pinR);
        this.rodLength = options.rodLength || floor(abs(this.endY - lowestPinY));

        this.stretchLength = 2 * this.pinR;

        if (options.c) {
            let c = color(options.c);
            let r = red(c), g = green(c), b = blue(c);
            this.color = color(r * 0.55, g * 0.55, b * 0.55);
            this.accentColor = color(r * 0.75, g * 0.75, b * 0.75);
            this.rodColor = color(r * 0.6, g * 0.6, b * 0.6);
            this.capColor = color(min(255, r * 1.3), min(255, g * 1.3), min(255, b * 1.3));
            this.sliderColor = color(r * 0.65, g * 0.65, b * 0.65);
            this.bellowsMid = color(r * 0.9, g * 0.9, b * 0.9);
        } else {
            this.color = options.color || color(80, 85, 90);
            this.accentColor = options.accentColor || color(122, 103, 61);
            this.rodColor = color(95, 100, 105);
            this.capColor = color(220, 215, 200);
            this.sliderColor = color(100, 105, 110);
            this.bellowsMid = color(165, 160, 145);
        }

        this.renderMachined();
        this.renderRod();
    }

    renderMachined() {
        let w = this.cylinderWidth * 3;
        let h = this.cylinderLength + 40;

        let pg = createGraphics(w, h);
        pg.rectMode(CENTER);
        pg.translate(w / 2, h / 2 - this.cylinderLength / 2);

        let r = this.cylinderWidth / 2;
        let startColor = color(20, 25, 30);
        let midColor = this.color;

        pg.noFill();
        pg.strokeWeight(1.5);

        for (let xOffset = 0; xOffset <= r; xOffset += 1) {
            let t = map(xOffset, 0, r, 1, 0);
            let strokeCol = lerpColor(startColor, midColor, t);
            pg.stroke(strokeCol);

            pg.line(-xOffset, 0, -xOffset, this.cylinderLength);
            pg.line(xOffset, 0, xOffset, this.cylinderLength);
        }

        let numRibs = 5;
        let ribSpacing = this.cylinderLength / (numRibs + 1);
        pg.noStroke();
        for (let i = 1; i <= numRibs; i++) {
            let ry = i * ribSpacing;

            for (let xOffset = 0; xOffset <= r * 1.15; xOffset += 1) {
                let t = map(xOffset, 0, r * 1.15, 1, 0);
                let strokeCol = lerpColor(color(10, 15, 20), this.accentColor, t);
                pg.stroke(strokeCol);
                pg.line(-xOffset, ry - 3, -xOffset, ry + 3);
                pg.line(xOffset, ry - 3, xOffset, ry + 3);
            }
        }

        let cy = this.cylinderLength;
        for (let xOffset = 0; xOffset <= r * 1.25; xOffset += 1) {
            let t = map(xOffset, 0, r * 1.25, 1, 0);
            let strokeCol = lerpColor(color(15, 20, 25), this.color, t);
            pg.stroke(strokeCol);
            pg.line(-xOffset, cy - 10, -xOffset, cy);
            pg.line(xOffset, cy - 10, xOffset, cy);
        }

        pg.noFill();
        pg.stroke(255, 255, 255, 110);
        pg.strokeWeight(0.5);
        pg.rect(0, this.cylinderLength / 2, this.cylinderWidth, this.cylinderLength, 2);
        pg.rect(0, cy - 5, this.cylinderWidth * 1.25, 10, 1);

        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", pg);
        machiningShader.setUniform("amt", 0.14);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        this.machinedPg = createGraphics(w, h);
        this.machinedPg.drawingContext.shadowOffsetX = 5;
        this.machinedPg.drawingContext.shadowOffsetY = 5;
        this.machinedPg.drawingContext.shadowBlur = 10;
        this.machinedPg.drawingContext.shadowColor = 'rgba(20, 15, 10, 0.5)';
        this.machinedPg.image(shaderBuffer, 0, 0, w, h);
        this.machinedPg.drawingContext.shadowColor = 'rgba(0,0,0,0)';
        pg.remove();
    }

    renderRod() {
        let armThickness = this.armThickness;
        let cr = armThickness * 0.55;
        let pad = cr * 4;
        let w = this.rodLength + pad * 2;
        let h = pad * 2;

        let g = createGraphics(w, h);
        g.rectMode(CENTER);
        g.translate(w / 2, h / 2);

        let barCol = this.rodColor;
        let capCol = this.capColor;
        let dx = this.rodLength / 2;

        g.noFill();
        g.strokeJoin(ROUND);

        let drawConnectingRod = (graphics, lenX, armR) => {
            let smallR = max(4.0, armR * 0.75);
            let bigR = max(5.0, armR * 1.1);
            let channelW = max(3.0, armR * 0.55);

            let leftX = -lenX;
            let rightX = lenX;

            let channelLeftX = leftX + smallR * 1.25;
            let channelRightX = rightX - bigR * 1.25;
            let channelLen = channelRightX - channelLeftX;

            // 1. Tapered Forged Shank Body with Clean Center Cutout (beginContour)
            graphics.beginShape();
            graphics.vertex(leftX, -smallR);
            graphics.vertex(rightX, -bigR);
            graphics.vertex(rightX + bigR * 0.5, -bigR * 0.7);
            graphics.vertex(rightX + bigR * 0.5, bigR * 0.7);
            graphics.vertex(rightX, bigR);
            graphics.vertex(leftX, smallR);
            graphics.vertex(leftX - smallR * 0.5, smallR * 0.7);
            graphics.vertex(leftX - smallR * 0.5, -smallR * 0.7);

            if (channelLen > 5) {
                graphics.beginContour();
                let cH = channelW * 0.5;
                graphics.vertex(channelLeftX, -cH);
                graphics.vertex(channelLeftX, cH);
                graphics.vertex(channelRightX, cH);
                graphics.vertex(channelRightX, -cH);
                graphics.endContour();
            }
            graphics.endShape(CLOSE);

            // 2. Eye Collars
            graphics.circle(leftX, 0, smallR * 2.2);
            graphics.circle(rightX, 0, bigR * 2.2);
        };

        // Ambient drop shadow under connecting rod (subtle soft offset)
        g.push();
        g.translate(0, 1);
        g.noStroke();
        g.fill(0, 0, 0, 18);
        drawConnectingRod(g, dx, armThickness);
        g.pop();

        // Main connecting rod body
        g.noStroke();
        g.fill(barCol);
        drawConnectingRod(g, dx, armThickness);

        // Bolts at both pivot ends (matching Arm and other components)
        g.noStroke();
        for (let cx of [-dx, dx]) {
            g.push();
            g.translate(cx, 0);
            new Bolt(0, 0, { r: cr * 1.4, style: 2, c: this.color }).display(g);
            g.pop();
        }

        // Run rod through global shader pass
        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", g);
        machiningShader.setUniform("amt", 0.13);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        this.rodPg = createGraphics(w, h);
        this.rodPg.drawingContext.shadowOffsetX = 2;
        this.rodPg.drawingContext.shadowOffsetY = 2;
        this.rodPg.drawingContext.shadowBlur = 4;
        this.rodPg.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.rodPg.image(shaderBuffer, 0, 0, w, h);
        this.rodPg.drawingContext.shadowColor = 'rgba(0,0,0,0)';
        g.remove();
    }

    display() {
        // --- 1. SOLVE SLIDER KINEMATICS (VERTICAL PROJECTION) ---
        let px = this.gear.x + cos(this.gear.a + this.angOffset) * this.pinR;
        let py = this.gear.y + sin(this.gear.a + this.angOffset) * this.pinR;

        let sy = py + (this.isBottom ? this.rodLength : -this.rodLength);

        // --- 2. RENDER THE CORRUGATED RIGID PISTON SLIDER ---
        push();
        let slideDir = this.isBottom ? 1 : -1;
        let sliderW = this.cylinderWidth * 0.75;
        let r_s = sliderW / 2;

        stroke(red(this.sliderColor), green(this.sliderColor), blue(this.sliderColor));
        strokeWeight(sliderW * 0.6);
        line(this.startX, sy, this.startX, this.endY);

        let bellowsStep = 10;
        let startRib = sy;
        let numRibs = ceil(this.stretchLength / bellowsStep);

        let startColor = color(15, 20, 25);
        let midColor = this.bellowsMid;

        noStroke();
        for (let i = 0; i < numRibs; i++) {
            let ry = startRib + i * bellowsStep * slideDir;

            for (let xOffset = 0; xOffset <= r_s; xOffset += 1) {
                let t = map(xOffset, 0, r_s, 1, 0);
                let strokeCol = lerpColor(startColor, midColor, t);
                stroke(strokeCol);
                strokeWeight(1.5);

                line(this.startX - xOffset, ry, this.startX - xOffset, ry + bellowsStep * 0.6 * slideDir);
                line(this.startX + xOffset, ry, this.startX + xOffset, ry + bellowsStep * 0.6 * slideDir);
            }
        }
        pop();

        // --- 3. RENDER THE PRE-CACHED CYLINDER SLEEVE ON TOP ---
        push();
        imageMode(CENTER);
        translate(this.startX, this.startY);
        if (this.isBottom) {
            rotate(PI);
        }

        noTint();
        image(this.machinedPg, 0, this.cylinderLength / 2);
        pop();

        // --- 4. RENDER THE ROCKING DRIVE ROD (ARM) ---
        let mx = (px + this.startX) / 2;
        let my = (py + sy) / 2;
        let ang = atan2(py - sy, px - this.startX);

        push();
        translate(mx, my);
        rotate(ang);
        imageMode(CENTER);

        image(this.rodPg, 0, 0);
        pop();
    }
}
class ArmPair {
    constructor(closed = false, style = 'truss', col = undefined, ...gears) {
        this.closed = closed;
        this.style = style;
        this.col = col;
        this.arms = [];
        this._build(gears);
    }

    _build(gears) {
        const groups = [];
        for (const g of gears) {
            const grp = groups.find(gr =>
                abs(gr[0].r - g.r) < 0.001 && abs(gr[0].speed - g.speed) < 0.0001
            );
            if (grp) grp.push(g);
            else groups.push([g]);
        }

        const nodes = groups.sort((a, b) => b.length - a.length)[0] || [];
        if (nodes.length < 2) return;

        for (let i = 0; i < nodes.length - 1; i++) {
            this.arms.push(new Arm(nodes[i], nodes[i + 1], 0.5, 0, 0, undefined, this.col, this.style));
        }

        if (this.closed && nodes.length >= 3) {
            this.arms.push(new Arm(nodes[nodes.length - 1], nodes[0], 0.5, 0, 0, undefined, this.col, this.style));
        }
    }

    getArms() { return this.arms; }
    display() { for (const a of this.arms) a.display(); }
}
class PipingChassis {
    constructor(gears, options = {}) {
        this.gears = gears;

        // Core layout configurations (strictly allows 0)
        this.spacing = options.spacing !== undefined ? options.spacing : 40;
        this.pipeWidth = options.pipeWidth !== undefined ? options.pipeWidth : 14;
        this.colors = options.colors || [color(100, 105, 110), color(150, 155, 160), color(80, 85, 90)];
        this.numPipes = options.numPipes !== undefined ? options.numPipes : 20;
        this.seed = options.seed !== undefined ? options.seed : floor(random(10000));

        // Procedural generation parameters
        this.margin = options.margin !== undefined ? options.margin : 150;
        this.maxSteps = options.maxSteps !== undefined ? options.maxSteps : 30;
        this.turnChance = options.turnChance !== undefined ? options.turnChance : 0.7;
        this.widthVarMin = options.widthVarMin !== undefined ? options.widthVarMin : 0.7;
        this.widthVarMax = options.widthVarMax !== undefined ? options.widthVarMax : 1.3;

        // Style variables (Shared chassis & flange gold theme)
        this.c = options.c || color(122, 103, 61); // Golden bronze chassis color
        this.baseColor = options.baseColor || color(30, 35, 40); // Base pipe outline
        this.highlightColor = options.highlightColor || color(255, 255, 255, 120); // Pipe specular highlight

        // Render adjustments
        this.shadowOffset = options.shadowOffset !== undefined ? options.shadowOffset : 6;
        this.shadowAlpha = options.shadowAlpha !== undefined ? options.shadowAlpha : 120;
        this.shaderAmt = options.shaderAmt !== undefined ? options.shaderAmt : 0.15;

        // Bounding dimensions
        this.minX = -this.margin;
        this.minY = -this.margin;
        this.maxX = width + this.margin;
        this.maxY = height + this.margin;

        this.bw = this.maxX - this.minX;
        this.bh = this.maxY - this.minY;

        // Output arrays
        this.numLayers = options.numLayers || 4;
        this.maxPipeLayer = options.maxPipeLayer !== undefined ? options.maxPipeLayer : Math.min(10, this.numLayers - 1);

        this.paths = [];
        this.flanges = [];
        this.anchors = []; // Structuring anchors: { gear, flange }

        this.generatePaths();
        this.generateGearConnectors();
        this.calculateAnchors();
        this.render();
    }

    generateGearConnectors() {
        if (!this.gears || this.gears.length < 2) return;

        this.shaftPairs = [];

        // Group gears by layer — only connect same-layer gears
        const byLayer = {};
        for (const g of this.gears) {
            const l = g.layer || 0;
            if (!byLayer[l]) byLayer[l] = [];
            byLayer[l].push(g);
        }

        for (const [layerStr, layerGears] of Object.entries(byLayer)) {
            const layer = parseInt(layerStr);

            for (let i = 0; i < layerGears.length; i++) {
                const g1 = layerGears[i];
                for (let j = i + 1; j < layerGears.length; j++) {
                    const g2 = layerGears[j];
                    const maxDist = max(g1.r, g2.r) * 4.2;
                    if (dist(g1.x, g1.y, g2.x, g2.y) >= maxDist) continue;

                    // One below the gear layer so gears render on top of the shaft
                    this.shaftPairs.push({ g1, g2, layer: Math.max(0, layer - 1) });
                }
            }
        }
    }

    generatePaths() {
        if (this.numPipes <= 0 || this.spacing <= 0) return;

        randomSeed(this.seed);
        let dirs = [
            { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 }
        ];

        for (let i = 0; i < this.numPipes; i++) {
            let pts = [];
            let edge = floor(random(4));
            let startX, startY, dir;

            let snap = (val) => round(val / this.spacing) * this.spacing;

            if (edge === 0) { // Top
                startX = snap(random(this.minX, this.maxX));
                startY = this.minY;
                dir = 2; // Down
            } else if (edge === 1) { // Bottom
                startX = snap(random(this.minX, this.maxX));
                startY = this.maxY;
                dir = 3; // Up
            } else if (edge === 2) { // Left
                startX = this.minX;
                startY = snap(random(this.minY, this.maxY));
                dir = 0; // Right
            } else { // Right
                startX = this.maxX;
                startY = snap(random(this.minY, this.maxY));
                dir = 1; // Left
            }

            let curr = { x: startX, y: startY };
            pts.push({ x: curr.x, y: curr.y });

            let steps = 0;

            while (
                curr.x >= this.minX && curr.x <= this.maxX &&
                curr.y >= this.minY && curr.y <= this.maxY &&
                steps < this.maxSteps
            ) {
                let distVal = floor(random(2, 6)) * this.spacing;
                curr.x += dirs[dir].x * distVal;
                curr.y += dirs[dir].y * distVal;
                pts.push({ x: curr.x, y: curr.y });

                if (random() < this.turnChance) {
                    if (dir === 0 || dir === 1) {
                        dir = random() > 0.5 ? 2 : 3;
                    } else {
                        dir = random() > 0.5 ? 0 : 1;
                    }
                }
                steps++;
            }

            curr.x += dirs[dir].x * this.spacing * 10;
            curr.y += dirs[dir].y * this.spacing * 10;
            pts.push({ x: curr.x, y: curr.y });

            this.paths.push({
                pts: pts,
                c: random(this.colors),
                w: this.pipeWidth * random(this.widthVarMin, this.widthVarMax),
                layer: floor(random(this.maxPipeLayer + 1))
            });
        }
    }

    calculateAnchors() {
        if (this.paths.length === 0 || this.gears.length === 0) return;

        // Step 1: Pre-populate all potential pipe flange spots
        this.flanges = [];
        for (let path of this.paths) {
            let pts = path.pts;
            let w = path.w;
            for (let i = 0; i < pts.length - 1; i++) {
                let p1 = pts[i];
                let p2 = pts[i + 1];
                let d = dist(p1.x, p1.y, p2.x, p2.y);
                let dx = p2.x - p1.x;
                let dy = p2.y - p1.y;
                let ang = atan2(dy, dx);

                if (d > this.spacing * 1.5) {
                    let numFlanges = floor(d / (this.spacing * 1.5));
                    for (let j = 1; j <= numFlanges; j++) {
                        let t = j / (numFlanges + 1);
                        let fx = lerp(p1.x, p2.x, t);
                        let fy = lerp(p1.y, p2.y, t);
                        this.flanges.push({
                            x: fx,
                            y: fy,
                            ang: ang,
                            w: w
                        });
                    }
                }
            }
        }

        // Step 2: Dynamically calculate the "Core Gear" (closest to geometric center of mass of all gears)
        let sumX = 0, sumY = 0;
        for (let g of this.gears) {
            sumX += g.x;
            sumY += g.y;
        }
        let avgX = sumX / this.gears.length;
        let avgY = sumY / this.gears.length;

        let coreGear = this.gears[0];
        let minCoreD = Infinity;
        for (let g of this.gears) {
            let d = dist(g.x, g.y, avgX, avgY);
            if (d < minCoreD) {
                minCoreD = d;
                coreGear = g;
            }
        }
        this.coreGear = coreGear; // Keep core reference

        // Step 3: Calculate anchors for all gears
        this.anchors = [];
        for (let g of this.gears) {
            let candidates = this.flanges.filter(f => {
                let d = dist(g.x, g.y, f.x, f.y);
                return d > 30 && d < 150;
            });

            if (candidates.length > 0) {
                candidates.sort((a, b) => dist(g.x, g.y, a.x, a.y) - dist(g.x, g.y, b.x, b.y));
                this.anchors.push({
                    gear: g,
                    flange: candidates[0],
                    type: 'flange'
                });
            } else if (g !== coreGear) {
                // Stranded outer gear: Fall back to core gear hub
                this.anchors.push({
                    gear: g,
                    targetGear: coreGear,
                    type: 'gear'
                });
            } else {
                // Stranded Core Gear: Drop a heavy vertical support column to screen bottom (floor mount)
                this.anchors.push({
                    gear: g,
                    targetX: g.x,
                    targetY: this.maxY,
                    type: 'column'
                });
            }
        }
    }

    drawPipePath(pg, pts) {
        pg.beginShape();
        pg.vertex(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i++) {
            let pA = pts[i - 1];
            let pC = pts[i];
            let pB = pts[i + 1];

            let dA = dist(pA.x, pA.y, pC.x, pC.y);
            let dB = dist(pB.x, pB.y, pC.x, pC.y);
            let R = min(this.spacing * 0.45, dA / 2, dB / 2);

            let Ap = { x: pC.x + ((pA.x - pC.x) / dA) * R, y: pC.y + ((pA.y - pC.y) / dA) * R };
            let Bp = { x: pC.x + ((pB.x - pC.x) / dB) * R, y: pC.y + ((pB.y - pC.y) / dB) * R };

            if (dA > 0.1 && dB > 0.1) {
                pg.vertex(Ap.x, Ap.y);
                pg.quadraticVertex(pC.x, pC.y, Bp.x, Bp.y);
            } else {
                pg.vertex(pC.x, pC.y);
            }
        }
        pg.vertex(pts[pts.length - 1].x, pts[pts.length - 1].y);
        pg.endShape();
    }

    // Get perpendicular offset points at distance r from line a→b at point p
    _getPerp(a, b, p, r) {
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let len = Math.sqrt(dx * dx + dy * dy) || 1;
        let nx = -dy / len;
        let ny = dx / len;
        return [
            { x: p.x + nx * r, y: p.y + ny * r },
            { x: p.x - nx * r, y: p.y - ny * r }
        ];
    }

    // Resample raw corner-point path into dense polyline with rounded corners
    _resamplePath(pts) {
        let dense = [];
        let CURVE_STEPS = 8;
        for (let i = 0; i < pts.length; i++) {
            if (i === 0 || i === pts.length - 1) {
                dense.push({ x: pts[i].x, y: pts[i].y });
                continue;
            }
            let pA = pts[i - 1];
            let pC = pts[i];
            let pB = pts[i + 1];
            let dA = dist(pA.x, pA.y, pC.x, pC.y);
            let dB = dist(pB.x, pB.y, pC.x, pC.y);
            if (dA < 0.1 || dB < 0.1) {
                dense.push({ x: pC.x, y: pC.y });
                continue;
            }
            let R = min(this.spacing * 0.45, dA / 2, dB / 2);
            let Ap = { x: pC.x + ((pA.x - pC.x) / dA) * R, y: pC.y + ((pA.y - pC.y) / dA) * R };
            let Bp = { x: pC.x + ((pB.x - pC.x) / dB) * R, y: pC.y + ((pB.y - pC.y) / dB) * R };
            dense.push(Ap);
            // Quadratic bezier subdivision: Ap → pC (control) → Bp
            for (let s = 1; s <= CURVE_STEPS; s++) {
                let t = s / CURVE_STEPS;
                let u = 1 - t;
                let x = u * u * Ap.x + 2 * u * t * pC.x + t * t * Bp.x;
                let y = u * u * Ap.y + 2 * u * t * pC.y + t * t * Bp.y;
                dense.push({ x, y });
            }
        }
        return dense;
    }

    // Top-left light source — drives all cylindrical shading
    _litSide(a, b) {
        const LX = -0.707, LY = -0.707;
        let dx = b.x - a.x, dy = b.y - a.y;
        let len = Math.sqrt(dx * dx + dy * dy) || 1;
        let nx = -dy / len, ny = dx / len;
        return (nx * LX + ny * LY) >= 0 ? 0 : 1; // 0 or 1 indexes into _getPerp result
    }

    _drawGradientPolyline(pg, dense, halfW, darkCol, lightCol) {
        // Symmetric: center = lightCol, edges = darkCol — same approach as deus.js xe()
        pg.noFill();
        pg.strokeWeight(2);

        for (let c = 0; c <= halfW; c += 1) {
            let t = map(c, 0, halfW, 1, 0); // 1 at center, 0 at edge
            let col = lerpColor(darkCol, lightCol, t);
            pg.stroke(col);

            let d0 = [], d1 = [];
            for (let i = 0; i < dense.length - 1; i++) {
                let a = dense[i], b = dense[i + 1];
                let perp = this._getPerp(a, b, a, c);
                d0.push(perp[0]);
                d1.push(perp[1]);
            }
            let la = dense[dense.length - 2], lb = dense[dense.length - 1];
            let lp = this._getPerp(la, lb, lb, c);
            d0.push(lp[0]);
            d1.push(lp[1]);

            pg.beginShape();
            for (let pt of d0) pg.vertex(pt.x, pt.y);
            pg.endShape();

            pg.beginShape();
            for (let pt of d1) pg.vertex(pt.x, pt.y);
            pg.endShape();
        }
    }

    _drawJointBand(pg, a, b, halfW, darkCol, lightCol) {
        // Matches deus.js S() exactly: symmetric gradient, center=lightCol, edge=darkCol
        pg.noFill();
        pg.strokeWeight(2);

        for (let c = 0; c <= halfW; c += 0.5) {
            let t = map(c, 0, halfW, 1, 0);
            let col = lerpColor(darkCol, lightCol, t);
            pg.stroke(col);
            let pA = this._getPerp(a, b, a, c);
            let pB = this._getPerp(a, b, b, c);
            pg.line(pA[0].x, pA[0].y, pB[0].x, pB[0].y);
            pg.line(pA[1].x, pA[1].y, pB[1].x, pB[1].y);
        }

        // Edge lines at the collar rim
        let edgeA = this._getPerp(a, b, a, halfW);
        let edgeB = this._getPerp(a, b, b, halfW);
        pg.strokeWeight(1);
        pg.stroke(darkCol);
        pg.line(edgeA[0].x, edgeA[0].y, edgeA[1].x, edgeA[1].y);
        pg.line(edgeB[0].x, edgeB[0].y, edgeB[1].x, edgeB[1].y);
    }

    drawFlange(pg, x, y, ang, w) {
        pg.push();
        pg.translate(x, y);
        pg.rotate(ang);

        // 1. Clamp Body (Unified Golden Bronze Chassis Material)
        pg.fill(this.c);
        pg.noStroke();
        pg.rectMode(CENTER);
        pg.rect(0, 0, w * 2.2, w * 1.3, 2);

        // 2. Bolt heads clamping the flange
        pg.fill(30, 35, 40);
        pg.circle(-w * 0.8, 0, 2.5);
        pg.circle(w * 0.8, 0, 2.5);

        // 3. Specular highlighting
        pg.noFill();
        pg.stroke(255, 255, 255, 100);
        pg.strokeWeight(0.5);
        pg.rect(0, 0, w * 2.2, w * 1.3, 2);

        pg.pop();
    }

    drawPerforatedBar(pg, dx, wy, ny) {
        pg.beginShape();
        pg.vertex(-dx, wy);
        pg.vertex(0, ny);
        pg.vertex(dx, wy);
        pg.vertex(dx, -wy);
        pg.vertex(0, -ny);
        pg.vertex(-dx, -wy);
        pg.endShape(CLOSE);

        pg.erase();
        let holeSpacing = 16;
        let numHoles = floor((dx * 2) / holeSpacing);
        for (let i = 1; i < numHoles; i++) {
            let x = -dx + i * holeSpacing;
            let distFromEdge = min(abs(x - (-dx)), abs(x - dx));
            let holeR = map(distFromEdge, 0, dx, 4.5, 2.0);
            pg.circle(x, 0, holeR * 2);
        }
        pg.noErase();
    }

    drawPerforatedBeam(pg, x1, y1, x2, y2, armR) {
        let d = dist(x1, y1, x2, y2);
        let ang = atan2(y2 - y1, x2 - x1);
        let dx = d / 2;
        let wy = armR * 0.8;
        let ny = armR * 0.45;

        pg.push();
        pg.translate((x1 + x2) / 2, (y1 + y2) / 2);
        pg.rotate(ang);

        // Shadow pass
        pg.push();
        pg.translate(0, 2);
        pg.fill(0, 0, 0, 40);
        pg.noStroke();
        this.drawPerforatedBar(pg, dx, wy, ny);
        pg.pop();

        // Golden main body
        pg.fill(this.c);
        pg.noStroke();
        this.drawPerforatedBar(pg, dx, wy, ny);

        // Machined highlights
        pg.stroke(255, 255, 255, 90);
        pg.strokeWeight(0.6);
        pg.noFill();
        this.drawPerforatedBar(pg, dx, wy, ny);

        pg.pop();
    }

    _renderLayerBuffer(layerPaths, shaftPairs = []) {
        let pipesPg = createGraphics(this.bw, this.bh);
        pipesPg.translate(-this.minX, -this.minY);
        pipesPg.strokeJoin(ROUND);
        pipesPg.strokeCap(ROUND);

        // Gear shafts drawn first (underneath backdrop pipes), same surface → same shader pass
        for (let { g1, g2 } of shaftPairs) {
            this.drawGearShaft(g1, g2, pipesPg);
        }

        for (let path of layerPaths) {
            let pts = path.pts;
            let w = path.w;
            pipesPg.push();
            pipesPg.translate(this.shadowOffset, this.shadowOffset);
            pipesPg.noFill();
            pipesPg.stroke(0, 0, 0, this.shadowAlpha);
            pipesPg.strokeWeight(w + this.shadowOffset);
            this.drawPipePath(pipesPg, pts);
            pipesPg.pop();
        }

        for (let path of layerPaths) {
            let pts = path.pts;
            let pipeCol = path.c;
            let w = path.w;
            let halfW = w / 2;
            let darkCol = color(red(pipeCol) * 0.38, green(pipeCol) * 0.38, blue(pipeCol) * 0.38);
            let lightCol = color(min(255, red(pipeCol) + 45), min(255, green(pipeCol) + 45), min(255, blue(pipeCol) + 45));
            let dense = this._resamplePath(pts);
            this._drawGradientPolyline(pipesPg, dense, halfW, darkCol, lightCol);
            for (let i = 1; i < pts.length - 1; i++) {
                let prev = pts[i - 1];
                let curr = pts[i];
                let dA = dist(prev.x, prev.y, curr.x, curr.y);
                if (dA < 0.1) continue;
                let jA = { x: lerp(prev.x, curr.x, 0.93), y: lerp(prev.y, curr.y, 0.93) };
                this._drawJointBand(pipesPg, jA, curr, halfW + 3, darkCol, lightCol);
            }
            pipesPg.noFill();
        }

        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", pipesPg);
        machiningShader.setUniform("amt", this.shaderAmt);
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        let out = createGraphics(this.bw, this.bh);
        out.image(shaderBuffer, 0, 0, this.bw, this.bh);
        pipesPg.remove();
        return out;
    }

    render() {
        // --- 1. RENDER PIPES — one buffer per layer ---
        this.machinedPipes = [];
        for (let layer = 0; layer < this.numLayers; layer++) {
            let layerPaths = this.paths.filter(p => p.layer === layer);
            let layerShafts = (this.shaftPairs || []).filter(s => s.layer === layer);
            let buf = (layerPaths.length > 0 || layerShafts.length > 0)
                ? this._renderLayerBuffer(layerPaths, layerShafts)
                : null;
            this.machinedPipes.push(buf);
        }


        // --- 2. RENDER FOREGROUND BRACKET CHASSIS LAYER ---
        let chassisPg = createGraphics(this.bw, this.bh);
        chassisPg.translate(-this.minX, -this.minY);
        chassisPg.strokeJoin(ROUND);

        let beamR = 5; // Scaled down chassis connector thickness

        // Draw recessed Hubs on all gear centers (clamped to frame)
        for (let g of this.gears) {
            chassisPg.push();
            chassisPg.translate(g.x, g.y);
            let hr = beamR * 2.5;

            // Gold mounting flange
            chassisPg.fill(this.c);
            chassisPg.noStroke();
            chassisPg.circle(0, 0, hr);

            // Highlights
            chassisPg.noFill();
            chassisPg.stroke(255, 255, 255, 80);
            chassisPg.strokeWeight(1);
            chassisPg.circle(0, 0, hr);

            // Dark recessed bolt pit
            chassisPg.fill(15, 20, 25);
            chassisPg.noStroke();
            chassisPg.circle(0, 0, hr * 0.6);

            // Inner shadow
            chassisPg.noFill();
            chassisPg.stroke(0, 0, 0, 100);
            chassisPg.strokeWeight(2);
            chassisPg.circle(0, 0, hr * 0.6);

            // Specular arc
            chassisPg.stroke(255, 255, 255, 40);
            chassisPg.strokeWeight(1);
            chassisPg.arc(0, 0, hr * 0.6, hr * 0.6, 0, PI);

            chassisPg.pop();
        }

        // Apply shader to chassis
        shaderBuffer.clear();
        shaderBuffer.reset();
        shaderBuffer.push();
        shaderBuffer.shader(machiningShader);
        machiningShader.setUniform("source", chassisPg);
        machiningShader.setUniform("amt", this.shaderAmt * 0.85); // Slightly cleaner noise for brackets
        shaderBuffer.noStroke();
        shaderBuffer.rectMode(CENTER);
        shaderBuffer.rect(0, 0, shaderBuffer.width, shaderBuffer.height);
        shaderBuffer.pop();

        this.machinedChassis = createGraphics(this.bw, this.bh);
        this.machinedChassis.image(shaderBuffer, 0, 0, this.bw, this.bh);
        chassisPg.remove();
    }

    _blitBuffer(buf) {
        push();
        translate(this.minX + this.bw / 2, this.minY + this.bh / 2);
        imageMode(CENTER);
        push();
        translate(3, 3);
        tint(0, 0, 0, 40);
        image(buf, 0, 0);
        pop();
        noTint();
        image(buf, 0, 0);
        pop();
    }

    displayPipesForLayer(layer) {
        if (!this.machinedPipes || !this.machinedPipes[layer]) return;
        this._blitBuffer(this.machinedPipes[layer]);
    }

    displayPipes() {
        if (!this.machinedPipes) return;
        for (let buf of this.machinedPipes) {
            if (buf) this._blitBuffer(buf);
        }
    }

    displayChassis() {
        if (!this.machinedChassis) return;

        push();
        translate(this.minX + this.bw / 2, this.minY + this.bh / 2);
        imageMode(CENTER);

        // Chassis shadow casting onto pipes and gears
        push();
        translate(3, 3);
        tint(0, 0, 0, 60);
        image(this.machinedChassis, 0, 0);
        pop();

        noTint();
        image(this.machinedChassis, 0, 0);
        pop();
    }

    // Draw a grid-routed (L-shaped) connecting shaft into a target p5.Graphics buffer.
    drawGearShaft(g1, g2, target) {
        let dx = g2.x - g1.x;
        let dy = g2.y - g1.y;
        if (abs(dx) < 1 && abs(dy) < 1) return;

        let midX = abs(dx) >= abs(dy) ? g2.x : g1.x;
        let midY = abs(dx) >= abs(dy) ? g1.y : g2.y;

        let pts = [
            { x: g1.x, y: g1.y },
            { x: midX, y: midY },
            { x: g2.x, y: g2.y }
        ];

        // Match background pipe width
        let w = this.pipeWidth * ((this.widthVarMin + this.widthVarMax) / 2) * 1.0;
        let halfW = w / 2;

        let c1 = color(g1.c), c2 = color(g2.c);
        let pipeCol = lerpColor(c1, c2, 0.5);
        let darkCol = color(red(pipeCol) * 0.38, green(pipeCol) * 0.38, blue(pipeCol) * 0.38);
        let lightCol = color(min(255, red(pipeCol) + 45), min(255, green(pipeCol) + 45), min(255, blue(pipeCol) + 45));

        let dense = this._resamplePath(pts);

        // 1. Shadow pass
        target.push();
        target.translate(this.shadowOffset * 0.6, this.shadowOffset * 0.6);
        target.noFill();
        target.stroke(0, 0, 0, this.shadowAlpha * 0.7);
        target.strokeWeight(w + this.shadowOffset * 0.4);
        this.drawPipePath(target, pts);
        target.pop();

        // 2. Gradient cylindrical fill
        this._drawGradientPolyline(target, dense, halfW, darkCol, lightCol);

        // 3. Joint collar band at the elbow
        let prev = pts[0], elbow = pts[1];
        if (dist(prev.x, prev.y, elbow.x, elbow.y) > 0.1) {
            let jA = { x: lerp(prev.x, elbow.x, 0.93), y: lerp(prev.y, elbow.y, 0.93) };
            this._drawJointBand(target, jA, elbow, halfW + 3, darkCol, lightCol);
        }

        target.noFill();
    }
}
class ArtLayer {
    constructor(opts = {}) {
        this.drawMode = opts.drawMode || 'circle'; // 'circle' | 'straight' | 'paper' | 'l'
        this.col = opts.palette || ['#A68160'];
        this.lSide = opts.lSide || (Math.random() < 0.5 ? 'left' : 'right');
        this.lSideY = opts.lSideY || 'top'; // 'top' | 'bottom'
        this.lCorner = 'sharp'; // L mode: sharp miter only (rounded disabled for now)
        // Paper mode: circle opening position as fraction of canvas (0–1)
        this.paperCpX = opts.paperCpX !== undefined ? opts.paperCpX : 0.35;
        this.paperCpY = opts.paperCpY !== undefined ? opts.paperCpY : 0.24;
        this.artScaleR = 200;
        this.targetTotalHeight = opts.targetTotalHeight || 3.3; // Default total height
        this.rows = opts.rows || [];
        this.adjustRowHeights();
        this._buildLayerGroups();
    }

    _buildLayerGroups() {
        this._maxLayer = 0;
        for (let row of this.rows) if ((row.layer || 0) > this._maxLayer) this._maxLayer = row.layer || 0;
        this._layerRows = {};
        for (let i = 0; i <= this._maxLayer; i++) {
            this._layerRows[i] = this.rows.filter(r => (r.layer || 0) === i);
        }
    }

    adjustRowHeights() {
        if (!this.rows || this.rows.length === 0) return;
        let currentTotal = 0;
        for (let row of this.rows) {
            currentTotal += row.rowHeightTotal;
        }
        if (currentTotal === 0) return;
        let scale = this.targetTotalHeight / currentTotal;
        for (let row of this.rows) {
            row.rowHeight *= scale;
        }
    }

    init() {
        if (!this.paperBg) this._initPaperBg(width);
    }

    // ── L-mode: sharp miter path (top leg → corner vertex → side leg) ──────────

    /** Arc length of the sharp offset polyline at inset depth d. */
    _lSharpTotalLen(d = 0) {
        d = max(0, d);
        return max(1, (width - d) + (height - d));
    }

    /**
     * Point on the sharp L offset path at arc distance s and inset depth d.
     * d = 0 sits on the canvas outer edges; larger d goes deeper into the canvas.
     */
    _lSharpPointAtS(s, d) {
        const cw = width * 0.5;
        const ch = height * 0.5;
        d = max(0, d);
        const hLen = max(0, width - d);

        let xHStart, xHEnd, yH;
        let xV, yVStart, yVEnd;
        let tH, tV;

        if (this.lSideY === 'bottom') {
            yH = ch - d;
            yVStart = ch - d;
            yVEnd = -ch;
            if (this.lSide === 'right') {
                xHStart = -cw; xHEnd = cw - d; xV = cw - d;
                tH = 0; tV = -HALF_PI;
            } else {
                xHStart = cw; xHEnd = -cw + d; xV = -cw + d;
                tH = PI; tV = -HALF_PI;
            }
        } else {
            yH = -ch + d;
            yVStart = -ch + d;
            yVEnd = ch;
            if (this.lSide === 'right') {
                xHStart = -cw; xHEnd = cw - d; xV = cw - d;
                tH = 0; tV = HALF_PI;
            } else {
                xHStart = cw; xHEnd = -cw + d; xV = -cw + d;
                tH = PI; tV = HALF_PI;
            }
        }

        if (s <= hLen) {
            let lerpX = map(s, 0, hLen, xHStart, xHEnd);
            return { x: lerpX, y: yH, tangent: tH };
        } else {
            let vLen = height - d;
            let lerpY = map(s - hLen, 0, vLen, yVStart, yVEnd);
            return { x: xV, y: lerpY, tangent: tV };
        }
    }

    _lPointFromA(a, d) {
        const totalLen = this._lSharpTotalLen(d);
        let s = ((a / TWO_PI) * totalLen) % totalLen;
        if (s < 0) s += totalLen;
        return this._lSharpPointAtS(s, d);
    }

    /** Trace the sharp L polyline at inset depth d (explicit corner vertex). */
    _lTraceOffsetPoly(d, steps = 80) {
        const cw = width * 0.5;
        const ch = height * 0.5;
        d = max(0, d);

        let yH = (this.lSideY === 'bottom') ? ch - d : -ch + d;
        let xCorner = (this.lSide === 'right') ? cw - d : -cw + d;
        let xStart = (this.lSide === 'right') ? -cw : cw;
        let yEnd = (this.lSideY === 'bottom') ? -ch : ch;

        const hSteps = max(2, floor(steps * (width - d) / (width + height)));
        const vSteps = max(2, steps - hSteps);

        for (let i = 0; i <= hSteps; i++) {
            vertex(lerp(xStart, xCorner, i / hSteps), yH);
        }
        for (let i = 1; i <= vSteps; i++) {
            vertex(xCorner, lerp(yH, yEnd, i / vSteps));
        }
    }

    _lTraceBandRing(innerD, outerD, steps = 80) {
        this._lTraceOffsetPoly(outerD, steps);

        const cw = width * 0.5;
        const ch = height * 0.5;
        innerD = max(0, innerD);

        let yH = (this.lSideY === 'bottom') ? ch - innerD : -ch + innerD;
        let xCorner = (this.lSide === 'right') ? cw - innerD : -cw + innerD;
        let xStart = (this.lSide === 'right') ? -cw : cw;
        let yEnd = (this.lSideY === 'bottom') ? -ch : ch;

        const hSteps = max(2, floor(steps * (width - innerD) / (width + height)));
        const vSteps = max(2, steps - hSteps);

        for (let i = vSteps; i >= 1; i--) {
            vertex(xCorner, lerp(yH, yEnd, i / vSteps));
        }
        for (let i = hSteps; i >= 0; i--) {
            vertex(lerp(xStart, xCorner, i / hSteps), yH);
        }
    }

    getXY(a, radius) {
        if (this.drawMode === 'straight') {
            return {
                x: this.artScaleR - radius,
                y: map(a, 0, TWO_PI, -STRAIGHT_ARC_LENGTH * 0.5, STRAIGHT_ARC_LENGTH * 0.5)
            };
        }
        if (this.drawMode === 'l') {
            let p = this._lPointFromA(a, radius);
            return { x: p.x, y: p.y };
        }
        return { x: cos(a) * radius, y: sin(a) * radius };
    }

    getRotation(a, radius) {
        if (this.drawMode === 'straight') return 0;
        if (this.drawMode === 'l') return this._lPointFromA(a, radius).tangent;
        return a;
    }

    getArcLength(trackR) {
        if (this.drawMode === 'straight') return STRAIGHT_ARC_LENGTH;
        if (this.drawMode === 'l') return this._lSharpTotalLen(trackR);
        return trackR * TWO_PI;
    }

    /** Append vertices along the path at inset depth radius. */
    tracePath(radius, steps = 80) {
        if (this.drawMode === 'l') {
            this._lTraceOffsetPoly(radius, steps);
            return;
        }
        for (let j = 0; j <= steps; j++) {
            let a = (j / steps) * TWO_PI;
            let p = this.getXY(a, radius);
            vertex(p.x, p.y);
        }
    }

    drawArcBackground(startA, endA, innerR, outerR) {
        if (!this.paperBg) this._initPaperBg(width);
        push();

        const fullLoop = abs(endA - startA - TWO_PI) < 0.01;

        // Pass 1: base col[0] fill with drop shadow
        drawingContext.save();
        drawingContext.shadowBlur = 15;
        drawingContext.shadowColor = 'rgba(0, 0, 0, 0.3)';
        drawingContext.shadowOffsetX = 3;
        drawingContext.shadowOffsetY = 3;
        fill(this.col[0]);
        noStroke();
        beginShape();
        if (this.drawMode === 'l' && fullLoop) {
            this._lTraceBandRing(innerR, outerR);
        } else {
            for (let i = 0; i <= 60; i++) {
                let a = startA + (i / 60) * (endA - startA);
                let p = this.getXY(a, outerR);
                vertex(p.x, p.y);
            }
            for (let i = 60; i >= 0; i--) {
                let a = startA + (i / 60) * (endA - startA);
                let p = this.getXY(a, innerR);
                vertex(p.x, p.y);
            }
        }
        endShape(CLOSE);
        drawingContext.restore();

        // Pass 2: fiber grain + Perlin noise clipped to the band shape
        drawingContext.save();
        drawingContext.beginPath();
        if (this.drawMode === 'l' && fullLoop) {
            const steps = 80;
            const cw = width * 0.5;
            const ch = height * 0.5;
            const total = width + height;
            const hStepsO = max(2, floor(steps * (width - outerR) / total));
            const vStepsO = max(2, steps - hStepsO);
            const hStepsI = max(2, floor(steps * (width - innerR) / total));
            const vStepsI = max(2, steps - hStepsI);

            const traceCtx = (d, hS, vS, reverse) => {
                let yH = (this.lSideY === 'bottom') ? ch - d : -ch + d;
                let xC = (this.lSide === 'right') ? cw - d : -cw + d;
                let xStart = (this.lSide === 'right') ? -cw : cw;
                let yEnd = (this.lSideY === 'bottom') ? -ch : ch;

                if (!reverse) {
                    for (let i = 0; i <= hS; i++) {
                        const x = lerp(xStart, xC, i / hS), y = yH;
                        i === 0 ? drawingContext.moveTo(x, y) : drawingContext.lineTo(x, y);
                    }
                    for (let i = 1; i <= vS; i++) {
                        drawingContext.lineTo(xC, lerp(yH, yEnd, i / vS));
                    }
                } else {
                    for (let i = vS; i >= 1; i--) drawingContext.lineTo(xC, lerp(yH, yEnd, i / vS));
                    for (let i = hS; i >= 0; i--) drawingContext.lineTo(lerp(xStart, xC, i / hS), yH);
                }
            };
            traceCtx(outerR, hStepsO, vStepsO, false);
            traceCtx(innerR, hStepsI, vStepsI, true);
        } else {
            for (let i = 0; i <= 60; i++) {
                let a = startA + (i / 60) * (endA - startA);
                let p = this.getXY(a, outerR);
                if (i === 0) drawingContext.moveTo(p.x, p.y);
                else drawingContext.lineTo(p.x, p.y);
            }
            for (let i = 60; i >= 0; i--) {
                let a = startA + (i / 60) * (endA - startA);
                let p = this.getXY(a, innerR);
                drawingContext.lineTo(p.x, p.y);
            }
        }
        drawingContext.closePath();
        drawingContext.clip();
        imageMode(CENTER);
        image(this.paperBg, 0, 0);
        drawingContext.restore();

        pop();
    }

    // 'paper' mode — makeBackground2 + makeOverallTexture, no rows
    _initPaperBg(w = width) {
        this._paperW = w;
        let c0 = color(this.col[0]);
        let r0 = red(c0), g0 = green(c0), b0 = blue(c0);
        this.paperBg = createGraphics(w * 2, height * 2); // Make it huge so it covers everything when rotated
        for (let y = 0; y < this.paperBg.height; y += 0.1) {
            // Stateless pseudo-random x based on y
            let s = sin(y * 1234.567) * 43758.5453;
            let x = (s - Math.floor(s)) * this.paperBg.width;
            this.paperBg.strokeWeight(0.1);
            let n = noise(y / 5); // FIX: Proper noise scaling for fine grain
            this.paperBg.stroke(r0 - 30 * n, g0 - 30 * n, b0 - 30 * n);
            this.paperBg.line(0, y, x, y);
            this.paperBg.stroke(min(255, r0 + 10 * (1 - n)), min(255, g0 + 10 * (1 - n)), min(255, b0 + 5 * (1 - n)));
            this.paperBg.line(x, y, this.paperBg.width, y);
        }
    }

    display(x, y, r) {
        // Paper mode: full-canvas paper fill with circle opening + GearLayout2 cluster on top
        if (this.drawMode === 'paper') {
            if (!this.paperBg || this._paperW !== r) this._initPaperBg(r);
            push();
            translate(x, y);

            let cpX = width * this.paperCpX;
            let cpY = height * this.paperCpY;
            let cpR = r * 0.50;

            if (isArtBaking) {
                // Full-canvas fill minus the circle opening
                drawingContext.save();
                drawingContext.beginPath();
                drawingContext.rect(-width, -height, width * 4, height * 4);
                drawingContext.moveTo(cpX + cpR, cpY);
                drawingContext.arc(cpX, cpY, cpR, 0, Math.PI * 2);
                drawingContext.clip('evenodd');
                noStroke();
                fill(this.col[0]);
                rect(-width, -height, width * 4, height * 4);
                imageMode(CORNER);
                image(this.paperBg, 0, 0);
                drawingContext.restore();
            }

            // Rows orbiting the circle rim — same layout as circle mode
            push();
            translate(cpX, cpY);
            drawingContext.save();
            drawingContext.beginPath();
            drawingContext.rect(-width * 3, -height * 3, width * 6, height * 6);
            drawingContext.arc(0, 0, cpR, 0, Math.PI * 2);
            drawingContext.clip('evenodd');

            let paperR = height * 0.15;
            this.artScaleR = paperR;
            let arcCursor = cpR / paperR;
            for (let row of this.rows) arcCursor += row.rowHeightTotal;
            for (let row of this.rows) {
                row._outerRadius = arcCursor;
                arcCursor -= row.rowHeightTotal;
            }
            for (let layer = 0; layer <= this._maxLayer; layer++) {
                for (let row of this._layerRows[layer]) {
                    row.display(this, paperR, row._outerRadius);
                }
            }
            drawingContext.restore();
            pop();

            // Shadow rim around the circle opening
            drawingContext.save();
            drawingContext.shadowBlur = width * 0.05;
            drawingContext.shadowColor = 'rgba(0,0,0,0.7)';
            noFill();
            strokeWeight(width * 0.016);
            stroke(col[3]);
            circle(cpX, cpY, cpR * 2);
            drawingContext.restore();

            pop();
            return;
        }

        if (!this.paperBg) this.init();
        this.artScaleR = r;
        push();
        translate(x, y);

        if (this.drawMode !== 'straight' && this.drawMode !== 'l') rotate(-0.34);

        // Layout pass: assign outerRadius (in r units) to each row in declaration order.
        let arcCursor = this.drawMode === 'l' ? 0 : 0.10;
        for (let row of this.rows) arcCursor += row.rowHeightTotal;
        let outermost = r * arcCursor;
        let innermost = r * (this.drawMode === 'l' ? 0 : 0.10);
        for (let row of this.rows) {
            row._outerRadius = arcCursor;
            arcCursor -= row.rowHeightTotal;
        }

        // Draw texture once over the full art area — single blit replaces one-per-row
        drawingContext.save();
        beginShape();
        if (this.drawMode === 'l') {
            this._lTraceBandRing(innermost, outermost);
        } else {
            for (let i = 0; i <= 60; i++) {
                let a = (i / 60) * TWO_PI;
                let p = this.getXY(a, outermost);
                vertex(p.x, p.y);
            }
            for (let i = 60; i >= 0; i--) {
                let a = (i / 60) * TWO_PI;
                let p = this.getXY(a, innermost);
                vertex(p.x, p.y);
            }
        }
        endShape(CLOSE);
        drawingContext.clip();
        imageMode(CENTER);

        // Render using pre-grouped layer arrays — no per-frame filtering
        // Rows stay INSIDE the annular clip so nothing leaks outside the art area
        for (let layer = 0; layer <= this._maxLayer; layer++) {
            for (let row of this._layerRows[layer]) {
                row.display(this, r, row._outerRadius);
            }
        }

        drawingContext.restore();
        pop();
    }
}
class CircleArcRow {
    constructor(rowHeight = 0.15, layer = 0) {
        this.startA = 0;
        this.endA = TWO_PI;
        this.rowHeight = rowHeight;
        this.gapPx = 1;
        this.speed = 0.018;
        this.layer = layer;
    }

    get rowHeightTotal() { return this.rowHeight; }

    display(art, r, outerRadius) {
        let rowHeight = r * this.rowHeight;
        let outerR = r * outerRadius;
        let innerR = outerR - rowHeight;
        let trackR = (innerR + outerR) * 0.5;
        let size = (outerR - innerR) * 0.85; // 15% padding so strokes don't bleed
        let arcLength = art.getArcLength(trackR);
        let scaleFactor = r / 90.0;
        let gapPx = this.gapPx * scaleFactor;
        let count = max(1, floor(arcLength / (size + gapPx)));
        let step = (this.endA - this.startA) / count;
        let totalSteps = floor((frameCount * this.speed) / step);
        let phase = (frameCount * this.speed) % step;

        if (isArtBaking) {
            art.drawArcBackground(this.startA, this.endA, innerR, outerR);
            return;
        }

        strokeWeight(width * 0.005);

        for (let i = -1; i < count; i++) {
            let a = this.startA + i * step + phase;
            let p = art.getXY(a, trackR);

            // Stable identifier per circle (doesn't change as it scrolls)
            let globalIdx = i - totalSteps;
            // Deterministic stroke count 0-3 based on global index
            let hash = ((globalIdx * 2654435761) >>> 0) % 4;
            let numStrokes = hash;

            // Determine alternating color from col[1,2,3,4] completely unlinked from numStrokes
            let s = sin(globalIdx * 123.456) * 43758.5453;
            let colHash = floor(abs(s)) % 4;
            let targetColor = col[colHash + 1];

            if (numStrokes === 0) {
                noStroke();
                fill(targetColor);
                circle(p.x, p.y, size);
            } else {
                stroke(targetColor);

                // Circle-level decision for hollow vs shadow
                let isHollow = (((globalIdx * 846283) >>> 0) % 2) === 0;

                for (let j = 0; j < numStrokes; j++) {
                    let scale = 1 - (j * 0.18);

                    if (isHollow) {
                        noFill();
                    } else {
                        // Shadow circles only get the fill on the outermost ring
                        if (j === 0) {
                            fill(0, 40);
                        } else {
                            noFill();
                        }
                    }

                    circle(p.x, p.y, size * scale);
                }
            }
        }

        return innerR / r;
    }
}
class SquareArcRow {
    constructor(rowHeight = 0.15, layer = 0) {
        this.startA = 0;
        this.endA = TWO_PI;
        this.rowHeight = rowHeight;
        this.gapPx = 10; // Clear 10px gap between consecutive squares
        this.speed = 0.018;
        this.layer = layer;
    }

    get rowHeightTotal() { return this.rowHeight; }

    display(art, r, outerRadius) {
        let rowHeight = r * this.rowHeight;
        let outerR = r * outerRadius;
        let innerR = outerR - rowHeight;
        let trackR = (innerR + outerR) * 0.5;
        let size = (outerR - innerR) * 0.68; // Scaled rect size for clean breathing room
        let arcLength = art.getArcLength(trackR);
        let scaleFactor = r / 90.0;
        let gapPx = this.gapPx * scaleFactor;
        let count = max(1, floor(arcLength / (size + gapPx)));
        let step = (this.endA - this.startA) / count;
        let totalSteps = floor((frameCount * this.speed) / step);
        let phase = (frameCount * this.speed) % step;

        if (isArtBaking) {
            art.drawArcBackground(this.startA, this.endA, innerR, outerR);
            return;
        }

        strokeWeight(width * 0.008);

        for (let i = -1; i < count; i++) {
            let a = this.startA + i * step + phase;
            let p = art.getXY(a, trackR);
            let rot = art.getRotation(a, trackR);

            // Stable identifier per square (doesn't change as it scrolls)
            let globalIdx = i - totalSteps;
            // Deterministic stroke count 0-3 based on global index
            let hash = ((globalIdx * 2654435761) >>> 0) % 4;
            let numStrokes = hash;

            // Determine alternating color from col[1,2,3,4] completely unlinked from numStrokes
            let s = sin(globalIdx * 123.456) * 43758.5453;
            let colHash = floor(abs(s)) % 4;
            let targetColor = col[colHash + 1];

            push();
            translate(p.x, p.y);
            rotate(rot);
            rectMode(CENTER);

            if (numStrokes === 0) {
                noStroke();
                fill(targetColor);
                rect(0, 0, size, size);
            } else {
                stroke(targetColor);

                // Square-level decision for hollow vs shadow
                let isHollow = (((globalIdx * 846283) >>> 0) % 2) === 0;

                for (let j = 0; j < numStrokes; j++) {
                    let scale = 1 - (j * 0.18);

                    if (isHollow) {
                        noFill();
                    } else {
                        // Shadow squares only get the fill on the outermost ring
                        if (j === 0) {
                            fill(0, 40);
                        } else {
                            noFill();
                        }
                    }

                    rect(0, 0, size * scale, size * scale);
                }
            }
            pop();
        }

        return innerR / r;
    }
}
class TriangleGridArcRow {
    constructor(rowHeight = 0.15, layer = 0) {
        this.startA = 0;
        this.endA = TWO_PI;
        this.rowHeight = rowHeight;
        this.numLanes = 3; // Always exactly 3 lanes (col 0: Up, col 1: Down, col 2: Up)
        this.speed = 0.015;
        this.layer = layer;
    }

    get rowHeightTotal() { return this.rowHeight; }

    display(art, r, outerRadius) {
        let rowHeight = r * this.rowHeight;
        let outerR = r * outerRadius;
        let innerR = outerR - rowHeight;
        let trackR = (innerR + outerR) * 0.5;
        let arcLength = art.getArcLength(trackR);

        // Scale triangle size to use ~80% of the band height
        let s = rowHeight / 7;
        let spacingX = 2 * s;
        let spacingY = 2.5 * s;

        let count = max(1, floor(arcLength / spacingY));
        let step = (this.endA - this.startA) / count;
        let totalSteps = floor((frameCount * this.speed) / step);
        let phase = (frameCount * this.speed) % step;

        if (isArtBaking) {
            art.drawArcBackground(this.startA, this.endA, innerR, outerR);
            return;
        }

        strokeWeight(width * 0.0025);
        noFill();

        for (let i = -1; i < count; i++) {
            let a = this.startA + i * step + phase;
            let globalIdx = i - totalSteps;


            for (let cIdx = 0; cIdx < 3; cIdx++) {
                let laneOffset = (cIdx - 1) * spacingX;
                let p, rot;

                if (art.drawMode === 'l') {
                    // L mode: offset perpendicular to path direction
                    let pCenter = art.getXY(a, trackR);
                    let tangent = art.getRotation(a, trackR);
                    let perpAngle = tangent + HALF_PI;
                    p = {
                        x: pCenter.x + cos(perpAngle) * laneOffset,
                        y: pCenter.y + sin(perpAngle) * laneOffset
                    };

                    let totalLen = art._lSharpTotalLen(trackR);
                    let hLen = width - trackR;
                    let sPos = ((a / TWO_PI) * totalLen) % totalLen;
                    if (sPos < 0) sPos += totalLen;

                    if (sPos > hLen) {
                        rot = 0; // Vertical leg: △ ▽ △
                    } else {
                        rot = HALF_PI; // Horizontal leg: ◁ ▷ ◁
                    }
                } else {
                    let laneR = trackR + laneOffset;
                    p = art.getXY(a, laneR);
                    rot = art.getRotation(a, laneR);
                }

                stroke(col[4]);

                push();
                translate(p.x, p.y);
                rotate(rot);

                if (cIdx % 2 === 0) {
                    triangle(0, -s, -s * 0.866, s * 0.5, s * 0.866, s * 0.5);
                } else {
                    triangle(0, s, -s * 0.866, -s * 0.5, s * 0.866, -s * 0.5);
                }
                pop();
            }
        }

        return innerR / r;
    }
}
class LayeredBlockArcRow {
    constructor(rowHeight = 0.18, numLanes = 3, layer = 0) {
        this.startA = 0;
        this.endA = TWO_PI;
        this.rowHeight = rowHeight;
        this.numLanes = numLanes;
        this.speed = 0.015;
        this.layer = layer;
    }

    get rowHeightTotal() { return this.rowHeight; }

    display(art, r, outerRadius) {
        let rowHeight = r * this.rowHeight;
        let outerR = r * outerRadius;
        let innerR = outerR - rowHeight;
        let trackR = (innerR + outerR) * 0.5;
        let arcLength = art.getArcLength(trackR);
        let scaleFactor = r / 90.0;

        let laneWidth = rowHeight / this.numLanes;
        let blockSize = laneWidth * 0.96;
        let spacingY = blockSize * 0.98;

        let count = max(1, floor(arcLength / spacingY));
        let step = (this.endA - this.startA) / count;
        let totalSteps = floor((frameCount * this.speed) / step);
        let phase = (frameCount * this.speed) % step;

        if (isArtBaking) {
            art.drawArcBackground(this.startA, this.endA, innerR, outerR);
            return;
        }

        strokeWeight(width * 0.004);
        rectMode(CENTER);

        for (let i = -1; i < count; i++) {
            let a = this.startA + i * step + phase;
            let globalIdx = i - totalSteps;

            for (let cIdx = 0; cIdx < this.numLanes; cIdx++) {
                let laneOffset = (cIdx - (this.numLanes - 1) * 0.5) * laneWidth;
                let p, rot;

                if (art.drawMode === 'l') {
                    let pCenter = art.getXY(a, trackR);
                    let tangent = art.getRotation(a, trackR);
                    let perpAngle = tangent + HALF_PI;
                    p = {
                        x: pCenter.x + cos(perpAngle) * laneOffset,
                        y: pCenter.y + sin(perpAngle) * laneOffset
                    };
                    rot = 0;
                } else {
                    let laneR = trackR + laneOffset;
                    p = art.getXY(a, laneR);
                    rot = art.getRotation(a, laneR);
                }

                let hash = sin(globalIdx * 12.34 + cIdx * 56.78) * 43758.5453;
                let baseColIdx = floor(abs(hash)) % 5;

                push();
                translate(p.x, p.y);
                rotate(rot);

                // Draw 4 nested layers from outer down to inner with irregular width & height
                for (let k = 4; k >= 1; k--) {
                    let hashW = sin(globalIdx * 12.34 + cIdx * 56.78 + k * 91.23) * 43758.5453;
                    let hashH = cos(globalIdx * 43.21 + cIdx * 87.65 + k * 19.32) * 43758.5453;

                    let wFactor = 0.4 + (abs(hashW) % 1.0) * 0.65;
                    let hFactor = 0.4 + (abs(hashH) % 1.0) * 0.65;

                    let scaleRatio = k / 4;
                    let w = blockSize * scaleRatio * wFactor;
                    let h = blockSize * scaleRatio * hFactor;

                    let layerCol;
                    if (k === 2 || k == 3 || k == 4) {
                        layerCol = col[(baseColIdx + (4 - k)) % 5];
                        // layerCol = col[((baseColIdx + (4 - k)) % 4) + 1];
                    } else {
                        layerCol = col[((baseColIdx + (4 - k)) % 4) + 1];
                    }
                    fill(layerCol);
                    noStroke()
                    // stroke(col[3]);
                    //strokeWeight(1.2);

                    rect(0, 0, w, h);
                }

                pop();
            }
        }

        return innerR / r;
    }
}
class BlackWhiteTileArc {
    constructor(rowHeight = 0.09, tileWidthRatio = 0.55, layer = 0) {
        this.startA = 0;
        this.endA = TWO_PI;
        this.rowHeight = rowHeight;
        this.tileWidthRatio = tileWidthRatio;
        this.tiles = 132;
        this.layer = layer;
    }

    get rowHeightTotal() { return this.rowHeight; }

    display(art, r, outerRadius) {
        let rowHeight = r * this.rowHeight;
        let outerR = r * outerRadius;
        let innerR = outerR - rowHeight;
        let trackR = (innerR + outerR) * 0.5;
        let arcLength = art.getArcLength(trackR);
        let scaleFactor = r / 90.0;
        let tileW = rowHeight * this.tileWidthRatio;
        let tileH = rowHeight * 0.92;
        let tiles = max(8, floor(arcLength / tileW));
        if (tiles % 2 !== 0) tiles++;
        let step = (this.endA - this.startA) / tiles;
        let hw = tileW * 0.5;
        let hh = tileH * 0.5;

        if (isArtBaking) {
            art.drawArcBackground(this.startA, this.endA, innerR, outerR);
            return;
        }

        noStroke();

        if (art.drawMode === 'l') {
            rectMode(CORNER);
            let cw = width * 0.5;
            let ch = height * 0.5;
            let cX, cY, signX, signY;
            if (art.lSideY === 'bottom') {
                cY = ch - outerR; // corner is at the bottom
                signY = -1; // extending UP
            } else {
                cY = -ch + innerR;
                signY = 1; // extending DOWN
            }

            if (art.lSide === 'right') {
                cX = cw - outerR;
                signX = -1; // extending left
            } else {
                cX = -cw + innerR;
                signX = 1; // extending right
            }

            let tSize = rowHeight * this.tileWidthRatio; // width along the leg
            let tileIndex = 0;

            // Corner — always a full rowHeight × rowHeight square (both legs overlap here)
            fill((tileIndex++) % 2 === 0 ? art.col[4] : art.col[0]);
            rect(cX, cY, rowHeight, rowHeight);

            // Horizontal leg — tiles are tSize wide × rowHeight tall
            // Start just past the corner's exit edge in the travel direction
            let xEnd = (art.lSide === 'right') ? -cw : cw;
            let currentX = cX + (signX > 0 ? rowHeight : signX * tSize);
            let hIndex = tileIndex;
            while ((art.lSide === 'right' ? currentX > xEnd - tSize : currentX < xEnd)) {
                fill((hIndex++) % 2 === 0 ? art.col[4] : art.col[0]);
                rect(currentX, cY, tSize, rowHeight);
                currentX += signX * tSize;
            }

            // Vertical leg — tiles are rowHeight wide × tSize tall
            // Start just past the corner's exit edge in the travel direction
            let yEnd = (art.lSideY === 'bottom') ? -ch : ch;
            let currentY = cY + (signY > 0 ? rowHeight : signY * tSize);
            let vIndex = tileIndex;
            while ((art.lSideY === 'bottom' ? currentY > yEnd - tSize : currentY < yEnd)) {
                fill((vIndex++) % 2 === 0 ? art.col[4] : art.col[0]);
                rect(cX, currentY, rowHeight, tSize);
                currentY += signY * tSize;
            }
            return innerR / r;
        }

        for (let i = 0; i < tiles; i++) {
            let a = this.startA + i * step + step * 0.5;
            fill(i % 2 === 0 ? art.col[4] : art.col[0]);
            if (art.drawMode === 'straight') {
                rectMode(CENTER);
                let p = art.getXY(a, trackR);
                rect(p.x, p.y, tileH, tileW);
            } else {
                let deltaA = hw / trackR;
                let p1 = art.getXY(a - deltaA, trackR - hh);
                let p2 = art.getXY(a + deltaA, trackR - hh);
                let p3 = art.getXY(a + deltaA, trackR + hh);
                let p4 = art.getXY(a - deltaA, trackR + hh);
                beginShape();
                vertex(p1.x, p1.y);
                vertex(p2.x, p2.y);
                vertex(p3.x, p3.y);
                vertex(p4.x, p4.y);
                endShape(CLOSE);
            }
        }

        return innerR / r;
    }
}
class SlantedLineArc {

    constructor(
        rowHeight = 0.04,
        bandWidth = 90,   // degrees
        angle = 32,       // degrees
        speed = 1,        // degrees per frame
        layer = 0,
        bands = null
    ) {

        // internally EVERYTHING uses degrees

        this.startA = 0;
        this.endA = 360;

        this.rowHeight = rowHeight;

        this.bandWidth = bandWidth;

        this.angle = angle;

        this.speed = speed;

        this.layer = layer;

        this.bands = bands || [
            { offset: 0, width: bandWidth, colorIdx: 2, pattern: 'slanted' },
            { offset: 180, width: 70, colorIdx: 3, pattern: 'concentric' },
        ];
    }

    get rowHeightTotal() {
        return this.rowHeight;
    }

    /** Bounding box + draw origin for a path segment (L / circle clip regions). */
    _segmentBounds(art, sA, eA, innerR, outerR) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const span = max(0.001, eA - sA);
        const step = max(1, span / 48);
        for (let a = sA; a <= eA + 0.001; a += step) {
            for (let rad of [innerR, outerR, (innerR + outerR) * 0.5]) {
                let p = art.getXY(radians(a), rad);
                minX = min(minX, p.x);
                maxX = max(maxX, p.x);
                minY = min(minY, p.y);
                maxY = max(maxY, p.y);
            }
        }
        const w = maxX - minX;
        const h = maxY - minY;
        return {
            cx: (minX + maxX) * 0.5,
            cy: (minY + maxY) * 0.5,
            limit: max(w, h) * 0.55 + (outerR - innerR) * 1.5
        };
    }

    drawSegmentShape(
        art,
        sA,
        eA,
        innerR,
        outerR
    ) {

        beginShape();

        if (art.drawMode === 'straight') {

            let p1 = art.getXY(
                radians(sA),
                outerR
            );

            let p2 = art.getXY(
                radians(eA),
                outerR
            );

            let p3 = art.getXY(
                radians(eA),
                innerR
            );

            let p4 = art.getXY(
                radians(sA),
                innerR
            );

            vertex(p1.x, p1.y);
            vertex(p2.x, p2.y);
            vertex(p3.x, p3.y);
            vertex(p4.x, p4.y);

        } else if (art.drawMode === 'l') {

            let trackR = (innerR + outerR) * 0.5;
            let refTotalLen = art._lSharpTotalLen(trackR);
            let sCStart = (sA / 360) * refTotalLen;
            let sCEnd = (eA / 360) * refTotalLen;
            let hLenC = max(0, width - trackR);

            let cw = width * 0.5, ch = height * 0.5;

            let getOrtho = (s, d) => {
                let pC = art._lSharpPointAtS(s, trackR);
                let yH_d = (art.lSideY === 'bottom') ? ch - d : -ch + d;
                let xV_d = (art.lSide === 'right') ? cw - d : -cw + d;
                if (s <= hLenC) return { x: pC.x, y: yH_d };
                return { x: xV_d, y: pC.y };
            };

            let pOS = getOrtho(sCStart, outerR);
            let pOE = getOrtho(sCEnd, outerR);
            let pIE = getOrtho(sCEnd, innerR);
            let pIS = getOrtho(sCStart, innerR);

            let cO = {
                x: (art.lSide === 'right') ? cw - outerR : -cw + outerR,
                y: (art.lSideY === 'bottom') ? ch - outerR : -ch + outerR
            };
            let cI = {
                x: (art.lSide === 'right') ? cw - innerR : -cw + innerR,
                y: (art.lSideY === 'bottom') ? ch - innerR : -ch + innerR
            };

            vertex(pOS.x, pOS.y);
            if (sCStart <= hLenC && sCEnd > hLenC) vertex(cO.x, cO.y);
            vertex(pOE.x, pOE.y);

            vertex(pIE.x, pIE.y);
            if (sCStart <= hLenC && sCEnd > hLenC) vertex(cI.x, cI.y);
            vertex(pIS.x, pIS.y);

        } else {

            // circle — degree stepping

            for (
                let a = sA;
                a <= eA + 0.1;
                a += 2
            ) {

                let p = art.getXY(
                    radians(a),
                    outerR
                );

                vertex(p.x, p.y);
            }

            for (
                let a = eA;
                a >= sA - 0.1;
                a -= 2
            ) {

                let p = art.getXY(
                    radians(a),
                    innerR
                );

                vertex(p.x, p.y);
            }
        }

        endShape(CLOSE);
    }

    display(
        art,
        r,
        outerRadius
    ) {

        let rowHeight =
            r * this.rowHeight;

        let outerR =
            r * outerRadius;

        let innerR =
            outerR - rowHeight;

        // background track

        let bgOuterR =
            outerR + 2;

        let bgInnerR =
            max(0, innerR - 2);

        if (isArtBaking) {
            art.drawArcBackground(
                radians(this.startA),
                radians(this.endA),
                bgInnerR,
                bgOuterR
            );
            return;
        }

        let theta =
            (frameCount * this.speed) % 360;

        if (theta < 0) {
            theta += 360;
        }

        for (let band of this.bands) {

            let startAngle =
                (theta + band.offset) % 360;

            let bw = band.width;

            let segments = [];

            if ((art.drawMode === 'straight' || art.drawMode === 'l') && startAngle + bw > 360) {

                segments.push({
                    s: startAngle,
                    e: 360
                });

                segments.push({
                    s: 0,
                    e: (startAngle + bw) - 360
                });

            } else {

                segments.push({
                    s: startAngle,
                    e: startAngle + bw
                });
            }

            for (let seg of segments) {

                // fill

                push();

                translate(0, 2);

                fill(art.col[band.colorIdx]);

                noStroke();

                this.drawSegmentShape(
                    art,
                    seg.s,
                    seg.e,
                    innerR,
                    outerR
                );

                pop();

                // clipped pattern

                push();

                beginClip();

                this.drawSegmentShape(
                    art,
                    seg.s,
                    seg.e,
                    innerR,
                    outerR
                );

                endClip();

                if (band.pattern === 'slanted') {

                    push();

                    let limit = outerR * 2.5;

                    if (art.drawMode === 'straight') {

                        let cx =
                            art.artScaleR -
                            (outerR + innerR) * 0.5;

                        translate(cx, 0);

                    } else if (art.drawMode === 'l') {

                        let bb = this._segmentBounds(art, seg.s, seg.e, innerR, outerR);
                        translate(bb.cx, bb.cy);
                        limit = bb.limit;

                        // Style B: pivot the lines based on the leg we are on
                        let midAngle = (seg.s + seg.e) * 0.5;
                        let trackR = (innerR + outerR) * 0.5;
                        let tangent = art.getRotation(radians(midAngle), trackR);
                        rotate(tangent);

                    }

                    rotate(
                        radians(this.angle)
                    );

                    let scaleFactor = width / 200.0;
                    stroke(0);
                    strokeWeight(width * 0.0025);

                    let step = 3 * scaleFactor;
                    for (
                        let i = -limit;
                        i < limit;
                        i += step
                    ) {

                        line(
                            -limit,
                            i,
                            limit,
                            i
                        );
                    }

                    pop();

                } else {

                    // concentric pattern

                    let scaleFactor = width / 200.0;
                    stroke(0);
                    strokeWeight(width * 0.004);

                    if (
                        art.drawMode === 'straight'
                    ) {

                        let step = 2 * scaleFactor;
                        for (
                            let rad = innerR + 0.5 * scaleFactor;
                            rad < outerR;
                            rad += step
                        ) {

                            let x =
                                art.artScaleR - rad;

                            line(
                                x,
                                -STRAIGHT_ARC_LENGTH * 0.5,
                                x,
                                STRAIGHT_ARC_LENGTH * 0.5
                            );
                        }

                    } else if (art.drawMode === 'l') {

                        noFill();

                        let bb = this._segmentBounds(art, seg.s, seg.e, innerR, outerR);
                        let midAngle = (seg.s + seg.e) * 0.5;
                        let trackR = (innerR + outerR) * 0.5;
                        let tangent = art.getRotation(radians(midAngle), trackR);
                        let limit = bb.limit;

                        push();
                        translate(bb.cx, bb.cy);
                        rotate(tangent); // align with leg direction
                        // draw lines perpendicular to travel direction (i.e. across the track width)
                        let step = 2 * scaleFactor;
                        for (let i = -limit; i < limit; i += step) {
                            line(i, -limit, i, limit);
                        }
                        pop();

                    } else {

                        noFill();

                        let step = 2 * scaleFactor;
                        for (
                            let rad = innerR + 0.5 * scaleFactor;
                            rad < outerR;
                            rad += step
                        ) {

                            circle(
                                0,
                                0,
                                rad * 2
                            );
                        }
                    }

                }

                pop();
            }
        }

        return innerR / r;
    }
}
class ArmGroup {
    _nodes;

    constructor(closed = false, ...sets) {
        this._nodes = sets.map((set, i) => {
            if (!set || set.g0 === undefined) {
                throw new Error(`Set at index ${i} is missing .g0`);
            }
            return set.g0;
        });

        this.r = 0.6;
        this.l = 24;
        this.closed = closed;
        this.arms = [];
        this._build();
    }

    _build() {
        const nodes = this._nodes;
        if (nodes.length < 3) return;

        const [a, b, c, d, e, f] = nodes;

        // Open: a→b, a→c, then chain c→d→e→f (up to 6 nodes)
        this.arms.push(new Arm(a, b, this.r, -PI, this.l, undefined, col[0]));
        this.arms.push(new Arm(a, c, this.r, -PI, this.l, undefined, col[0]));
        if (d) this.arms.push(new Arm(c, d, this.r, -PI, this.l, undefined, col[0]));
        if (d && e) this.arms.push(new Arm(d, e, this.r, -PI, this.l, undefined, col[0]));
        if (e && f) this.arms.push(new Arm(e, f, this.r, -PI, this.l, undefined, col[0]));

        // Close: last node→b
        const last = f || e || d;
        if (this.closed && last && b) {
            this.arms.push(new Arm(last, b, this.r, -PI, this.l, undefined, col[0]));
        }
    }

    getArms() {
        return this.arms;
    }
}
const VERT_SHADER = `precision highp float;
attribute vec3 aPosition; attribute vec2 aTexCoord;
uniform mat4 uModelViewMatrix; uniform mat4 uProjectionMatrix;
varying vec2 vUV;
void main(){
  gl_Position=uProjectionMatrix*uModelViewMatrix*vec4(aPosition,1.);
  vUV=aTexCoord;
}`;
const FRAG_SHADER = `precision highp float;
varying vec2 vUV;
uniform sampler2D source; uniform float amt;
vec3 m289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 m289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 prm(vec3 x){return m289(((x*34.)+1.)*x);}
float sn(vec2 v){
  const vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244);
  vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1,0):vec2(0,1);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=m289(i);
  vec3 p=prm(prm(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
  m*=m; m*=m;
  vec3 x2=2.*fract(p*C.www)-1.,h=abs(x2)-.5,ox=floor(x2+.5),a0=x2-ox;
  m*=1.79284291-0.85373472*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}
void main(){
  vec4 c=texture2D(source,vUV); if(c.a<.01)discard;
  vec2 uv=vUV-.5;
  float radius=length(uv);
  float angle=atan(uv.y,uv.x);
  float scratch=sn(vec2(angle*80.,radius*40.));
  float broad=sn(vec2(radius*8.,angle*1.5));
  float n=mix(-amt,amt,scratch*broad);
  float vignette=1.-smoothstep(.35,.5,radius)*.25;
  gl_FragColor=vec4((c.rgb+n)*vignette,c.a);
}`;
class GearLayout {
    constructor(x, y, col, bandOffset = 0) {
        this.gears = [];
        this.belts = [];
        this.arms = [];
        this.pistons = [];


        // Layer groups — built by buildLayerGroups() after pushTo()
        this.layerGears = {};
        this.layerBelts = {};
        this.layerArms = {};
        this.layerPistons = {};
        this.maxLayer = 0;


        this._col = col;
        this._build(x, y, col, bandOffset);
    }

    // ── FACTORY METHODS ───────────────────────────────────────────────────
    _makeSet1(ox, oy) {
        const col = this._col;
        return {
            g0: new Gear(ox - width * 0.2, oy - height * 0.25, { c: col[0], r: 0.5, speed: 0.032, e: 0.5, layer: 3, style: floor(random(24)), plate: { enabled: false, angle: 190, size: 180, color: "#2d2d2d" } }),
            g1: new Gear(ox - width * 0.302, oy - height * 0.15, { c: col[0], r: 0.33, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g2: new Gear(ox - width * 0.033, oy - height * 0.188, { a: 15, c: col[0], r: 0.33, speed: 0.032, e: 1.5, layer: 0, style: floor(random(24)) }),
            g3: new Gear(ox - width * 0.204, oy + height * 0.063, { a: 16, c: col[0], r: 0.33, speed: 0.032, e: 1.5, layer: 0, style: floor(random(24)), plate: { enabled: false, angle: 45, size: 135, color: "#2d2d2d" } }),
            g4: new Gear(ox - width * 0.054, oy + height * 0.063, { c: col[0], r: 0.33, speed: -0.032, e: 0.5, layer: 0, style: floor(random(24)) }),
            g5: new Gear(ox - width * 0.158, oy - height * 0.075, { c: col[0], r: 0.27, speed: -0.032, e: 0, layer: 0, style: floor(random(24)) }),
            g6: new Gear(ox - width * 0.2, oy - height * 0.25, { c: col[0], r: 0.3, speed: 0.032, e: 0.5, layer: 0, style: floor(random(24)) }),
        };
    }

    _makeSet2(ox, oy) {
        const col = this._col;
        return {
            g0: new Gear(ox - width * 0.4, oy - height * 0.375, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(ox - width * 0.4, oy - height * 0.25, { c: col[0], r: 0.4, speed: -0.032, layer: 1, style: floor(random(24)) }),
            g2: new Gear(ox - width * 0.218, oy - height * 0.375, { c: col[0], r: 0.37, speed: -0.045, layer: 1, style: floor(random(24)) }),
            g3: new Gear(ox - width * 0.347, oy - height * 0.538, { c: col[0], r: 0.5, speed: -0.032, layer: 0, style: floor(random(24)) }),
            g4: new Gear(ox - width * 0.4, oy - height * 0.375, { c: col[0], r: 0.33, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g5: new Gear(ox - width * 0.483, oy - height * 0.5, { c: col[0], r: 0.23, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g6: new Gear(ox - width * 0.192, oy - height * 0.475, { c: col[0], r: 0.27, speed: 0.032, layer: 0, style: floor(random(24)) }),
        };
    }

    _makeSet3(ox, oy) {
        const col = this._col;
        return {
            g0: new Gear(ox - width * 0.16, oy - height * 0.45, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(ox, oy - height * 0.488, { c: col[0], r: 0.22, speed: -0.072, layer: 0, style: floor(random(24)) }),
            g2: new Gear(ox + width * 0.1, oy - height * 0.45, { c: col[0], r: 0.28, speed: 0.0571, layer: 0, style: floor(random(24)) }),
            g3: new Gear(ox, oy - height * 0.4, { c: col[0], r: 0.24, speed: -0.066, layer: 0, style: floor(random(24)) }),
            g4: new Gear(ox - width * 0.1, oy - height * 0.375, { c: col[0], r: 0.21, speed: 0.0761, layer: 1, style: floor(random(24)) }),
            g5: new Gear(ox + width * 0.09, oy - height * 0.363, { c: col[0], r: 0.22, speed: 0.0727, layer: 0, style: floor(random(24)) }),
            g6: new Gear(ox - width * 0.1, oy - height * 0.375, { c: col[0], r: 0.27, speed: 0.0761, layer: 1, style: floor(random(24)) }),
            g7: new Gear(ox - width * 0.05, oy - height * 0.275, { c: col[0], r: 0.27, speed: 0.0761, layer: 1, style: floor(random(24)) }),
        };
    }

    // ── BUILD ─────────────────────────────────────────────────────────────
    _build(x, y, col, bo) {
        let set1 = {
            g0: new Gear(x - width * 0.2, y - height * 0.25, { c: col[0], r: 0.5, speed: 0.032, e: 0.5, layer: 3, style: floor(random(24)), plate: { enabled: false, angle: 190, size: 180, color: "#2d2d2d" } }),
            g1: new Gear(x - width * 0.302, y - height * 0.15, { c: col[0], r: 0.33, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g2: new Gear(x - width * 0.033, y - height * 0.188, { a: 15, c: col[0], r: 0.33, speed: 0.032, e: 1.5, layer: 0, style: floor(random(24)) }),
            g3: new Gear(x - width * 0.204, y + height * 0.063, { a: 16, c: col[0], r: 0.33, speed: 0.032, e: 1.5, layer: 0, style: floor(random(24)), plate: { enabled: false, angle: 45, size: 135, color: "#2d2d2d" } }),
            g4: new Gear(x - width * 0.054, y + height * 0.063, { c: col[0], r: 0.33, speed: -0.032, e: 0.5, layer: 0, style: floor(random(24)) }),
            g5: new Gear(x - width * 0.158, y - height * 0.075, { c: col[0], r: 0.27, speed: -0.032, e: 0, layer: 0, style: floor(random(24)) }),
            g6: new Gear(x - width * 0.2, y - height * 0.25, { c: col[0], r: 0.3, speed: 0.032, e: 0.5, layer: 0, style: floor(random(24)) }),
        };
        let set2 = {
            g0: new Gear(x - width * 0.4, y - height * 0.375, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(x - width * 0.4, y - height * 0.25, { c: col[0], r: 0.4, speed: -0.032, layer: 1, style: floor(random(24)) }),
            g2: new Gear(x - width * 0.218, y - height * 0.375, { c: col[0], r: 0.37, speed: -0.045, layer: 1, style: floor(random(24)) }),
            g3: new Gear(x - width * 0.347, y - height * 0.538, { c: col[0], r: 0.5, speed: -0.032, layer: 0, style: floor(random(24)) }),
            g4: new Gear(x - width * 0.4, y - height * 0.375, { c: col[0], r: 0.33, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g5: new Gear(x - width * 0.483, y - height * 0.5, { c: col[0], r: 0.23, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g6: new Gear(x - width * 0.192, y - height * 0.475, { c: col[0], r: 0.27, speed: 0.032, layer: 0, style: floor(random(24)) }),
        };
        let set3 = {
            g0: new Gear(x - width * 0.16, y - height * 0.45, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(x, y - height * 0.488, { c: col[0], r: 0.22, speed: -0.072, layer: 0, style: floor(random(24)) }),
            g2: new Gear(x + width * 0.1, y - height * 0.45, { c: col[0], r: 0.28, speed: 0.0571, layer: 0, style: floor(random(24)) }),
            g3: new Gear(x, y - height * 0.4, { c: col[0], r: 0.24, speed: -0.066, layer: 0, style: floor(random(24)) }),
            g4: new Gear(x - width * 0.1, y - height * 0.375, { c: col[0], r: 0.21, speed: 0.0761, layer: 1, style: floor(random(24)) }),
            g5: new Gear(x + width * 0.09, y - height * 0.363, { c: col[0], r: 0.22, speed: 0.0727, layer: 0, style: floor(random(24)) }),
            g6: new Gear(x - width * 0.1, y - height * 0.375, { c: col[0], r: 0.27, speed: 0.0761, layer: 1, style: floor(random(24)) }),
            g7: new Gear(x - width * 0.05, y - height * 0.275, { c: col[0], r: 0.27, speed: 0.0761, layer: 1, style: floor(random(24)) }),
        };
        let set4 = {
            g0: new Gear(x + width * 0.25, y - height * 0.463, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(x + width * 0.367, y - height * 0.375, { c: col[0], r: 0.22, speed: 0.03, layer: 0, style: floor(random(24)) }),
            g2: new Gear(x + width * 0.367, y - height * 0.475, { c: col[0], r: 0.25, speed: -0.04571, layer: 2, style: floor(random(24)) }),
            g3: new Gear(x + width * 0.483, y - height * 0.463, { c: col[0], r: 0.35, speed: 0.03, layer: 0, style: floor(random(24)) }),
            g4: new Gear(x + width * 0.25, y - height * 0.4, { c: col[0], r: 0.4, speed: -0.04571, layer: 2, style: floor(random(24)) }),
            g5: new Gear(x + width * 0.39, y - height * 0.288, { c: col[0], r: 0.35, speed: -0.04571, layer: 2, style: floor(random(24)) }),
            g6: new Gear(x + width * 0.25, y - height * 0.32, { c: col[0], r: 0.25, speed: -0.04571, layer: 1, style: floor(random(24)) }),
            g7: new Gear(x + width * 0.25, y - height * 0.32, { c: col[0], r: 0.35, speed: -0.04571, layer: 3, style: floor(random(24)) }),
            g8: new Gear(x + width * 0.483, y - height * 0.363, { c: col[0], r: 0.23, speed: -0.04571, layer: 1, style: floor(random(24)) }),
        };
        let set5 = {
            g0: new Gear(x - width * 0.45, y + height * 0.1, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(x - width * 0.45, y + height * 0.25, { c: col[0], r: 0.35, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g2: new Gear(x - width * 0.26, y + height * 0.31, { c: col[0], r: 0.45, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g3: new Gear(x - width * 0.26, y + height * 0.31, { noTeeth: true, c: col[0], r: 0.40, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g4: new Gear(x - width * 0.45, y + height * 0.1, { noTeeth: true, c: col[0], r: 0.4, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g5: new Gear(x + width * 0.22, y - height * 0.3, { c: col[0], r: 0.35, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g6: new Gear(x - width * 0.5, y - height * 0.1, { c: col[0], r: 0.5, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g7: new Gear(x - width * 0.3, y - height * 0.1, { c: col[0], r: 0.3, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g8: new Gear(x - width * 0.35, y + height * 0.0, { c: col[0], r: 0.3, speed: 0.032, layer: 0, style: floor(random(24)) }),
            g9: new Gear(x - width * 0.35, y + height * 0.0, { noTeeth: true, c: col[0], r: 0.2, speed: 0.032, layer: 3, style: floor(random(24)) }),
        };
        let set6 = {
            g0: new Gear(x + width * 0.415, y + height * 0.215, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(x + width * 0.4, y + height * 0.375, { c: col[0], r: 0.4, speed: 0.04, layer: 2, style: floor(random(24)) }),
            g2: new Gear(x + width * 0.225, y + height * 0.3, { c: col[0], r: 0.5, speed: -0.032, layer: 1, style: floor(random(24)) }),
            g3: new Gear(x + width * 0.1, y + height * 0, { c: col[0], r: 0.6, speed: 0.028, layer: 0, style: floor(random(24)) }),
            g4: new Gear(x + width * 0.1, y + height * 0.1425, { c: col[0], r: 0.6, speed: 0.02667, layer: 2, style: floor(random(24)) }),
            g5: new Gear(x + width * 0.02, y + height * 0.325, { c: col[0], r: 0.4, speed: 0.04, layer: 0, style: floor(random(24)) }),
            g6: new Gear(x + width * 0.1, y + height * 0.42, { c: col[0], r: 0.4, speed: 0.04, layer: 2, style: floor(random(24)) }),
            g7: new Gear(x + width * 0.24, y + height * 0.01, { c: col[0], r: 0.4, speed: -0.04, layer: 1, style: floor(random(24)) }),
            g8: new Gear(x + width * 0.4, y + height * 0.06, { c: col[0], r: 0.42, speed: -0.0381, layer: 1, style: floor(random(24)) }),
        };
        let set7 = {
            g0: new Gear(x + width * 0.5, y - height * 0.12, { c: col[0], r: 0.5, speed: 0.032, layer: 3, style: floor(random(24)) }),
            g1: new Gear(x - width * 0, y - height * 0.313, { c: col[0], r: 0.5, speed: -0.032, layer: 1, style: floor(random(24)) }),
            g2: new Gear(x + width * 0.15, y - height * 0.2, { c: col[0], r: 0.4, speed: 0.04, layer: 0, style: floor(random(24)) }),
            g3: new Gear(x + width * 0.3, y - height * 0.125, { c: col[0], r: 0.4, speed: -0.04, layer: 1, style: floor(random(24)) }),
            g4: new Gear(x - width * 0.06, y + height * 0.45, { c: col[0], r: 0.4, speed: -0.04, layer: 0, style: floor(random(24)) }),
            g5: new Gear(x - width * 0.233, y + height * 0.5, { c: col[0], r: 0.4, speed: 0.04, layer: 0, style: floor(random(24)) }),
            g6: new Gear(x - width * 0.35, y + height * 0.42, { c: col[0], r: 0.3, speed: -0.0533, layer: 0, style: floor(random(24)) }),
            g7: new Gear(x - width * 0.48, y + height * 0.4, { c: col[0], r: 0.3, speed: 0.0533, layer: 0, style: floor(random(24)) }),
            g8: new Gear(x - width * 0.5, y + height * 0.5, { c: col[0], r: 0.3, speed: -0.0533, layer: 0, style: floor(random(24)) }),
        };
        let set8 = {
            g11: new Gear(x - width * 0.45, y - height * 0.45, { noTeeth: true, c: col[0], r: 0.4, speed: -0.04, layer: 5, style: floor(random(24)) }),
            g1: new Gear(x + width * 0.45, y - height * 0.25, { noTeeth: true, c: col[0], r: 0.4, speed: -0.04, layer: 5, style: floor(random(24)) }),
            g2: new Gear(x + width * 0.45, y + height * 0.45, { noTeeth: true, c: col[0], r: 0.6, speed: 0.04, layer: 5, style: floor(random(24)) }),
            g3: new Gear(x - width * 0.45, y + height * 0.45, { noTeeth: true, c: col[0], r: 0.6, speed: 0.04, layer: 5, style: floor(random(24)) }),
            g4: new Gear(x, y, { noTeeth: true, c: col[0], r: 0.5, speed: 0.033, layer: 5, style: floor(random(24)) }),
            g5: new Gear(x + width * 0.2, y - height * 0.2, { noTeeth: true, c: col[0], r: 0.6, speed: 0.04, layer: 5, style: floor(random(24)), plate: { enabled: true, angle: 270, size: 67, color: col[0] } }),
            g6: new Gear(x - width * 0.2, y + height * 0.2, { noTeeth: true, c: col[0], r: 0.8, speed: 0.04, layer: 5, style: floor(random(24)) }),
            g7: new Gear(x - width * 0.15, y - height * 0.15, { noTeeth: true, c: col[0], r: 0.6, speed: 0.04, layer: 5, style: floor(random(24)), plate: { enabled: true, angle: 180, size: 67, color: col[0] } }),
            g8: new Gear(x + width * 0.2, y + height * 0.2, { noTeeth: true, c: col[0], r: 0.6, speed: 0.04, layer: 5, style: floor(random(24)), plate: { enabled: true, angle: 0, size: 67, color: col[0] } }),
            g9: new Gear(x - width * 0.383, y - height * 0.25, { noTeeth: true, c: col[0], r: 0.5, speed: -0.04, layer: 5, style: floor(random(24)) }),
            g10: new Gear(x + width * 0.317, y, { noTeeth: true, c: col[0], r: 0.5, speed: 0.036, layer: 5, style: floor(random(24)), plate: { enabled: true, angle: 315, size: 67, color: col[0] } }),
        };

        // Reuse cluster shapes at new positions via private factory methods
        let setA = this._makeSet1(x + width * 0.3, y + height * 0.4);
        let setB = this._makeSet2(x + width * 0.3, y + height * 0.5);
        let setC = this._makeSet3(x - width * 0.1, y + height * 0.45);

        // ── LAYER ASSIGNMENT ──────────────────────────────────────────────
        applyLayer(set1, bo + 0);
        applyLayer(set2, bo + 1);
        applyLayer(set3, bo + 1);
        applyLayer(set4, bo + 2);
        applyLayer(set5, bo + 1);
        applyLayer(set6, bo + 2);
        applyLayer(set7, bo + 1);
        applyLayer(set8, OVERLAY_BAND + bo);
        applyLayer(setA, bo + 1);
        applyLayer(setB, bo + 2);
        applyLayer(setC, bo + 1);

        // ── GEARS ─────────────────────────────────────────────────────────
        this.gears.push(
            ...Object.values(set1).filter(Boolean),
            ...Object.values(set2).filter(Boolean),
            ...Object.values(set3).filter(Boolean),
            ...Object.values(set4).filter(Boolean),
            ...Object.values(set5).filter(Boolean),
            ...Object.values(set6).filter(Boolean),
            ...Object.values(set7).filter(Boolean),
            ...Object.values(set8).filter(Boolean),
            ...Object.values(setA).filter(Boolean),
            ...Object.values(setB).filter(Boolean),
            ...Object.values(setC).filter(Boolean),
        );

        this.sets = [set1, set2, set3, set4, set5, set6, set7, setA, setB, setC];

        // ── BELTS ─────────────────────────────────────────────────────────
        let set1Belts = [
            new Belt([{ gear: set1.g6, cw: true }, { gear: set1.g2, cw: true }, { gear: set1.g5, cw: false }, { gear: set1.g4, cw: false }, { gear: set1.g1, cw: true }], 0, 1.2, 'chain', col[0]),
        ];
        applyBeltLayer(set1Belts, bo + 0);

        let set2Belts = [
            new Belt([{ gear: set2.g1, cw: true }, { gear: set2.g2, cw: true }], 1, -1.2, 'chain', col[0]),
            new Belt([{ gear: set2.g5, cw: true }, { gear: set2.g6, cw: true }], 0, 1.2, 'chain', col[0]),
        ];
        applyBeltLayer(set2Belts, bo + 1);

        let set3Belts = [
            new Belt([{ gear: set3.g6, cw: true }, { gear: set3.g7, cw: true }], 0, 1.2, 'chain', col[0]),
        ];
        applyBeltLayer(set3Belts, bo + 1);

        let set4Belts = [
            new Belt([{ gear: set4.g2, cw: true }, { gear: set4.g5, cw: true }, { gear: set4.g4, cw: true }], 2, -0.5, 'chain', col[0]),
            new Belt([{ gear: set4.g3, cw: true }, { gear: set4.g1, cw: true }], 0, 0.5, 'chain', col[0]),
            new Belt([{ gear: set4.g6, cw: true }, { gear: set4.g8, cw: true }], 0, -0.5, 'chain', col[0]),
        ];
        applyBeltLayer(set4Belts, bo + 2);

        let set5Belts = [
            new Belt([{ gear: set5.g3, cw: true }, { gear: set5.g4, cw: true }, { gear: set5.g9, cw: true }], 2, 0.5, 'rubber', col[0]),
            new Belt([{ gear: set5.g6, cw: true }, { gear: set5.g7, cw: true }, { gear: set5.g8, cw: true }], 1, 0.5, 'chain', col[0]),
            new Belt([{ gear: set5.g2, cw: true }, { gear: set5.g1, cw: true }], 1, 0.75, 'chain', col[0]),
        ];
        applyBeltLayer(set5Belts, bo + 1);

        let set6Belts = [
            new Belt([{ gear: set6.g2, cw: true }, { gear: set6.g7, cw: true }, { gear: set6.g8, cw: true }], 2, -0.5, 'chain', col[0]),
            new Belt([{ gear: set6.g3, cw: true }, { gear: set6.g5, cw: true }], 0, 0.75, 'chain', col[0]),
        ];
        applyBeltLayer(set6Belts, bo + 2);

        let set8Belts = [
            new Belt([{ gear: set8.g4, cw: true }, { gear: set8.g6, cw: true }], 4, 0.5, 'rubber', col[0]),
            new Belt([{ gear: set8.g7, cw: true }, { gear: set8.g5, cw: true }, { gear: set8.g10, cw: true }, { gear: set8.g8, cw: true }, { gear: set8.g6, cw: true }], 4, 0.5, 'rubber', col[0]),
            new Belt([{ gear: set8.g4, cw: true }, { gear: set8.g9, cw: false }], 4, 0.5, 'rubber', col[0]),
            new Belt([{ gear: set8.g0, cw: true }, { gear: set8.g1, cw: true }, { gear: set8.g9, cw: true }], 4, -0.5, 'rubber', col[0]),
            new Belt([{ gear: set8.g2, cw: true }, { gear: set8.g3, cw: true }, { gear: set8.g6, cw: true }], 4, 0.5, 'rubber', col[0]),
        ];
        applyBeltLayer(set8Belts, OVERLAY_BAND + bo);

        this.belts.push(...set1Belts, ...set2Belts, ...set3Belts, ...set4Belts, ...set5Belts, ...set6Belts, ...set8Belts);

        // ── ARMS ──────────────────────────────────────────────────────────
        let set1Arms = [new Arm(set1.g2, set1.g3, 0.5, -PI, 1, undefined, col[0])];
        applyArmLayer(set1Arms, bo + 0);

        let set4Arms = [new Arm(set4.g5, set4.g7, 0.5, -PI, 3, undefined, col[0])];
        applyArmLayer(set4Arms, bo + 2);

        let set5Arms = [new Arm(set5.g1, set5.g5, 0.5, PI, 1, undefined, col[0])];
        applyArmLayer(set5Arms, bo + 1);

        let set7Arms = [new Arm(set7.g2, set7.g5, 0.4, -PI, 0, undefined, col[0])];
        applyArmLayer(set7Arms, bo + 1);

        let set8Arms = [new Arm(set8.g11, set8.g1, 0.6, -PI, 5, undefined, col[0])];
        applyArmLayer(set8Arms, OVERLAY_BAND + bo);

        const open = new ArmGroup(false, random(this.sets), random(this.sets), random(this.sets));
        this.arms.push(...set1Arms, ...set4Arms, ...set5Arms, ...set7Arms, ...set8Arms, ...open.getArms());

        // ── PISTONS ───────────────────────────────────────────────────────
        let set1Pistons = [new PistonEngine(set1.g5, { cylinderWidth: 10, cylinderLength: 5, layer: 0, pinR: 0.9, c: col[0], marginX: width * 0.05 })];
        applyPistonLayer(set1Pistons, bo + 0);

        let set4Pistons = [new PistonEngine(set4.g5, { cylinderWidth: 10, cylinderLength: 5, layer: 1, pinR: 0.9, marginX: width * 0.05 })];
        applyPistonLayer(set4Pistons, bo + 2);

        let set6Pistons = [new PistonEngine(set6.g8, { cylinderWidth: 10, cylinderLength: 5, layer: 0, pinR: 0.9, c: col[0], marginX: width * 0.05 })];
        applyPistonLayer(set6Pistons, bo + 2);

        let set7Pistons = [new PistonEngine(set7.g0, { cylinderWidth: 10, cylinderLength: 5, layer: 0, pinR: 0.9, marginX: width * 0.05 })];
        applyPistonLayer(set7Pistons, bo + 1);

        this.pistons.push(...set1Pistons, ...set4Pistons, ...set6Pistons, ...set7Pistons);
    }

    // ── PUBLIC API ────────────────────────────────────────────────────────

    pushTo(gearsArr, belts, arms, pistons) {
        gearsArr.push(...this.gears);
        belts.push(...this.belts);
        arms.push(...this.arms);
        pistons.push(...this.pistons);
        return this;
    }

    // Call once after pushTo() and piping is created — builds layer lookup tables
    buildLayerGroups() {
        this.maxLayer = 0;
        for (const g of this.gears) if ((g.layer || 0) > this.maxLayer) this.maxLayer = g.layer || 0;
        for (const b of this.belts) if ((b.layer || 0) > this.maxLayer) this.maxLayer = b.layer || 0;
        for (const a of this.arms) if ((a.layer || 0) > this.maxLayer) this.maxLayer = a.layer || 0;
        for (const p of this.pistons) if ((p.layer || 0) > this.maxLayer) this.maxLayer = p.layer || 0;

        for (let i = 0; i <= this.maxLayer; i++) {
            this.layerGears[i] = this.gears.filter(g => (g.layer || 0) === i);
            this.layerBelts[i] = this.belts.filter(b => (b.layer || 0) === i);
            this.layerArms[i] = this.arms.filter(a => (a.layer || 0) === i);
            this.layerPistons[i] = this.pistons.filter(p => (p.layer || 0) === i);
        }
        return this;
    }

    // Call every frame before the layer loop
    update() {
        for (const g of this.gears) { g.update(); }
    }

    // Call inside the layer loop — renders gears, belts, arms, pistons for one layer
    displayLayer(layer, piping) {
        piping.displayPipesForLayer(layer);
        for (const g of (this.layerGears[layer] || [])) g.display();
        for (const b of (this.layerBelts[layer] || [])) b.display();
        for (const a of (this.layerArms[layer] || [])) a.display();
        for (const p of (this.layerPistons[layer] || [])) p.display();
    }
}
class GearLayout2 {

    // ── G0 CONFIG — edit here to update all sets in this layout ────────────
    static g0Cfg = {
        r: 0.35,
        speed: 0.032,
        a: 0,
        e: 0.5,
        style: Math.floor(Math.random() * 24),
        noTeeth: false,
        plate: { enabled: false },
        bolt: {},
        c: null,          // set from col[0] at build time
        layer: null           // set from CONNECTOR_LAYER at build time
    };
    static polyScale = 0.7;

    constructor(x, y, col, bandOffset = 0) {
        this.gears = [];
        this.belts = [];
        this.arms = [];
        this.pistons = [];


        this.layerGears = {};
        this.layerBelts = {};
        this.layerArms = {};
        this.layerPistons = {};
        this.maxLayer = 0;

        this.beltGears = [];
        this.setChains = [];
        this.topSprockets = [];

        this._build(x, y, col, bandOffset);
    }

    _build(x, y, col, bo) {
        this._buildSet8(x - width * 0.5, y + height * 0.05, col, bo + 1);
        this._buildSet1(x + width * 0.2, y - height * 0.35, col, bo + 3);
        this._buildSet2(x - width * 0.4, y - height * 0.45, col, bo + 0);
        this._buildSet3(x - width * 0.23, y + height * 0.3, col, bo + 3);
        this._buildSet4(x + width * 0.15, y + height * 0.33, col, bo + 0);
        this._buildSet5(x + width * 0.1, y - height * 0.45, col, bo + 1);
        this._buildSet6(x + width * 0.15, y - height * 0.3, col, bo + 4);
        this._buildSet7(x - width * 0.175, y + height * 0.05, col, bo + 2);
        this._buildSet7(x - width * 0.65, y - height * 0.35, col, bo + 2);
        this._buildAnchorSet(x, y, col);

        // Rubber backbone belt connecting all g0 top sprockets — sorted by angle from layout center
        const sortedSprockets = [...this.topSprockets].sort((a, b) =>
            atan2(a.y - y, a.x - x) - atan2(b.y - y, b.x - x)
        );
        const backboneBelt = new Belt(
            sortedSprockets.map(s => ({ gear: s, cw: true })),
            0, 1.2, 'rubber', col[0]
        );
        backboneBelt.layer = CONNECTOR_LAYER;
        this.belts.push(backboneBelt);
    }

    // ── SET FACTORY ────────────────────────────────────────────────────────

    _buildSet1(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;
        const sizePool = [0.4, 0.35, 0.3, 0.3, 0.3, 0.25, 0.2, 0.25, 0.5];
        const cwDirs = [true, true, true, true, false];
        const g0T = max(6, floor(48 * GearLayout2.g0Cfg.r));

        const g0 = this._makeG0(x, y);
        const outerAngles = this._getTopologyAngles();
        const outerGears = this._makeOuterRing(x, y, g0, g0T, outerAngles, sizePool, col);
        const { secondaryGears } = this._makePolygonGroup(x, y, outerGears, sizePool, 0, 0, cwDirs, col);

        const set1 = { g0 };
        outerGears.forEach((g, i) => { set1[`g${i + 1}`] = g; });
        secondaryGears.forEach((g, i) => { set1[`g${i + 5}`] = g; });
        applyLayer(set1, bo);
        this.gears.push(...Object.values(set1));
        this.beltGears.push(...Object.values(set1));   // free-running each frame


        const beltSet = [new Belt(
            secondaryGears.map((g, i) => ({ gear: g, cw: cwDirs[i] })),
            0, 1.2, 'chain', col[0]
        )];
        applyBeltLayer(beltSet, bo);
        this.belts.push(...beltSet);

        const p1 = new PistonEngine(secondaryGears[0], { c: col[0], pinR: 0.9, cylinderWidth: 10, cylinderLength: 5, marginX: width * 0.05 });
        this.pistons.push(p1);
    }

    _buildSet2(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;

        const c1Size = GearLayout2.g0Cfg.r;   // g0 = driver hub
        const c2Size = GearLayout2.g0Cfg.r;
        const sharedSize = 0.25;

        const d = width * 0.216346 * (c1Size + sharedSize + 0.04);  // hub→shared spacing
        const c1T = max(6, floor(48 * c1Size));
        const c2T = max(6, floor(48 * c2Size));
        const sT = max(6, floor(48 * sharedSize));

        // g0 (=c1) at (x, y); shared up-right; c2 further right — equilateral chain
        const sx = x + d * 0.5, sy = y - d * sqrt(3) / 2;
        const c2x = x + d, c2y = y;
        const angC1S = degrees(atan2(sy - y, sx - x));
        const angSC2 = degrees(atan2(c2y - sy, c2x - sx));

        const g0 = this._makeG0(x, y);  // universal driver hub
        const g_shared = new Gear(sx, sy, {
            c: col[0], r: sharedSize, layer: 0, style: floor(random(24)),
            speed: -g0.speed * (c1T / sT),
            a: -g0.a * (c1T / sT) + radians(angC1S * (1 + c1T / sT) + 180 - 360 / sT)
        });
        const g_c2 = new Gear(c2x, c2y, {
            c: col[0], r: c2Size, layer: 0, style: floor(random(24)),
            speed: g0.speed * (c1T / c2T),
            a: -g_shared.a * (sT / c2T) + radians(angSC2 * (1 + sT / c2T) + 180 - 360 / c2T)
        });

        // Exclusion gears orbiting each hub (avoiding the shared-link direction)
        const c1ExclDefs = [{ s: 0.25, ang: 90 }, { s: 0.3, ang: 180 }, { s: 0.25, ang: 270 }];
        const c2ExclDefs = [{ s: 0.25, ang: 0 }, { s: 0.3, ang: 90 }, { s: 0.25, ang: 270 }];
        const makeExcl = (cg, cT, cSz, defs) => defs.map(({ s, ang }) => {
            const t = max(6, floor(48 * s));
            const de = width * 0.216346 * (cSz + s + 0.04);
            return new Gear(cg.x + cos(radians(ang)) * de, cg.y + sin(radians(ang)) * de, {
                c: col[0], r: s, layer: 0, style: floor(random(24)),
                speed: -cg.speed * (cT / t),
                a: -cg.a * (cT / t) + radians(ang * (1 + cT / t) + 180 - 360 / t)
            });
        });
        const c1Excl = makeExcl(g0, c1T, c1Size, c1ExclDefs);
        const c2Excl = makeExcl(g_c2, c2T, c2Size, c2ExclDefs);

        const set2 = { g0 };
        let gIdx = 1;
        [g_shared, g_c2, ...c1Excl, ...c2Excl].forEach(g => { set2[`g${gIdx++}`] = g; });
        applyLayer(set2, bo);
        this.gears.push(...Object.values(set2));


        this.setChains.push({
            type: 'crossShared',
            g_c1: g0, c1T,
            c1Excl, c1ExclT: c1ExclDefs.map(de => max(6, floor(48 * de.s))), c1ExclA: c1ExclDefs.map(de => de.ang),
            g_shared, sT, angC1S, angSC2,
            g_c2, c2T,
            c2Excl, c2ExclT: c2ExclDefs.map(de => max(6, floor(48 * de.s))), c2ExclA: c2ExclDefs.map(de => de.ang)
        });
    }

    _buildSet3(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;

        const layer = 0;
        const groupDist = width * 0.2;     // set3 center → each belt-group center
        const clusterR = width * 0.09;    // groups B & C center → their gears
        const aClusterR = width * 0.16;   // group A needs more room for the large g0

        // Three belt-group centers in a triangle around (x, y)
        const centers = [-90, 30, 150].map(a => ({
            x: x + cos(radians(a)) * groupDist,
            y: y + sin(radians(a)) * groupDist
        }));

        const set3 = {};
        let gIdx = 1;
        const belts = [];
        const pushGear = (g) => { set3[`g${gIdx++}`] = g; };

        // ── Group A (top): 4 gears incl g0 driver + co-located sprocket ──
        const aSizes = [0.35, 0.35, 0.3];   // the 3 belt-driven gears
        const sprR = 0.3;
        const aVerts = aSizes.length + 1;  // g0 + 3 others
        const a0 = -HALF_PI;
        const g0x = centers[0].x + cos(a0) * aClusterR;
        const g0y = centers[0].y + sin(a0) * aClusterR;

        const g0 = this._makeG0(g0x, g0y);
        const sprocket = new Gear(g0x, g0y, {
            c: col[0], r: sprR, speed: g0.speed, layer, style: floor(random(24))
        });
        const aOthers = aSizes.map((r, i) => {
            const ang = ((i + 1) / aVerts) * TWO_PI - HALF_PI;
            return new Gear(
                centers[0].x + cos(ang) * aClusterR,
                centers[0].y + sin(ang) * aClusterR,
                { c: col[0], r, speed: g0.speed * (sprR / r), layer, style: floor(random(24)) }
            );
        });

        set3.g0 = g0;
        set3.s1 = sprocket;
        aOthers.forEach(pushGear);
        belts.push(new Belt(
            [{ gear: sprocket, cw: true }, ...aOthers.map(g => ({ gear: g, cw: true }))],
            0, 1.2, 'chain', col[0]
        ));

        // Group A's first 0.3 gear is THE driver — its speed feeds B & C connectors
        const driverConn = aOthers[0];
        const driverSpeed = driverConn.speed;
        const connectors = [driverConn];

        // ── Groups B & C: 3 gears each, index-0 (0.3) driven at driverSpeed ──
        const bcSizes = [[0.35, 0.25, 0.3], [0.35, 0.35, 0.25]];
        bcSizes.forEach((sizes, gi) => {
            const c = centers[gi + 1];
            const gears = this._makeBeltCluster(c.x, c.y, sizes, col, layer, driverSpeed, clusterR);
            gears.forEach(pushGear);
            belts.push(new Belt(gears.map(g => ({ gear: g, cw: true })), 0, 1.2, 'chain', col[0]));
            connectors.push(gears[0]);   // the 0.3 connector gear
        });

        applyLayer(set3, bo);
        this.gears.push(...Object.values(set3));
        this.beltGears.push(...Object.values(set3));


        applyBeltLayer(belts, bo);
        this.belts.push(...belts);

        // Link the three 0.3 connector gears with rigid arms (same size + speed)
        const ap = new ArmPair(false, 'truss', col[0], ...connectors);
        ap.getArms().forEach(a => { a.layer = bo * LAYER_BAND; this.arms.push(a); });
    }

    _buildSet4(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;

        // Cross Chain A — cross nodes end-to-end; each node's last outer (angle 0)
        // becomes the next node's center. g0 + 3 nodes × 3 outer = 10 gears.
        const nodeDefs = [
            { oSizes: [0.3, 0.3, 0.3], oAngles: [90, 270, 0] },
            { oSizes: [0.25, 0.25, 0.3], oAngles: [90, 270, 0] },
            { oSizes: [0.25, 0.3, 0.2], oAngles: [90, 270, 0] },
        ];

        const g0 = this._makeG0(x, y);
        const set4 = { g0 };
        let gIdx = 1;
        const nodes = [];

        let center = g0;
        let cSize = GearLayout2.g0Cfg.r;
        for (const def of nodeDefs) {
            const cT = max(6, floor(48 * cSize));
            const outer = [], oTeeth = [], allAngles = [];
            for (let i = 0; i < def.oSizes.length; i++) {
                const r = def.oSizes[i];
                const ang = def.oAngles[i];
                const oT = max(6, floor(48 * r));
                const d = width * 0.216346 * (cSize + r + 0.04);
                const initA = -center.a * (cT / oT) + radians(ang * (1 + cT / oT) + 180 - 360 / oT);
                const g = new Gear(
                    center.x + cos(radians(ang)) * d,
                    center.y + sin(radians(ang)) * d,
                    { c: col[0], r, speed: -center.speed * (cT / oT), a: initA, layer: 0, style: floor(random(24)) }
                );
                outer.push(g); oTeeth.push(oT); allAngles.push(ang);
                set4[`g${gIdx++}`] = g;
            }
            nodes.push({ center, outer, cTeeth: cT, oTeeth, allAngles });
            // last outer (angle 0) becomes the next node's center
            center = outer[outer.length - 1];
            cSize = def.oSizes[def.oSizes.length - 1];
        }

        applyLayer(set4, bo);
        this.gears.push(...Object.values(set4));


        this.setChains.push({ type: 'crossChain', nodes });
    }

    _buildSet5(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;

        // Spiral — single mesh chain; each gear meshes with the previous, placed
        // at a progressively rotating angle (i * delta). g0 drives the chain.
        const sizes = [GearLayout2.g0Cfg.r, 0.3, 0.35, 0.4, 0.45, 0.5, 0.25, 0.2, 0.175, 0.15];
        const delta = 35;
        const connAngles = sizes.slice(0, -1).map((_, i) => i * delta);  // angle from gear i → i+1
        const teeth = sizes.map(s => max(6, floor(48 * s)));

        const g0 = this._makeG0(x, y);
        const gears = [g0];
        for (let i = 1; i < sizes.length; i++) {
            const prev = gears[i - 1];
            const ang = radians(connAngles[i - 1]);
            const d = width * 0.216346 * (sizes[i - 1] + sizes[i] + 0.04);
            const tA = teeth[i - 1], tB = teeth[i], diff = connAngles[i - 1];
            const initA = -prev.a * (tA / tB) + radians(diff * (1 + tA / tB) + 180 - 360 / tB);
            gears.push(new Gear(
                prev.x + cos(ang) * d,
                prev.y + sin(ang) * d,
                { c: col[0], r: sizes[i], speed: -prev.speed * (tA / tB), a: initA, layer: 0, style: floor(random(24)) }
            ));
        }

        const set5 = {};
        gears.forEach((g, i) => { set5[`g${i}`] = g; });
        applyLayer(set5, bo);
        this.gears.push(...Object.values(set5));


        this.setChains.push({ type: 'spiral', gears, teeth, contacts: connAngles });
    }

    _buildSet6(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;

        // Group A — g0 (index 0) + 4 belt gears; sprocket rides the belt
        const layer = 0;
        const clusterR = width * 0.13;
        const aSizes = [GearLayout2.g0Cfg.r, 0.3, 0.3, 0.35, 0.3];
        const sprR = 0.3;

        const aGears = aSizes.map((r, i) => {
            const ang = (i / aSizes.length) * TWO_PI - PI;   // index 0 on the left
            const gx = x + cos(ang) * clusterR;
            const gy = y + sin(ang) * clusterR;
            return i === 0
                ? this._makeG0(gx, gy)
                : new Gear(gx, gy, {
                    c: col[0], r, layer, style: floor(random(24)),
                    speed: GearLayout2.g0Cfg.speed * (sprR / r)
                });
        });
        const g0 = aGears[0];
        const sprocket = new Gear(g0.x, g0.y, {
            c: col[0], r: sprR, speed: g0.speed, layer, style: floor(random(24))
        });

        const set6 = { g0, s1: sprocket };
        let gIdx = 1;
        aGears.slice(1).forEach(g => { set6[`g${gIdx++}`] = g; });

        applyLayer(set6, bo);
        this.gears.push(...Object.values(set6));
        this.beltGears.push(...Object.values(set6));


        const beltSet = [new Belt(
            [{ gear: sprocket, cw: true }, ...aGears.slice(1).map(g => ({ gear: g, cw: true }))],
            0, 1.2, 'chain', col[0]
        )];
        applyBeltLayer(beltSet, bo);
        this.belts.push(...beltSet);

        // Group B: 5-gear belt cluster to the right of Group A.
        // standalone is the left vertex (i=0, angle=PI) so it bridges visually to Group A.
        const bClusterR = width * 0.17;
        const bCx = x + clusterR + bClusterR - width * 0.55;
        const bCy = y + height * 0.15;
        const bSizes = [0.3, 0.25, 0.3, 0.25, 0.3];

        const standalone = new Gear(bCx - bClusterR, bCy, {
            c: col[0], r: 0.3, speed: GearLayout2.g0Cfg.speed, layer, style: floor(random(24))
        });

        const bGears = bSizes.map((r, i) => {
            const ang = (i / bSizes.length) * TWO_PI + PI;   // i=0 points left (angle PI)
            if (i === 0) return standalone;
            return new Gear(
                bCx + cos(ang) * bClusterR,
                bCy + sin(ang) * bClusterR,
                {
                    c: col[0], r, layer, style: floor(random(24)),
                    speed: GearLayout2.g0Cfg.speed * (0.3 / r)
                }
            );
        });

        const standaloneSet = { g7: standalone };
        applyLayer(standaloneSet, bo);
        this.gears.push(standalone);
        this.beltGears.push(standalone);

        const bGroupSet = {};
        bGears.slice(1).forEach((g, i) => { bGroupSet[`gb${i}`] = g; });
        applyLayer(bGroupSet, bo);
        this.gears.push(...Object.values(bGroupSet));
        this.beltGears.push(...Object.values(bGroupSet));

        const beltB = [new Belt(
            bGears.map(g => ({ gear: g, cw: true })),
            0, 1.2, 'chain', col[0]
        )];
        applyBeltLayer(beltB, bo);
        this.belts.push(...beltB);

        // Arm: standalone (Group B left vertex) → Group A's first 0.3 belt gear
        const linkArm = new Arm(standalone, aGears[1], 0.5, 0, 0, undefined, col[0], 'truss');
        linkArm.layer = bo * LAYER_BAND + 5;
        this.arms.push(linkArm);

        const p6 = new PistonEngine(aGears[3], { c: col[0], pinR: 0.9, cylinderWidth: 10, cylinderLength: 5, marginX: width * 0.05 });
        this.pistons.push(p6);
    }

    _buildSet7(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;

        const layer = 0;
        const clusterR = width * 0.3;
        const sizes = [GearLayout2.g0Cfg.r, 0.35, 0.25, 0.15, 0.15, 0.25]; // 10 sizes
        const cwDirs = [true, false, true, true, true, true, true, true, true, true]; // 10 dirs
        const entryIdx = 0;

        const gears = sizes.map((r, i) => {
            const ang = (i / sizes.length) * TWO_PI - HALF_PI;
            const cw = cwDirs[i];
            const beltR = r + width / 50;
            const groupR = i === entryIdx ? clusterR : clusterR * GearLayout2.polyScale;
            const adjR = i === entryIdx ? clusterR : (cw ? groupR : groupR + random([-1]) * beltR * 8);

            if (i === 0) {
                return this._makeG0(x + cos(ang) * adjR, y + sin(ang) * adjR);
            }

            const baseSpeed = GearLayout2.g0Cfg.speed * (sizes[0] / r);
            const speed = cw ? baseSpeed : -baseSpeed;

            return new Gear(
                x + cos(ang) * adjR,
                y + sin(ang) * adjR,
                { c: col[0], r, layer, style: floor(random(24)), speed }
            );
        });

        // Sprocket co-located with g0 — same shaft, drives the belt loop
        const g0 = gears[0];
        const sprocket = new Gear(g0.x, g0.y, {
            c: col[0], r: 0.2, speed: g0.speed, layer, style: floor(random(24))
        });

        const set7 = { g0, s1: sprocket };
        gears.slice(1).forEach((g, i) => { set7[`g${i + 1}`] = g; });
        applyLayer(set7, bo);
        this.gears.push(...Object.values(set7));
        this.beltGears.push(...Object.values(set7));


        const beltSet = [new Belt(
            [{ gear: sprocket, cw: cwDirs[0] }, ...gears.slice(1).map((g, i) => ({ gear: g, cw: cwDirs[i + 1] }))],
            0, 1.2, 'chain', col[0]
        )];
        applyBeltLayer(beltSet, bo);
        this.belts.push(...beltSet);

        // Group B: 4-gear belt cluster to the right of the main ring.
        // bSizes[0] = 0.25 matches gears[1].r; firstSpeed = gears[1].speed so the arm guard passes.
        const bClustR = width * 0.12;
        const bCx = x + clusterR + bClustR + width * 0.05;
        const bCy = y;
        const bSizes = [0.35, 0.3, 0.35, 0.3];
        const bGears = this._makeBeltCluster(bCx, bCy, bSizes, col, layer, gears[1].speed, bClustR);

        const bGroupSet = {};
        bGears.forEach((g, i) => { bGroupSet[`gb${i}`] = g; });
        applyLayer(bGroupSet, bo);
        this.gears.push(...Object.values(bGroupSet));
        this.beltGears.push(...Object.values(bGroupSet));

        const beltB = [new Belt(
            bGears.map(g => ({ gear: g, cw: true })),
            0, 1.2, 'chain', col[0]
        )];
        applyBeltLayer(beltB, bo);
        this.belts.push(...beltB);

        // Arm: gears[1] (Group A, r=0.25) → bGears[0] (Group B, r=0.25, same speed)
        const linkArm = new Arm(gears[1], bGears[0], 0.5, 0, 0, undefined, col[0], 'truss');
        linkArm.layer = bo * LAYER_BAND;
        this.arms.push(linkArm);

        const p7 = new PistonEngine(bGears[2], { c: col[0], pinR: 0.9, cylinderWidth: 10, cylinderLength: 5, marginX: width * 0.05 });
        this.pistons.push(p7);
    }

    _buildSet8(x, y, col, bo) {
        GearLayout2.g0Cfg.c = col[0];
        GearLayout2.g0Cfg.layer = CONNECTOR_LAYER;

        const layer = 0;
        const zigAng = 30;
        const g0 = this._makeG0(x, y);
        const g0T = max(6, floor(48 * GearLayout2.g0Cfg.r));

        // Build a zigzag chain branching off a driver gear at startAng.
        // Returns { gears, teeth, contacts, startAng } — g0 is NOT in gears[].
        const makeZigzag = (driver, driverR, driverT, startAng, sizes) => {
            const teeth = sizes.map(s => max(6, floor(48 * s)));
            const contacts = sizes.slice(0, -1).map((_, i) => i % 2 === 0 ? zigAng : -zigAng);
            const d0 = width * 0.216346 * (driverR + sizes[0] + 0.04);
            const initA0 = -driver.a * (driverT / teeth[0])
                + radians(startAng * (1 + driverT / teeth[0]) + 180 - 360 / teeth[0]);
            const gears = [new Gear(
                driver.x + cos(radians(startAng)) * d0,
                driver.y + sin(radians(startAng)) * d0,
                {
                    c: col[0], r: sizes[0], speed: -driver.speed * (driverT / teeth[0]),
                    a: initA0, layer, style: floor(random(24))
                }
            )];
            for (let i = 1; i < sizes.length; i++) {
                const prev = gears[i - 1];
                const ang = contacts[i - 1];
                const tA = teeth[i - 1], tB = teeth[i];
                const d = width * 0.216346 * (sizes[i - 1] + sizes[i] + 0.04);
                const initA = -prev.a * (tA / tB) + radians(ang * (1 + tA / tB) + 180 - 360 / tB);
                gears.push(new Gear(
                    prev.x + cos(radians(ang)) * d,
                    prev.y + sin(radians(ang)) * d,
                    {
                        c: col[0], r: sizes[i], speed: -prev.speed * (tA / tB),
                        a: initA, layer, style: floor(random(24))
                    }
                ));
            }
            return { gears, teeth, contacts, startAng };
        };

        // Both groups start with r=0.3 so gears[0] of each has matching r & speed for the arm
        const aGroup = makeZigzag(g0, GearLayout2.g0Cfg.r, g0T, 0, [0.3, 0.4, 0.25, 0.35, 0.3]);
        const bGroup = makeZigzag(g0, GearLayout2.g0Cfg.r, g0T, -60, [0.3, 0.4, 0.4, 0.25, 0.35]);

        const set8 = { g0 };
        aGroup.gears.forEach((g, i) => { set8[`ga${i}`] = g; });
        bGroup.gears.forEach((g, i) => { set8[`gb${i}`] = g; });
        applyLayer(set8, bo);
        this.gears.push(...Object.values(set8));


        this.setChains.push({ type: 'zigzag', g0, g0T, groups: [aGroup, bGroup] });

        // Arm: aGroup.gears[0] → bGroup.gears[0] — both r=0.3, speed=-g0Cfg.speed*(g0T/teeth[0])
        const linkArm = new Arm(aGroup.gears[1], bGroup.gears[1], 0.5, 0, 0, undefined, col[0], random(['truss', 'plank']));
        linkArm.layer = bo * LAYER_BAND;
        this.arms.push(linkArm);
    }

    // ── REUSABLE HELPERS ───────────────────────────────────────────────────

    _buildAnchorSet(x, y, col) {
        const anchors = [
            { ax: x + width * 0.25, ay: y - height * 0.25, r: 0.65, plateAngle: 310, plateSize: 67 },
            { ax: x - width * 0.0, ay: y + height * 0.172, r: 0.55, plateAngle: 210, plateSize: 67 },
            { ax: x + width * 0.4, ay: y + height * 0.4, r: 0.55, plateAngle: 0, plateSize: 67 },
            { ax: x - width * 0.25, ay: y + height * 0.35, r: 0.65, plateAngle: 130, plateSize: 67 },
            { ax: x + width * 0.05, ay: y - height * 0.12, r: 0.55, plateAngle: 135, plateSize: 67 },
            { ax: x - width * 0.45, ay: y - height * 0.2, r: 0.55, plateAngle: 230, plateSize: 50 },
        ];
        for (const { ax, ay, r, plateAngle, plateSize } of anchors) {
            const anchor = new Gear(ax, ay, {
                c: col[0],
                r,
                speed: GearLayout2.g0Cfg.speed,
                noTeeth: true,
                style: floor(random(24)),
                layer: CONNECTOR_LAYER + 1,
                plate: { enabled: true, angle: plateAngle, size: plateSize !== undefined ? plateSize : 67, color: col[0] }
            });
            this.gears.push(anchor);
            this.beltGears.push(anchor);
            this.topSprockets.push(anchor);
        }
    }

    _makeG0(x, y) {
        const g0 = new Gear(x, y, { ...GearLayout2.g0Cfg, style: floor(random(24)) });
        const topSprocket = new Gear(x, y, {
            c: GearLayout2.g0Cfg.c,
            r: GearLayout2.g0Cfg.r * 0.8,
            speed: GearLayout2.g0Cfg.speed,
            a: GearLayout2.g0Cfg.a,
            noTeeth: true,
            style: floor(random(24)),
            layer: CONNECTOR_LAYER + 1
        });
        this.gears.push(topSprocket);
        this.beltGears.push(topSprocket);
        this.topSprockets.push(topSprocket);
        return g0;
    }

    // Belt loop of gears in a polygon; first gear free-runs, rest belt-derived
    _makeBeltCluster(cx, cy, sizes, col, layer, firstSpeed, clusterR) {
        const n = sizes.length;
        return sizes.map((r, i) => {
            const ang = (i / n) * TWO_PI - HALF_PI;
            const speed = i === 0 ? firstSpeed : firstSpeed * (sizes[0] / r);
            return new Gear(
                cx + cos(ang) * clusterR,
                cy + sin(ang) * clusterR,
                { c: col[0], r, speed, layer, style: floor(random(24)) }
            );
        });
    }

    _getTopologyAngles(topology = random(['cross', 'spiral', 'zigzag'])) {
        if (topology === 'cross') return [0, 90, 180, 270];
        if (topology === 'spiral') return [0, 50, 100, 150];
        return [0, -30, 150, -150]; // zigzag
    }

    _makeOuterRing(x, y, g0, g0T, outerAngles, sizePool, col) {
        return outerAngles.map((ang, i) => {
            const r = sizePool[i];
            const oT = max(6, floor(48 * r));
            const d = width * 0.216346 * (GearLayout2.g0Cfg.r + r + 0.04);
            return new Gear(
                x + cos(radians(ang)) * d,
                y + sin(radians(ang)) * d,
                {
                    c: col[0], r, layer: 1, style: floor(random(24)),
                    speed: -g0.speed * (g0T / oT),
                    a: radians(ang * (1 + g0T / oT) + 180 - 360 / oT)
                }
            );
        });
    }

    _makePolygonGroup(x, y, outerGears, sizePool, bridgeIdx, entryIdx, cwDirs, col) {
        const bridgeGear = outerGears[bridgeIdx];
        const bridgeT = max(6, floor(48 * sizePool[bridgeIdx]));
        const entryR = sizePool[4 + entryIdx];
        const entryT = max(6, floor(48 * entryR));
        const entrySpd = -bridgeGear.speed * (bridgeT / entryT);
        const polyR = width * 0.216346 * (GearLayout2.g0Cfg.r + sizePool[0] + 0.04)
            + width * 0.216346 * (sizePool[0] + entryR + 0.04);

        const secondaryGears = sizePool.slice(4).map((r, i) => {
            const ang = (i / 5) * TWO_PI;
            const cw = cwDirs[i];
            const beltR = r + width / 50;
            const groupR = i === entryIdx ? polyR : polyR * GearLayout2.polyScale;
            const adjR = i === entryIdx ? polyR : (cw ? groupR : groupR + random([-1]) * beltR * 8);
            const baseSpd = i === entryIdx ? entrySpd : entrySpd * (entryR / r);
            const speed = cw ? baseSpd : -baseSpd;
            const initA = i === entryIdx
                ? -bridgeGear.a * (bridgeT / entryT) + radians(180 - 360 / entryT)
                : undefined;
            return new Gear(
                x + cos(ang) * adjR,
                y + sin(ang) * adjR,
                {
                    c: col[0], r, speed, layer: 0, style: floor(random(24)),
                    ...(initA !== undefined && { a: initA })
                }
            );
        });

        return { secondaryGears, polyR };
    }

    pushTo(gearsArr, belts, arms, pistons) {
        gearsArr.push(...this.gears);
        belts.push(...this.belts);
        arms.push(...this.arms);
        pistons.push(...this.pistons);
        return this;
    }

    buildLayerGroups() {
        this.maxLayer = 0;
        for (const g of this.gears) if ((g.layer || 0) > this.maxLayer) this.maxLayer = g.layer || 0;
        for (const b of this.belts) if ((b.layer || 0) > this.maxLayer) this.maxLayer = b.layer || 0;
        for (const a of this.arms) if ((a.layer || 0) > this.maxLayer) this.maxLayer = a.layer || 0;
        for (const p of this.pistons) if ((p.layer || 0) > this.maxLayer) this.maxLayer = p.layer || 0;

        for (let i = 0; i <= this.maxLayer; i++) {
            this.layerGears[i] = this.gears.filter(g => (g.layer || 0) === i);
            this.layerBelts[i] = this.belts.filter(b => (b.layer || 0) === i);
            this.layerArms[i] = this.arms.filter(a => (a.layer || 0) === i);
            this.layerPistons[i] = this.pistons.filter(p => (p.layer || 0) === i);
        }
        return this;
    }

    update() {
        // Belt-mode sets (set1): each gear free-runs on its own speed
        for (const g of this.beltGears) { g.update(); }

        // Chain-mode sets (set2+): driven by g0 meshing formula
        for (const chain of this.setChains) this._updateChain(chain);
    }

    _updateChain(chain) {
        if (chain.type === 'crossShared') {
            const { g_c1, c1T, c1Excl, c1ExclT, c1ExclA, g_shared, sT, angC1S, angSC2, g_c2, c2T, c2Excl, c2ExclT, c2ExclA } = chain;
            g_c1.update();
            g_shared.a = -g_c1.a * (c1T / sT) + radians(angC1S * (1 + c1T / sT) + 180 - 360 / sT);
            g_c2.a = -g_shared.a * (sT / c2T) + radians(angSC2 * (1 + sT / c2T) + 180 - 360 / c2T);
            for (let i = 0; i < c1Excl.length; i++) {
                c1Excl[i].a = -g_c1.a * (c1T / c1ExclT[i]) + radians(c1ExclA[i] * (1 + c1T / c1ExclT[i]) + 180 - 360 / c1ExclT[i]);
            }
            for (let i = 0; i < c2Excl.length; i++) {
                c2Excl[i].a = -g_c2.a * (c2T / c2ExclT[i]) + radians(c2ExclA[i] * (1 + c2T / c2ExclT[i]) + 180 - 360 / c2ExclT[i]);
            }
            return;
        }

        if (chain.type === 'crossChain') {
            const { nodes } = chain;
            // Only node 0's center (g0) self-animates; each subsequent center is a
            // shared reference to the previous node's last outer gear.
            nodes[0].center.update();
            for (const node of nodes) {
                for (let i = 0; i < node.outer.length; i++) {
                    node.outer[i].a = -node.center.a * (node.cTeeth / node.oTeeth[i])
                        + radians(node.allAngles[i] * (1 + node.cTeeth / node.oTeeth[i]) + 180 - 360 / node.oTeeth[i]);
                }
            }
            return;
        }

        if (chain.type === 'spiral') {
            const { gears, teeth, contacts } = chain;
            gears[0].update();
            for (let i = 1; i < gears.length; i++) {
                const tA = teeth[i - 1], tB = teeth[i], diff = contacts[i - 1];
                gears[i].a = -gears[i - 1].a * (tA / tB)
                    + radians(diff * (1 + tA / tB) + 180 - 360 / tB);
            }
            return;
        }

        if (chain.type === 'zigzag') {
            const { g0, g0T, groups } = chain;
            g0.update();
            for (const { gears, teeth, contacts, startAng } of groups) {
                const tA = g0T, tB = teeth[0];
                gears[0].a = -g0.a * (tA / tB) + radians(startAng * (1 + tA / tB) + 180 - 360 / tB);
                for (let i = 1; i < gears.length; i++) {
                    const tA2 = teeth[i - 1], tB2 = teeth[i], diff = contacts[i - 1];
                    gears[i].a = -gears[i - 1].a * (tA2 / tB2)
                        + radians(diff * (1 + tA2 / tB2) + 180 - 360 / tB2);
                }
            }
            return;
        }
    }

    displayLayer(layer, piping) {
        piping.displayPipesForLayer(layer);
        for (const g of (this.layerGears[layer] || [])) g.display();
        for (const b of (this.layerBelts[layer] || [])) b.display();
        for (const a of (this.layerArms[layer] || [])) a.display();
        for (const p of (this.layerPistons[layer] || [])) p.display();
    }
}
class GearLayout3 extends GearLayout2 {
    _buildAnchorSet(x, y, col) {
        const anchors = [
            { ax: x + width * 0.32, ay: y - height * 0.45, r: 0.65, plateAngle: 310, plateSize: 75 },
            { ax: x - width * 0.3, ay: y - height * 0.15, r: 0.55, plateAngle: 130, plateSize: 60 },
            { ax: x + width * 0.35, ay: y - height * 0.15, r: 0.55, plateAngle: 0, plateSize: 67 },
            { ax: x - width * 0.2, ay: y + height * 0.18, r: 0.65, plateAngle: 220, plateSize: 65 },
            { ax: x + width * 0.35, ay: y + height * 0.15, r: 0.55, plateAngle: 300, plateSize: 55 },
            { ax: x - width * 0.4, ay: y - height * 0.38, r: 0.55, plateAngle: 180, plateSize: 60 },
        ];
        for (const { ax, ay, r, plateAngle, plateSize } of anchors) {
            const anchor = new Gear(ax, ay, {
                c: col[0],
                r,
                speed: GearLayout2.g0Cfg.speed,
                noTeeth: true,
                style: floor(random(24)),
                layer: CONNECTOR_LAYER + 1,
                plate: { enabled: true, angle: plateAngle, size: plateSize !== undefined ? plateSize : 67, color: col[0] }
            });
            this.gears.push(anchor);
            this.beltGears.push(anchor);
            this.topSprockets.push(anchor);
        }
    }

    _build(x, y, col, bo) {
        this._buildSet1(x - width * 0.0, y - height * 0.0, col, bo + 5);
        this._buildSet2(x - width * 0.35, y - height * 0.3, col, bo + 1);
        this._buildSet3(x - width * 0.2, y + height * 0.25, col, bo + 0);
        this._buildSet4(x + width * 0.25, y + height * 0.35, col, bo + 0);
        this._buildSet1(x + width * 0.2, y - height * 0.0, col, bo + 0);

        this._buildSet6(x - width * 0.1, y - height * 0.25, col, bo + 4);
        this._buildSet7(x - width * 0.0, y - height * 0.3, col, bo + 2);
        this._buildSet8(x - width * 0.2, y - height * 0.4, col, bo + 3);
        this._buildSet8(x - width * 0.5, y + height * 0.05, col, bo + 3);
        this._buildSet8(x - width * 0.5, y + height * 0.35, col, bo + 3);
        this._buildAnchorSet(x, y, col);

        const sortedSprockets = [...this.topSprockets].sort((a, b) =>
            atan2(a.y - y, a.x - x) - atan2(b.y - y, b.x - x)
        );
        const backboneBelt = new Belt(
            sortedSprockets.map(s => ({ gear: s, cw: true })),
            0, 1.2, 'rubber', col[0]
        );
        backboneBelt.layer = CONNECTOR_LAYER;
        this.belts.push(backboneBelt);
    }
}
function applyLayer(set, band) {
    for (const [key, g] of Object.entries(set)) {
        if (!g) continue;
        g.layer = key === 'g0'
            ? CONNECTOR_LAYER
            : band * LAYER_BAND + (g.layer || 0);
    }
}
// Same band offset logic for belt arrays — call before pushing to global belts
function applyBeltLayer(beltArr, band) {
    for (const b of beltArr) {
        b.layer = band * LAYER_BAND + (b.layer || 0);
    }
}
// Same band offset logic for arm arrays
function applyArmLayer(armArr, band) {
    for (const a of armArr) {
        a.layer = band * LAYER_BAND + (a.layer || 0);
    }
}
// Same band offset logic for piston arrays
function applyPistonLayer(pistonArr, band) {
    for (const p of pistonArr) {
        p.layer = band * LAYER_BAND + (p.layer || 0);
    }
}
function getOptPositions() {
    const base = [
        [1, -1, 3.3, [20, 25]], [-1, -1, 3.3, [20, 25]], [1, 1, 3.3, [20, 25]], [-1, 1, 3.3, [20, 25]],
        [-1, 0.75, 3.3, [20, 25]], [-1, -0.75, 3.3, [20, 25]], [1, -0.75, 3.3, [20, 25]], [1, 0.75, 3.3, [20, 25]],
        [1, 0, 2.5, [15, 20]], [-1, 0, 2.5, [15, 20]],
        [-1, 0.25, 2.95, 20], [-1, -0.25, 2.95, [20, 25]], [1, -0.25, 2.95, [20, 25]], [1, 0.25, 2.95, [20, 25]],
        [-1, 0.5, 2.75, 20], [-1, -0.5, 2.75, 20], [1, -0.5, 2.75, 20], [1, 0.5, 2.75, 20],
        [0, -1, 2.3, 15], [0, 1, 2.3, 15], [0, 0.5, 2.3, 15], [0, -0.5, 2.3, 15],
        [0, 0.75, 2.3, [15, 20]], [0, -0.75, 2.3, [15, 20]],
        [-0.25, 0.25, 1.5, [10, 15]], [-0.25, -0.25, 1.5, [10, 15]], [0.25, -0.25, 1.5, [10, 15]], [0.25, 0.25, 1.5, [10, 15]],
        [-0.25, 0.5, 1.5, [10, 15]], [-0.25, -0.5, 1.5, [10, 15]], [0.25, -0.5, 1.5, [10, 15]], [0.25, 0.5, 1.5, [10, 15]],
        [-0.25, 0.75, 2.25, [15, 20]], [-0.25, -0.75, 2.25, [15, 20]], [0.25, -0.75, 2.25, [15, 20]], [0.25, 0.75, 2.25, [15, 20]],
        [-0.5, 0, 1.5, [10, 15]], [-0.5, 0, 1.5, [10, 15]], [0.5, 0.25, 1.5, [10, 15]], [0.5, -0.25, 1.5, [10, 15]],
        [0.5, 0.25, 1.8, [15, 20]], [0.5, 0.25, 1.8, [15, 20]], [0.5, 0.25, 1.8, [15, 20]], [0.5, 0.25, 1.8, [15, 20]],
        [-0.5, 0.5, 2.5, [15, 20]], [-0.5, -0.5, 2.5, [15, 20]], [0.5, -0.5, 2.5, [15, 20]], [0.5, 0.5, 2.5, [15, 20]],
        [-0.5, 0.75, 2.5, [15, 20]], [-0.5, -0.75, 2.5, [15, 20]], [0.5, -0.75, 2.5, [15, 20]], [0.5, 0.75, 2.5, [15, 20]],
        [-0.5, 1, 3.3, [20, 25]], [-0.5, -1, 3.3, [20, 25]], [0.5, -1, 3.3, [20, 25]], [0.5, 1, 3.3, [20, 25]],
        [-0.75, 1, 3.3, [20, 25]], [-0.75, -1, 3.3, [20, 25]], [0.75, -1, 3.3, [20, 25]], [0.75, 1, 3.3, [20, 25]],
        [-0.75, 0.75, 3.3, [20, 25]], [-0.75, -0.75, 3.3, [20, 25]], [0.75, -0.75, 3.3, [20, 25]], [0.75, 0.75, 3.3, [20, 25]],
        [-0.75, 0.5, 2.65, [15, 20]], [-0.75, -0.5, 2.65, [15, 20]], [0.75, -0.5, 2.65, [15, 20]], [0.75, 0.5, 2.65, [15, 20]],
        [-0.75, 0.25, 2.25, [15, 20]], [-0.75, -0.25, 2.25, [15, 20]], [0.75, -0.25, 2.25, [15, 20]], [0.75, 0.25, 2.25, [15, 20]],
        [-0.75, 0, 2, [10, 15]], [-0.75, 0, 2, [10, 15]], [0.75, 0, 2, [10, 15]], [0.75, 0, 2, [10, 15]]
    ];
    return base.map(p => ({ x: width * p[0], y: height * p[1], tth: p[2], nR: p[3] }));
}
function getSoptPositions() {
    const base = [
        [-0.25, 0, 0], [0.25, 0, 180],
        [-0.65, 0, 0], [0.65, 0, 180],
        [0, 0.25, 240], [0, -0.25, 60], [0, 0.25, 285], [0, -0.25, 105],
        [-0.3, 0, -15], [0.3, 0, -195], [-0.3, 0, 15], [0.3, 0, 195],
        [0, -0.25, 90], [0, 0.25, 270],
        [0, -0.5, 90], [0, 0.5, 270],
        [-0.5, 0, -45], [-0.5, 0, 45], [0.5, 0, -225], [0.5, 0, 225],
    ];
    return base.map(p => ({ x: width * p[0], y: height * p[1], a: p[2] }));
}
// --- MOVED FROM motor.js ---
function buildArtLayer(nR, tth, chosenMode, col) {
    let artClasses = [
        CircleArcRow,
        SquareArcRow,
        TriangleGridArcRow,
        LayeredBlockArcRow,
        BlackWhiteTileArc,
        SlantedLineArc
    ];

    let artRows = [];
    let numRows = nR;
    for (let i = 0; i < numRows; i++) {
        let cls = random(artClasses);
        let layer = random([0, 1]);

        if (cls === CircleArcRow) {
            let rowHeight = random([0.15, 0.25, 0.35, 0.5]);
            let row = new CircleArcRow(rowHeight, layer);
            row.speed = random([-0.025, -0.01, 0.01, 0.025]);
            artRows.push(row);
        } else if (cls === SquareArcRow) {
            let rowHeight = random([0.15, 0.25, 0.35, 0.5]);
            let row = new SquareArcRow(rowHeight, layer);
            row.speed = random([-0.025, -0.01, 0.01, 0.025]);
            artRows.push(row);
        } else if (cls === TriangleGridArcRow) {
            let rowHeight = random([0.12, 0.18, 0.25]);
            let row = new TriangleGridArcRow(rowHeight, layer);
            row.speed = random([-0.02, -0.01, 0.01, 0.02]);
            artRows.push(row);
        } else if (cls === LayeredBlockArcRow) {
            let rowHeight = random([0.15, 0.22, 0.3]);
            let numLanes = random([2, 3]);
            let row = new LayeredBlockArcRow(rowHeight, numLanes, layer);
            row.speed = random([-0.02, -0.01, 0.01, 0.02]);
            artRows.push(row);
        } else if (cls === BlackWhiteTileArc) {
            let rowHeight = random([0.08, 0.1, 0.15, 0.2]);
            let tileWidthRatio = random([0.3, 0.45, 0.055, 0.07]);
            artRows.push(new BlackWhiteTileArc(rowHeight, tileWidthRatio, layer));
        } else if (cls === SlantedLineArc) {
            let useBands = random() > 0.4;
            let rowHeight = random([0.05, 0.08, 0.1, 0.15, 0.2]);
            let speed = random([-0.3, -0.2, -0.1, 0.1, 0.2, 0.3]);
            let angle = random([-45, -30, 30, 45]);
            if (useBands) {
                let numBands = floor(random(2, 5));
                let bands = [];
                let currentOffset = 0;
                for (let j = 0; j < numBands; j++) {
                    currentOffset = (currentOffset + random(40, 120)) % 360;
                    bands.push({
                        offset: Math.round(currentOffset),
                        width: Math.round(random(30, 150)),
                        colorIdx: floor(random(1, 4)),
                        pattern: random(['slanted', 'concentric'])
                    });
                }
                artRows.push(new SlantedLineArc(rowHeight, 1.5, angle, speed, layer, bands));
            } else {
                artRows.push(new SlantedLineArc(rowHeight, random(60, 120), angle, speed, layer));
            }
        }
    }

    let lCorners = [
        { lSide: 'left', lSideY: 'top' },
        { lSide: 'right', lSideY: 'top' },
        { lSide: 'left', lSideY: 'bottom' },
        { lSide: 'right', lSideY: 'bottom' },
    ];
    let chosenCorner = random(lCorners);

    let paperPositions = [
        { cpX: 0.22, cpY: 0.22 },
        { cpX: 0.78, cpY: 0.22 },
        { cpX: 0.22, cpY: 0.78 },
        { cpX: 0.78, cpY: 0.78 },
        { cpX: 0.50, cpY: 0.50 },
        { cpX: 0.22, cpY: 0.50 },
        { cpX: 0.78, cpY: 0.50 },
    ];
    let chosenPaperPos = random(paperPositions);

    return new ArtLayer({
        drawMode: chosenMode,
        palette: col,
        rows: artRows,
        targetTotalHeight: tth,
        lSideY: chosenCorner.lSideY,
        lSide: chosenCorner.lSide,
        lCorner: 'sharp',
        paperCpX: chosenPaperPos.cpX,
        paperCpY: chosenPaperPos.cpY,
    });
}
// --- ENGINE & ART CONFIG HELPERS ---
function getArtConfig(topt) {
    let layermode = ['circle', 'straight', 'paper', 'l'];
    let chosenMode = layermode[floor(random(layermode.length))];
    let tth = 3.3;
    let nR = 10;

    if (chosenMode === 'circle' && topt) {
        if (topt.tth !== undefined) tth = topt.tth;
        if (topt.nR !== undefined) {
            if (Array.isArray(topt.nR)) {
                nR = floor(random(topt.nR[0], topt.nR[1] + 1));
            } else {
                nR = topt.nR;
            }
        }
    } else if (chosenMode === 'straight') {
        tth = 5.3;
        nR = 25;
    } else if (chosenMode === 'paper') {
        tth = 3.3;
        nR = 10;

    } else {
        tth = 3.3;
        nR = 10;
    }

    return { chosenMode, tth, nR };
}
function buildEngineSystem(x, y, col, u) {
    let gearsArr = [];
    let belts = [];
    let arms = [];
    let pistons = [];
    let maxLayer = 0;

    let gearslayarr = [GearLayout, GearLayout2, GearLayout3];
    let layoutIdx = floor(random(gearslayarr.length));
    if (window.traits) {
        const layoutNames = ["Layout 1", "Layout 2", "Layout 3"];
        window.traits["Gear Layout Mode"] = layoutNames[layoutIdx];
    }
    let layout = new gearslayarr[layoutIdx](x, y, col, 0);
    layout.pushTo(gearsArr, belts, arms, pistons);
    let sets = layout.sets;

    for (let g of gearsArr) if ((g.layer || 0) > maxLayer) maxLayer = g.layer || 0;
    for (let b of belts) if ((b.layer || 0) > maxLayer) maxLayer = b.layer || 0;
    for (let a of arms) if ((a.layer || 0) > maxLayer) maxLayer = a.layer || 0;
    for (let p of pistons) if ((p.layer || 0) > maxLayer) maxLayer = p.layer || 0;

    let selectedPipeColors = col.map(c => color(c));
    let piping = new PipingChassis(gearsArr, {
        spacing: 25 * u,
        pipeWidth: 5 * u,
        numPipes: 15,
        seed: random(100),
        margin: 150 * u,
        maxSteps: 30,
        turnChance: 0.7,
        widthVarMin: 4,
        widthVarMax: 6,
        shadowOffset: 6 * u,
        shadowAlpha: 120,
        shaderAmt: 0.15,
        colors: [selectedPipeColors[0]],
        highlightColor: color(255, 255, 255, 120),
        numLayers: maxLayer + 1
    });

    layout.buildLayerGroups();
    maxLayer = layout.maxLayer;

    return { layout, piping, gearsArr, belts, arms, pistons, sets, maxLayer };
}
