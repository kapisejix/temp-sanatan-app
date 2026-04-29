import React from 'react';

/**
 * North Indian Kundli Chart — classic SVG diamond layout.
 *
 * Conventions matched against reference image:
 *  - Each of 12 fixed house cells displays the RASHI NUMBER (1=Aries..12=Pisces)
 *    at the cell's inner vertex (closest to chart centre).
 *  - Graha abbreviations are shown with degree-in-sign as a superscript
 *    (e.g. शु¹⁵, के⁰², गु⁰³).
 *  - Each graha gets a distinct colour for at-a-glance reading.
 *  - Retrograde planets get a "(व)" suffix and a warm tone.
 *
 * Standard 12-cell layout (400×400 viewBox):
 *   Outer rect 0,0,400,400. Inner diamond (200,0)-(400,200)-(200,400)-(0,200).
 *   Diagonals (0,0)-(400,400) and (0,400)-(400,0) carve 12 cells.
 *
 * Used for D1 (Lagna), D9 (Navamsa), D7 (Saptamsa), D10 (Dasamsa).
 */

// Rashi-number anchor points (where the rashi number is rendered for each house).
// Position is the inner vertex / inner corner of each cell, closest to centre.
const RASHI_NUM_POSITIONS = [
  // [x, y] for house index 0..11 (House 1..House 12)
  [200, 115], // H1 — top-centre triangle, anchored just below its base (toward centre)
  [115, 90],  // H2 — upper-left small triangle, near inner corner (100,100)
  [80, 130],  // H3 — left-upper triangle, near (100,100) on left side
  [180, 215], // H4 — mid-left rhombus, near centre vertex (200,200)
  [80, 270],  // H5 — left-lower triangle, near (100,300)
  [115, 312], // H6 — bottom-left small triangle, near (100,300) below
  [200, 290], // H7 — bottom-centre triangle, anchored just above its base (toward centre)
  [285, 312], // H8 — bottom-right small triangle, near (300,300)
  [320, 270], // H9 — right-lower triangle, near (300,300) on right
  [220, 215], // H10 — mid-right rhombus, near centre vertex (200,200)
  [320, 130], // H11 — right-upper triangle, near (300,100)
  [285, 90],  // H12 — upper-right small triangle, near (300,100) above
];

// Graha-cluster centres for each house (used as the anchor for stacking planets)
const GRAHA_ANCHORS = [
  [200, 60],   // H1 — middle of top triangle
  [110, 40],   // H2
  [40, 110],   // H3
  [110, 200],  // H4 (rhombus centre, slightly left of centre)
  [40, 290],   // H5
  [110, 360],  // H6
  [200, 350],  // H7
  [290, 360],  // H8
  [360, 290],  // H9
  [290, 200],  // H10
  [360, 110],  // H11
  [290, 40],   // H12
];

const GRAHA_HI = {
  Sun: 'सू', Moon: 'चं', Mars: 'मं', Mercury: 'बु',
  Jupiter: 'गु', Venus: 'शु', Saturn: 'श', Rahu: 'रा', Ketu: 'के',
};
const GRAHA_EN = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
};
const GRAHA_COLOR = {
  Sun: '#D63031',       // red
  Moon: '#74B9FF',      // sky blue
  Mars: '#0A6E2D',      // dark green
  Mercury: '#1E40AF',   // navy
  Jupiter: '#7B3F61',   // plum
  Venus: '#0A6E2D',     // green
  Saturn: '#B45309',    // amber
  Rahu: '#7C2D12',      // dark red-brown
  Ketu: '#A16207',      // gold
};

// Colour palette for rashi numbers — alternating per house index for visual rhythm
const RASHI_NUM_COLORS = [
  '#1E40AF', '#7B3F61', '#0A6E2D', '#B91C1C',
  '#0A6E2D', '#B45309', '#B91C1C', '#7B3F61',
  '#1E40AF', '#7B3F61', '#7C2D12', '#0A6E2D',
];

const GRAHA_HOUSE_FROM_RASHI = (rashi_idx, asc_idx) => ((rashi_idx - asc_idx + 12) % 12) + 1;

