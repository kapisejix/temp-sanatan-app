import React from 'react';
import {
  HOUSE_POLYGONS, HOUSE_AREAS, buildChartLayout, RASHI_NUM_COLORS,
} from '../lib/kundliLayout';

/**
 * North Indian Kundli Chart — SVG, no-overlap guarantees.
 * Used for D1 / D9 / D7 / D10. Layout computed via shared kundliLayout module.
 */
export default function NorthIndianChart({
  ascendantRashiIdx,
  planets,
  title = 'Lagna Kundli (D1)',
  size = 400,
  showLagnaMarker = true,
}) {
  const layout = React.useMemo(
    () => buildChartLayout(planets, ascendantRashiIdx),
    [planets, ascendantRashiIdx]
  );

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

        {/* Transparent house polygons (used for hit-testing in interactive variant) */}
        {HOUSE_POLYGONS.map((pts, i) => (
          <polygon key={`h-${i}`} points={pts} fill="transparent" />
        ))}

        {/* Per-house render: rashi number + planet tokens */}
        {layout.map((h, i) => (
          <g key={`hg-${i}`}>
            {/* Rashi number at inner vertex */}
            <text
              x={h.area.rashiAnchor[0]}
              y={h.area.rashiAnchor[1]}
              fontSize="14"
              fontWeight="700"
              fill={RASHI_NUM_COLORS[i]}
              textAnchor="middle"
              data-testid={`chart-house-${h.houseNum}-rashi`}
            >
              {h.rashiNum}
            </text>

            {/* Planet labels — position pre-computed; no overlap. */}
            {h.tokens.map((t, ti) => (
              <g key={`t-${i}-${ti}`}>
                <text
                  x={t.x}
                  y={t.y}
                  fontSize={t.fontSize}
                  fontWeight={t.isOverflow ? 600 : 700}
                  fill={t.color}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  data-testid={t.isOverflow ? `chart-house-${h.houseNum}-overflow` : `chart-house-${h.houseNum}-graha-${t.graha || 'x'}`}
                >
                  {t.label}
                </text>
                {t.sup && (
                  <text
                    x={t.x + (t.label.length * t.fontSize * 0.32) + 2}
                    y={t.y - t.fontSize * 0.45}
                    fontSize={Math.max(t.fontSize * 0.65, 7)}
                    fontWeight="600"
                    fill={t.color}
                    textAnchor="start"
                  >
                    {t.sup}
                  </text>
                )}
              </g>
            ))}
          </g>
        ))}

        {/* Lagna marker — small label in House 1 */}
        {showLagnaMarker && (
          <text
            x="200"
            y="30"
            fontSize="9"
            fontWeight="700"
            fill="#991B1B"
            textAnchor="middle"
            data-testid="chart-lagna-marker"
          >
            लग्न
          </text>
        )}
      </svg>
    </div>
  );
}
