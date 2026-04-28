import React from 'react';

/**
 * North Indian Kundli Chart (D1 / D9) — SVG diamond layout.
 * Houses are fixed positions; rashis rotate based on Ascendant.
 *
 * Standard North Indian layout:
 *   +-----+-----+
 *   | H12 | H1  |  (top row, with House 1 = Lagna, top-centre)
 *   +-----+-----+
 *   ...houses arranged in 12 triangular/diamond cells.
 *
 * We use a 4×4 grid with House 1 at top-centre, going anti-clockwise:
 * H1 = top-centre (Lagna), H2 = top-left, H3 = mid-left-upper,
 * H4 = mid-left, H5 = mid-left-lower, H6 = bottom-left,
 * H7 = bottom-centre, H8 = bottom-right, H9 = mid-right-lower,
 * H10 = mid-right, H11 = mid-right-upper, H12 = top-right.
 */

// 12 cell layouts as polygon points in 400×400 viewbox.
// Outer square 0,0,400,400. Inner diamond corners at (200,0),(400,200),(200,400),(0,200).
// Inner cross from corner-to-corner: lines (0,0)-(400,400) and (0,400)-(400,0).
const HOUSE_POLYGONS = [
  // House 1 (top-centre triangle): apex at top-centre, base is upper inner diamond
  '200,0 100,100 300,100',
  // House 2 (upper-left small triangle)
  '0,0 200,0 100,100',
  // House 3 (left-upper diamond cell)
  '0,0 100,100 0,200',
  // House 4 (mid-left rhombus)
  '0,200 100,100 200,200 100,300',
  // House 5 (left-lower triangle)
  '0,200 100,300 0,400',
  // House 6 (lower-left small triangle)
  '0,400 100,300 200,400',
  // House 7 (bottom-centre triangle)
  '200,400 100,300 300,300',
  // House 8 (lower-right small triangle)
  '200,400 300,300 400,400',
  // House 9 (right-lower triangle)
  '400,400 300,300 400,200',
  // House 10 (mid-right rhombus)
  '400,200 300,300 200,200 300,100',
  // House 11 (right-upper triangle)
  '400,200 300,100 400,0',
  // House 12 (upper-right small triangle)
  '400,0 300,100 200,0',
];

// Approximate text-anchor centres for each house (x,y)
const HOUSE_CENTRES = [
  [200, 65],   // 1
  [110, 45],   // 2
  [50, 110],   // 3
  [110, 200],  // 4
  [50, 290],   // 5
  [110, 360],  // 6
  [200, 340],  // 7
  [290, 360],  // 8
  [350, 290],  // 9
  [290, 200],  // 10
  [350, 110],  // 11
  [290, 45],   // 12
];

const RASHI_HI_SHORT = ["मेष", "वृष", "मिथुन", "कर्क", "सिंह", "कन्या",
                         "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"];

const GRAHA_HI_SHORT = {
  Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध",
  Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु",
};
const GRAHA_EN_SHORT = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

export default function NorthIndianChart({
  ascendantRashiIdx,
  planets,        // [{graha, rashi_idx, is_retrograde?}]
  title = "Lagna Kundli (D1)",
  language = "hi",
  size = 400,
}) {
  // For each house (1..12), the rashi index = (asc + house - 1) % 12
  const housesPlanets = Array.from({ length: 12 }, () => []);
  (planets || []).forEach(p => {
    // House where planet sits
    const house = ((p.rashi_idx - ascendantRashiIdx + 12) % 12) + 1;
    housesPlanets[house - 1].push(p);
  });

  return (
    <div className="bg-white rounded-xl border border-[#E8E4E1] p-4" data-testid={`kundli-chart-${title.toLowerCase().replace(/\s+/g,'-')}`}>
      <h4 className="text-sm font-bold tracking-tight mb-3 text-center" style={{ fontFamily: 'Manrope' }}>{title}</h4>
      <svg viewBox="0 0 400 400" width={size} height={size} className="mx-auto" style={{ maxWidth: '100%' }}>
        {/* Outer square */}
        <rect x="0" y="0" width="400" height="400" fill="none" stroke="#E95A34" strokeWidth="2" />
        {/* Diamonds */}
        <line x1="0" y1="0" x2="400" y2="400" stroke="#E95A34" strokeWidth="1.5" />
        <line x1="400" y1="0" x2="0" y2="400" stroke="#E95A34" strokeWidth="1.5" />
        <polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="#E95A34" strokeWidth="1.5" />

        {/* House polygons (transparent for hit testing only) */}
        {HOUSE_POLYGONS.map((pts, i) => (
          <polygon key={i} points={pts} fill="transparent" />
        ))}

        {/* House numbers + rashi short label */}
        {HOUSE_CENTRES.map(([cx, cy], i) => {
          const houseNum = i + 1;
          const rashiIdx = (ascendantRashiIdx + i) % 12;
          return (
            <g key={`h-${i}`}>
              <text x={cx} y={cy} fontSize="9" fill="#7A8690" textAnchor="middle">
                {houseNum} · {RASHI_HI_SHORT[rashiIdx]}
              </text>
            </g>
          );
        })}

        {/* Planets */}
        {HOUSE_CENTRES.map(([cx, cy], i) => {
          const planetsInHouse = housesPlanets[i];
          return planetsInHouse.map((p, pi) => {
            const yOffset = 14 + pi * 12;
            const label = language === 'hi' ? GRAHA_HI_SHORT[p.graha] || p.graha : GRAHA_EN_SHORT[p.graha] || p.graha;
            return (
              <text
                key={`p-${i}-${pi}`}
                x={cx}
                y={cy + yOffset}
                fontSize="11"
                fontWeight="700"
                fill={p.is_retrograde ? "#92400E" : "#E95A34"}
                textAnchor="middle"
              >
                {label}{p.is_retrograde ? '(व)' : ''}
              </text>
            );
          });
        })}

        {/* Ascendant marker on house 1 */}
        <text x="200" y="90" fontSize="10" fontWeight="700" fill="#991B1B" textAnchor="middle">
          {language === 'hi' ? 'लग्न' : 'Asc'}
        </text>
      </svg>
    </div>
  );
}
