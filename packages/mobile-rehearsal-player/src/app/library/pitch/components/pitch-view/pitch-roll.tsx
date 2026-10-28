import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { monoFontFamily } from '../../../../utils/mono-font-family';
import { appTheme } from '../../../../utils/theme';
import type { PitchHistorySnapshot } from '../../view/pitch-history';
import { layoutRoll } from '../../view/pitch-view-geometry';
import { buildRoll } from '../../view/pitch-roll-model';
import { ZONE_COLORS } from '../../view/pitch-zone-colors';
import { useMeasuredSize } from './use-measured-size';

type PitchRollProps = {
  history: PitchHistorySnapshot;
  windowSeconds: number;
  targetMidi: number | null;
  onHold: (midi: number) => void;
  onZoom: (direction: 'in' | 'out') => void;
};

const { colors, space } = appTheme;
const WHITE_ROW = colors.neutral[800];
const BLACK_ROW = colors.surfaceRaised;
const OCTAVE_LINE = colors.neutral[500];
const GRID_LINE = colors.divider;
const BAR_TEXT = colors.bg;
const SCALE_WIDTH = 38;
const LABEL_FONT_SIZE = 9;
const LABEL_BASELINE = 3;

/**
 * The pitch progression: sung notes as bars on a note-labelled scale that
 * scrolls in time, the current note at the leading edge. The scale's rows
 * hold a note as the target.
 */
export const PitchRoll = ({
  history,
  windowSeconds,
  targetMidi,
  onHold,
  onZoom,
}: PitchRollProps) => {
  const { size, onLayout, isMeasured } = useMeasuredSize();
  const roll = buildRoll(history, windowSeconds);
  const layout = layoutRoll(roll, size, targetMidi);

  return (
    <View style={styles.wrap}>
      <View style={styles.scale}>
        {roll.rows.map((row) => (
          <Pressable
            accessibilityLabel={`Hold ${row.name} as the target`}
            accessibilityRole="button"
            key={row.midi}
            onPress={() => onHold(row.midi)}
            style={[
              styles.scaleRow,
              layout.rows.find((item) => item.midi === row.midi)?.isBlackKey
                ? styles.scaleRowBlack
                : null,
            ]}
          >
            <Text
              style={[
                styles.scaleLabel,
                layout.rows.find((item) => item.midi === row.midi)?.isBlackKey
                  ? styles.scaleLabelBlack
                  : null,
                row.isOctave ? styles.scaleLabelOctave : null,
              ]}
            >
              {row.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <View onLayout={onLayout} style={styles.plot}>
        {isMeasured ? (
          <Svg
            accessibilityLabel="Pitch progression"
            height={size.height}
            width={size.width}
          >
            {layout.rows.map((row) => (
              <Rect
                fill={row.isBlackKey ? BLACK_ROW : WHITE_ROW}
                height={row.height}
                key={row.midi}
                width={size.width}
                x={0}
                y={row.y}
              />
            ))}
            {layout.rows
              .filter((row) => row.isOctave)
              .map((row) => (
                <Line
                  key={`octave-${row.midi}`}
                  stroke={OCTAVE_LINE}
                  strokeWidth={0.9}
                  x1={0}
                  x2={size.width}
                  y1={row.y + row.height}
                  y2={row.y + row.height}
                />
              ))}
            {layout.gridX.map((x) => (
              <Line
                key={`grid-${x}`}
                stroke={GRID_LINE}
                strokeWidth={0.6}
                x1={x}
                x2={x}
                y1={0}
                y2={size.height}
              />
            ))}
            {layout.targetRow ? (
              <Rect
                fill={colors.accentRegionFill}
                height={layout.targetRow.height}
                stroke={colors.accent}
                strokeWidth={0.8}
                width={size.width}
                x={0}
                y={layout.targetRow.y}
              />
            ) : null}
            {layout.bars.map((bar) => (
              <Rect
                fill={ZONE_COLORS[bar.zone].stroke}
                height={bar.height}
                key={bar.noteId}
                opacity={0.92}
                rx={3}
                stroke={bar.isCurrent ? colors.text : undefined}
                strokeWidth={bar.isCurrent ? 1.2 : 0}
                width={bar.width}
                x={bar.x}
                y={bar.y}
              />
            ))}
            {layout.bars.map((bar) =>
              bar.label ? (
                <SvgText
                  fill={BAR_TEXT}
                  fontFamily={monoFontFamily}
                  fontSize={LABEL_FONT_SIZE}
                  key={`label-${bar.noteId}`}
                  x={bar.x + 4}
                  y={bar.y + bar.height / 2 + LABEL_BASELINE}
                >
                  {bar.label}
                </SvgText>
              ) : null,
            )}
            <Line
              stroke={colors.accentText}
              strokeWidth={2}
              x1={size.width - 1}
              x2={size.width - 1}
              y1={0}
              y2={size.height}
            />
          </Svg>
        ) : null}
        <View style={styles.zoom}>
          <Text style={styles.zoomLabel}>{`${windowSeconds} s`}</Text>
          <SurfaceIconButton
            accessibilityLabel="Zoom out"
            icon="minus"
            onPress={() => onZoom('out')}
          />
          <SurfaceIconButton
            accessibilityLabel="Zoom in"
            icon="plus"
            onPress={() => onZoom('in')}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', minHeight: 0 },
  scale: { width: SCALE_WIDTH },
  scaleRow: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: space.xs,
    marginVertical: 0.6,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  scaleRowBlack: { backgroundColor: colors.neutral[700] },
  scaleLabel: {
    color: colors.divider,
    fontFamily: monoFontFamily,
    fontSize: LABEL_FONT_SIZE,
  },
  scaleLabelBlack: { color: colors.textMuted },
  scaleLabelOctave: { fontWeight: appTheme.fontWeight.medium },
  plot: { flex: 1, minWidth: 0, borderRadius: 4, overflow: 'hidden' },
  zoom: {
    position: 'absolute',
    right: space.sm,
    bottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  zoomLabel: {
    color: colors.textMuted,
    fontFamily: monoFontFamily,
    fontSize: 10.5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
  },
});
