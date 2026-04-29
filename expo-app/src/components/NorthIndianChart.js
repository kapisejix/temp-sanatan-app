import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Polygon, Text as SvgText, G } from 'react-native-svg';
import {
  HOUSE_POLYGONS, buildChartLayout, RASHI_NUM_COLORS,
} from '../lib/kundliLayout';
import { COLORS } from '../config/api';

/**
 * North Indian Kundli Chart for mobile.
 * Renders D1 / D9 / D7 / D10 with the same no-overlap layout engine used on web.
 *
 * Props:
 *   ascendantRashiIdx  number 0..11
 *   planets            [{ graha, rashi_idx, degree_in_sign?, is_retrograde? }]
 *   title              string
 *   size               px (defaults to flex)
 */
export default function NorthIndianChart({
  ascendantRashiIdx,
  planets,
  title = 'लग्न कुंडली (D1)',
  size = 340,
}) {
  const layout = useMemo(
    () => buildChartLayout(planets, ascendantRashiIdx),
    [planets, ascendantRashiIdx]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Svg viewBox="0 0 400 400" width={size} height={size} style={styles.svg}>
        {/* Outer square */}
        <Rect x="0" y="0" width="400" height="400" fill="none" stroke={COLORS.primary} strokeWidth="2" />
        {/* Diagonals */}
        <Line x1="0" y1="0" x2="400" y2="400" stroke={COLORS.primary} strokeWidth="1.4" />
        <Line x1="400" y1="0" x2="0" y2="400" stroke={COLORS.primary} strokeWidth="1.4" />
        {/* Inner diamond */}
        <Polygon points="200,0 400,200 200,400 0,200" fill="none" stroke={COLORS.primary} strokeWidth="1.4" />

        {/* Transparent house outlines for visual structure */}
        {HOUSE_POLYGONS.map((pts, i) => (
          <Polygon key={`h-${i}`} points={pts} fill="transparent" />
        ))}

        {/* Houses: rashi-number at inner vertex + planet tokens */}
        {layout.map((h, i) => (
          <G key={`hg-${i}`}>
            <SvgText
              x={h.area.rashiAnchor[0]}
              y={h.area.rashiAnchor[1] + 4}
              fontSize="14"
              fontWeight="700"
              fill={RASHI_NUM_COLORS[i]}
              textAnchor="middle"
            >
              {h.rashiNum}
            </SvgText>
            {h.tokens.map((t, ti) => (
              <G key={`t-${i}-${ti}`}>
                <SvgText
                  x={t.x}
                  y={t.y + t.fontSize * 0.35}
                  fontSize={t.fontSize}
                  fontWeight={t.isOverflow ? '600' : '700'}
                  fill={t.color}
                  textAnchor="middle"
                >
                  {t.label}
                </SvgText>
                {t.sup ? (
                  <SvgText
                    x={t.x + (t.label.length * t.fontSize * 0.32) + 2}
                    y={t.y - t.fontSize * 0.05}
                    fontSize={Math.max(t.fontSize * 0.65, 7)}
                    fontWeight="600"
                    fill={t.color}
                    textAnchor="start"
                  >
                    {t.sup}
                  </SvgText>
                ) : null}
              </G>
            ))}
          </G>
        ))}

        {/* Lagna marker */}
        <SvgText x="200" y="22" fontSize="9" fontWeight="700" fill="#991B1B" textAnchor="middle">
          लग्न
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  svg: {
    backgroundColor: '#FFFFFF',
  },
});
