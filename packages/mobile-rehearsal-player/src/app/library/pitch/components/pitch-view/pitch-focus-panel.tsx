import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { monoFontFamily } from '../../../../utils/mono-font-family';
import { appTheme } from '../../../../utils/theme';
import type { FocusPoint } from '../../view/pitch-focus-model';
import { layoutFocus } from '../../view/pitch-view-geometry';
import { ZONE_COLORS } from '../../view/pitch-zone-colors';
import { useMeasuredSize } from './use-measured-size';

type PitchFocusPanelProps = {
  points: readonly FocusPoint[];
  height: number;
};

const { colors, space } = appTheme;
const PANEL_FILL = colors.surface;
const LIMIT_LINE = colors.neutral[500];
const LABEL_COLOR = colors.textMuted;
/** Room on the right for the band labels and the leading dot. */
const RIGHT_GUTTER = 84;
const LABEL_FONT_SIZE = 8.5;
const DOT_RADIUS = 5.5;
const MARKER_FONT_SIZE = 11;
/** Kept at the left, clear of the band labels on the right. */
const MARKER_LEFT = 5;
const MARKER_TOP = 14;
const MARKER_BOTTOM_INSET = 6;

/**
 * How close the singing is to one target note: cents over time against the
 * three labelled bands, with the current dot at the leading edge.
 */
export const PitchFocusPanel = ({ points, height }: PitchFocusPanelProps) => {
  const { size, onLayout, isMeasured } = useMeasuredSize();
  const layout = layoutFocus(points, size, RIGHT_GUTTER);

  return (
    <View onLayout={onLayout} style={[styles.panel, { height }]}>
      {isMeasured ? (
        <Svg
          accessibilityLabel="Closeness to the target"
          height={size.height}
          width={size.width}
        >
          <Rect fill={PANEL_FILL} height={size.height} width={size.width} />
          {[...layout.bands].reverse().map((band) => (
            <Rect
              fill={ZONE_COLORS[band.zone].fill}
              height={band.height}
              key={band.zone}
              width={size.width}
              x={0}
              y={band.y}
            />
          ))}
          {layout.bands.map((band) => (
            <Fragment key={`limit-${band.zone}`}>
              {[band.upperY, band.lowerY].map((y) => (
                <Line
                  key={y}
                  stroke={LIMIT_LINE}
                  strokeDasharray="3 3"
                  strokeWidth={0.6}
                  x1={0}
                  x2={size.width}
                  y1={y}
                  y2={y}
                />
              ))}
            </Fragment>
          ))}
          {layout.bands.map((band) => (
            <SvgText
              fill={LABEL_COLOR}
              fontFamily={monoFontFamily}
              fontSize={LABEL_FONT_SIZE}
              key={`label-${band.zone}`}
              textAnchor="end"
              x={size.width - 5}
              y={band.upperY - 2.5}
            >
              {`${band.label} ±${band.limitCents}`}
            </SvgText>
          ))}
          <Line
            stroke={colors.text}
            strokeWidth={1}
            x1={0}
            x2={size.width}
            y1={layout.centreY}
            y2={layout.centreY}
          />
          <SvgText
            fill={colors.text}
            fontFamily={monoFontFamily}
            fontSize={LABEL_FONT_SIZE}
            x={5}
            y={layout.centreY - 3}
          >
            in tune
          </SvgText>
          {layout.runs.map((run) => (
            <Polyline
              fill="none"
              key={`${run[0][0]}-${run.length}`}
              points={run.map((point) => point.join(',')).join(' ')}
              stroke={colors.accentText}
              strokeLinejoin="round"
              strokeWidth={1.8}
            />
          ))}
          {layout.current ? (
            <Circle
              cx={layout.current.x}
              cy={layout.current.y}
              fill={ZONE_COLORS[layout.current.zone].stroke}
              r={DOT_RADIUS}
              stroke={colors.bg}
              strokeWidth={1.5}
            />
          ) : null}
          {layout.current && layout.marker ? (
            <SvgText
              fill={ZONE_COLORS[layout.current.zone].stroke}
              fontSize={MARKER_FONT_SIZE}
              x={MARKER_LEFT}
              y={
                layout.marker === 'up'
                  ? MARKER_TOP
                  : size.height - MARKER_BOTTOM_INSET
              }
            >
              {layout.marker === 'up' ? '▲ sharp' : '▼ flat'}
            </SvgText>
          ) : null}
        </Svg>
      ) : null}
      {points.length === 0 ? (
        <Text style={styles.empty}>Sing a note to see how close you are</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: { borderRadius: 10, overflow: 'hidden' },
  empty: {
    position: 'absolute',
    right: 0,
    bottom: space.md,
    left: 0,
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 11,
  },
});
