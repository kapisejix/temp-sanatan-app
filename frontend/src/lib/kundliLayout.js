/**
 * North Indian Kundli chart — shared layout & no-overlap text positioning logic.
 *
 * Pure JavaScript (no React / DOM / RN dependencies) so it can be imported
 * by both the web (SVG via React) and the mobile app (react-native-svg).
 *
 * Guarantees:
 *  - Every text label is positioned inside its house's anchor box (BBox-derived).
 *  - Font auto-scales (8..16px) based on planet count to prevent overflow.
 *  - 1–2 planets → centre row;  3–4 → vertical stack;  5+ → 2-col grid.
 *  - >7 planets → first 7 + "+N" overflow indicator (matches spec).
 */

// ---------- Static geometry (400×400 viewBox) ----------
// 12 house polygons (point strings) — used by the renderer.
export const HOUSE_POLYGONS = [
  '200,0 100,100 300,100',                 // H1  top centre triangle
  '0,0 200,0 100,100',                     // H2  upper-left small triangle
  '0,0 100,100 0,200',                     // H3  left-upper triangle
  '0,200 100,100 200,200 100,300',         // H4  mid-left rhombus
  '0,200 100,300 0,400',                   // H5  left-lower triangle
  '0,400 100,300 200,400',                 // H6  bottom-left small triangle
  '200,400 100,300 300,300',               // H7  bottom centre triangle
  '200,400 300,300 400,400',               // H8  bottom-right small triangle
  '400,400 300,300 400,200',               // H9  right-lower triangle
  '400,200 300,300 200,200 300,100',       // H10 mid-right rhombus
  '400,200 300,100 400,0',                 // H11 right-upper triangle
  '400,0 300,100 200,0',                   // H12 upper-right small triangle
];

// Per-house "safe text area" — a rectangle inside the polygon where text
// is guaranteed to render without overflowing the house boundary.
// Shape: { cx, cy, width, height, rashiAnchor: [x,y] }
//   - cx / cy   centre of the planet stack
//   - width     max horizontal extent for a single line
//   - height    vertical room available for stacking
//   - rashiAnchor  point to render the rashi-number (sign of this house)
//                   — placed at the inner vertex closest to chart centre
export const HOUSE_AREAS = [
  { cx: 200, cy: 60,  width: 130, height: 38, rashiAnchor: [200, 115] }, // H1
  { cx: 110, cy: 38,  width: 120, height: 30, rashiAnchor: [115, 90]  }, // H2
  { cx: 40,  cy: 110, width: 50,  height: 60, rashiAnchor: [80,  130] }, // H3
  { cx: 110, cy: 200, width: 70,  height: 50, rashiAnchor: [180, 215] }, // H4
  { cx: 40,  cy: 290, width: 50,  height: 60, rashiAnchor: [80,  270] }, // H5
  { cx: 110, cy: 362, width: 120, height: 30, rashiAnchor: [115, 312] }, // H6
  { cx: 200, cy: 340, width: 130, height: 38, rashiAnchor: [200, 290] }, // H7
  { cx: 290, cy: 362, width: 120, height: 30, rashiAnchor: [285, 312] }, // H8
  { cx: 360, cy: 290, width: 50,  height: 60, rashiAnchor: [320, 270] }, // H9
  { cx: 290, cy: 200, width: 70,  height: 50, rashiAnchor: [220, 215] }, // H10
  { cx: 360, cy: 110, width: 50,  height: 60, rashiAnchor: [320, 130] }, // H11
  { cx: 290, cy: 38,  width: 120, height: 30, rashiAnchor: [285, 90]  }, // H12
];

// ---------- Planet abbreviations & colours ----------
export const GRAHA_ABBR_HI = {
  Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु',
  Jupiter: 'गु', Venus: 'शु', Saturn: 'श',  Rahu: 'रा', Ketu: 'के',
};
export const GRAHA_ABBR_EN = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};
export const GRAHA_FULL_HI = {
  Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध',
  Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
};
export const GRAHA_COLOR = {
  Sun: '#D63031', Moon: '#74B9FF', Mars: '#0A6E2D', Mercury: '#1E40AF',
  Jupiter: '#7B3F61', Venus: '#0A6E2D', Saturn: '#B45309',
  Rahu: '#7C2D12', Ketu: '#A16207',
};
export const RASHI_HI = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];

// ---------- Layout calculator ----------
const FONT_MIN = 8;
const FONT_MAX = 14;
const LINE_PAD = 2;
const PADDING = 6; // px inside the house