export default function NorthIndianChart({
  ascendantRashiIdx,
  planets,            // [{graha, rashi_idx, is_retrograde?, degree_in_sign?}]
  title = 'Lagna Kundli (D1)',
  language = 'hi',
  size = 400,
  showLagnaMarker = true,
}) {
  // Group planets by house index (0..11)
  const housesPlanets = Array.from({ length: 12 }, () => []);
  (planets || []).forEach((p) => {
    const houseNum = GRAHA_HOUSE_FROM_RASHI(p.rashi_idx, ascendantRashiIdx);
    housesPlanets[houseNum - 1].push(p);
  });

  return (
    <div
      className="bg-white rounded-xl border border-[#E8E4E1] p-4"
      data-testid={`kundli-chart-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <h4 className="text-sm font-bold tracking-tight mb-3 text-center" style={{ fontFamily: 'Manrope' }}>
        {title}
      </h4>
      <svg viewBox="0 0 400 400" width={size} height={size} className="mx-auto" style={{ maxWidth: '100%' }}>
        {/* Outer square */}
        <rect x="0" y="0" width="400" height="400" fill="none" stroke="#E95A34" strokeWidth="2" />
        {/* Diagonals */}
        <line x1="0" y1="0" x2="400" y2="400" stroke="#E95A34" strokeWidth="1.4" />
        <line x1="400" y1="0" x2="0" y2="400" stroke="#E95A34" strokeWidth="1.4" />
        {/* Inner diamond */}
        <polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="#E95A34" strokeWidth="1.4" />

        {/* Rashi numbers at inner vertices of each house */}
        {RASHI_NUM_POSITIONS.map(([x, y], i) => {
          const houseNum = i + 1;
          const rashiIdx = (ascendantRashiIdx + i) % 12;
          const rashiNum = rashiIdx + 1; // 1..12
          return (
            <text
              key={`rn-${i}`}
              x={x}
              y={y}
              fontSize="14"
              fontWeight="700"
              fill={RASHI_NUM_COLORS[i]}
              textAnchor="middle"
              data-testid={`chart-house-${houseNum}-rashi`}
            >
              {rashiNum}
            </text>
          );
        })}

        {/* Graha labels — stacked per house */}
        {GRAHA_ANCHORS.map(([cx, cy], i) => {
          const planetsInHouse = housesPlanets[i];
          if (!planetsInHouse.length) return null;

          // Stack horizontally if 2-3 planets, vertically beyond that.
          // For up to 3 planets in a triangular cell we stack horizontally;
          // for 4+ we wrap to a 2nd row.
          return planetsInHouse.map((p, pi) => {
            const perRow = planetsInHouse.length > 3 ? Math.ceil(planetsInHouse.length / 2) : planetsInHouse.length;
            const row = Math.floor(pi / perRow);
            const col = pi % perRow;
            const totalCols = Math.min(perRow, planetsInHouse.length - row * perRow);
            const xSpacing = 22;
            const xOffset = (col - (totalCols - 1) / 2) * xSpacing;
            const yOffset = row * 16;
            const label = language === 'hi' ? (GRAHA_HI[p.graha] || p.graha) : (GRAHA_EN[p.graha] || p.graha);
            const color = p.is_retrograde ? '#92400E' : (GRAHA_COLOR[p.graha] || '#E95A34');
            const deg = typeof p.degree_in_sign === 'number'
              ? String(Math.floor(p.degree_in_sign)).padStart(2, '0')
              : null;
            return (
              <g key={`p-${i}-${pi}`}>
                <text
                  x={cx + xOffset}
                  y={cy + yOffset}
                  fontSize="14"
                  fontWeight="700"
                  fill={color}
                  textAnchor="middle"
                  data-testid={`chart-graha-${i + 1}-${p.graha}`}
                >
                  {label}
                  {p.is_retrograde && <tspan fontSize="9" dx="1">(व)</tspan>}
                </text>
                {deg !== null && (
                  <text
                    x={cx + xOffset + 9}
                    y={cy + yOffset - 5}
                    fontSize="8"
                    fontWeight="600"
                    fill={color}
                    textAnchor="start"
                  >
                    {deg}
                  </text>
                )}
              </g>
            );
          });
        })}

        {/* Lagna marker on House 1 */}
        {showLagnaMarker && (
          <text
            x="200"
            y="38"
            fontSize="10"
            fontWeight="700"
            fill="#991B1B"
            textAnchor="middle"
            data-testid="chart-lagna-marker"
          >
            {language === 'hi' ? 'लग्न' : 'Asc'}
          </text>
        )}
      </svg>
    </div>
  );
}
