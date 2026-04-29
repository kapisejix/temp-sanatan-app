// Iter12 — load kundliLayout.js via @babel/core transformSync (no register needed)
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const Module = require('module');

const layoutPath = path.resolve(__dirname, '../frontend/src/lib/kundliLayout.js');
const src = fs.readFileSync(layoutPath, 'utf8');
const out = babel.transformSync(src, {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
  filename: layoutPath,
}).code;

const m = new Module(layoutPath);
m.filename = layoutPath;
m.paths = Module._nodeModulePaths(path.dirname(layoutPath));
m._compile(out, layoutPath);
const lib = m.exports;

const { HOUSE_AREAS, layoutHouse, buildChartLayout } = lib;

let passes = 0, failures = 0;
const check = (cond, msg) => {
  if (cond) { passes++; console.log('  ✓', msg); }
  else { failures++; console.log('  ✗', msg); }
};

const POOL = [
  { graha: 'Sun', degree_in_sign: 5.4 },
  { graha: 'Moon', degree_in_sign: 12.0 },
  { graha: 'Mars', degree_in_sign: 22.7 },
  { graha: 'Mercury', degree_in_sign: 8.1 },
  { graha: 'Jupiter', degree_in_sign: 14.5, is_retrograde: true },
  { graha: 'Venus', degree_in_sign: 19.0 },
  { graha: 'Saturn', degree_in_sign: 27.4 },
  { graha: 'Rahu', degree_in_sign: 3.0 },
  { graha: 'Ketu', degree_in_sign: 3.0 },
];

const PADDING = 6;
const inRect = (x, y, a) => {
  // tolerance for cell-centered placement (cells can extend up to ~28px from cx)
  const halfW = a.width / 2 + 30;
  const halfH = a.height / 2 + 6;
  return x >= a.cx - halfW - PADDING && x <= a.cx + halfW + PADDING &&
         y >= a.cy - halfH - PADDING && y <= a.cy + halfH + PADDING;
};

console.log('--- layoutHouse() per-size on H1 ---');
for (const n of [1, 2, 3, 4, 5, 7, 9]) {
  const planets = POOL.slice(0, n);
  const { tokens, font } = layoutHouse(planets, HOUSE_AREAS[0]);
  check(font >= 8 && font <= 14, `n=${n} → font ${font} ∈ [8..14]`);
  check(tokens.length <= 8, `n=${n} → tokens ${tokens.length} ≤ 8`);
  if (n > 7) {
    const last = tokens[tokens.length - 1];
    check(last.isOverflow === true && last.label === `+${n - 7}`, `n=${n} → overflow "+${n - 7}"`);
  }
  let allIn = true;
  for (const t of tokens) if (!inRect(t.x, t.y, HOUSE_AREAS[0])) {
    allIn = false;
    console.log(`     out: (${t.x.toFixed(1)},${t.y.toFixed(1)}) area cx=${HOUSE_AREAS[0].cx} cy=${HOUSE_AREAS[0].cy} w=${HOUSE_AREAS[0].width} h=${HOUSE_AREAS[0].height}`);
  }
  check(allIn, `n=${n} → all tokens inside H1 bbox`);
}

console.log('\n--- layoutHouse() across all 12 areas (n=4) ---');
for (let i = 0; i < HOUSE_AREAS.length; i++) {
  const a = HOUSE_AREAS[i];
  const { tokens, font } = layoutHouse(POOL.slice(0, 4), a);
  check(font >= 8 && font <= 14, `H${i + 1} font ${font} ∈ [8..14]`);
  let ok = true;
  for (const t of tokens) if (!inRect(t.x, t.y, a)) ok = false;
  check(ok, `H${i + 1} all 4 tokens inside bbox`);
}

console.log('\n--- buildChartLayout() shape ---');
const planets = POOL.map((p, i) => ({ ...p, rashi_idx: i % 12 }));
const layout = buildChartLayout(planets, 0);
check(Array.isArray(layout) && layout.length === 12, `12 entries returned`);
let shapeOk = true;
for (let i = 0; i < layout.length; i++) {
  const h = layout[i];
  if (h.houseNum !== i + 1 ||
      typeof h.rashiNum !== 'number' || h.rashiNum < 1 || h.rashiNum > 12 ||
      typeof h.polygon !== 'string' ||
      !Array.isArray(h.tokens)) {
    shapeOk = false;
    console.log('   bad entry', i, JSON.stringify({...h, tokens: h.tokens?.length}));
  }
}
check(shapeOk, 'all entries have {houseNum,rashiNum,polygon:string,tokens:array}');

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