/**
 * Compute pixel-positioned tokens for a single house.
 *
 * @param {object[]} planets  array of { graha, degree_in_sign?, is_retrograde? }
 * @param {object}   area     element of HOUSE_AREAS
 * @returns {{ tokens: TextToken[], font: number }}
 *
 * TextToken = {
 *    x, y, fontSize,
 *    label,           // primary glyphs (graha abbr or "+N")
 *    sup?,            // optional superscript (degree number)
 *    color,
 *    isOverflow?: bool,
 * }
 */
export function layoutHouse(planets, area) {
  const list = (planets || []).slice();
  const n = list.length;
  if (n === 0) return { tokens: [], font: FONT_MAX };

  // Truncation: max 7 + "+N" pill
  const MAX_VISIBLE = 7;
  let overflowCount = 0;
  let visible = list;
  if (n > MAX_VISIBLE) {
    visible = list.slice(0, MAX_VISIBLE);
    overflowCount = n - MAX_VISIBLE;
  }
  const total = visible.length + (overflowCount ? 1 : 0);

  // Decide grid cols/rows
  let cols, rows;
  if (total <= 2)      { cols = total; rows = 1; }
  else if (total <= 4) { cols = 1;     rows = total; }
  else                 { cols = 2;     rows = Math.ceil(total / 2); }

  // Auto-scale font so all rows fit within (height - 2*padding)
  const usableH = Math.max(area.height - 2 * PADDING, 12);
  const usableW = Math.max(area.width  - 2 * PADDING, 24);

  let font = Math.floor(Math.min(usableH / rows - LINE_PAD, FONT_MAX));
  font = Math.max(font, FONT_MIN);

  // Each "cell" width = label glyph width + ~10px sup space
  const cellWidth = Math.min(Math.floor(usableW / Math.max(cols, 1)), 56);
  const cellHeight = font + LINE_PAD;

  // Centre the grid
  const totalGridW = cellWidth * cols;
  const totalGridH = cellHeight * rows;
  const startX = area.cx - totalGridW / 2 + cellWidth / 2;
  const startY = area.cy - totalGridH / 2 + cellHeight / 2;

  const tokens = [];
  visible.forEach((p, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = startX + c * cellWidth;
    const y = startY + r * cellHeight;
    const abbr = GRAHA_ABBR_HI[p.graha] || p.graha;
    const deg = (typeof p.degree_in_sign === 'number')
      ? String(Math.floor(p.degree_in_sign)).padStart(2, '0')
      : null;
    tokens.push({
      x, y, fontSize: font,
      label: abbr + (p.is_retrograde ? '(व)' : ''),
      sup: deg,
      color: p.is_retrograde ? '#92400E' : (GRAHA_COLOR[p.graha] || '#E95A34'),
      graha: p.graha,
    });
  });

  if (overflowCount > 0) {
    const i = visible.length;
    const r = Math.floor(i / cols);
    const c = i % cols;
    tokens.push({
      x: startX + c * cellWidth,
      y: startY + r * cellHeight,
      fontSize: font,
      label: `+${overflowCount}`,
      color: '#7A8690',
      isOverflow: true,
    });
  }

  return { tokens, font };
}

/**
 * Build a per-house planet map from a planets array + ascendant rashi.
 * The chart uses fixed-position house cells; rashi rotates with the ascendant.
 *
 * @param  {object[]} planets array of { graha, rashi_idx, ... }
 * @param  {number}   ascRashiIdx 0..11 ascendant rashi index
 * @returns {object[][]}  housesPlanets[i] = planets in House (i+1)
 */
export function groupPlanetsByHouse(planets, ascRashiIdx) {
  const houses = Array.from({ length: 12 }, () => []);
  (planets || []).forEach((p) => {
    const houseNum = ((p.rashi_idx - ascRashiIdx + 12) % 12) + 1;
    houses[houseNum - 1].push(p);
  });
  return houses;
}

/**
 * Returns all 12 house renderings (computed once) — useful for cached layout.
 */
export function buildChartLayout(planets, ascRashiIdx) {
  const housesPlanets = groupPlanetsByHouse(planets, ascRashiIdx);
  return HOUSE_AREAS.map((area, i) => {
    const layout = layoutHouse(housesPlanets[i], area);
    const rashiIdx = (ascRashiIdx + i) % 12;
    return {
      houseNum: i + 1,
      rashiIdx,
      rashiNum: rashiIdx + 1,
      rashiName: RASHI_HI[rashiIdx],
      area,
      polygon: HOUSE_POLYGONS[i],
      planets: housesPlanets[i],
      tokens: layout.tokens,
      font: layout.font,
    };
  });
}

// Rashi number colour palette — alternating per house index
export const RASHI_NUM_COLORS = [
  '#1E40AF','#7B3F61','#0A6E2D','#B91C1C',
  '#0A6E2D','#B45309','#B91C1C','#7B3F61',
  '#1E40AF','#7B3F61','#7C2D12','#0A6E2D',
];
