import { useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';

import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { appTheme } from '../../../../utils/theme';
import { usePitchLevelDb } from '../../use-pitch';
import {
  dragCutoffDb,
  getLevelMeterModel,
  meterRatioToCutoffDb,
  stepCutoffDb,
} from '../../view/pitch-level-meter-model';

type PitchLevelMeterProps = {
  cutoffDb: number;
  isListening: boolean;
  onChangeCutoffDb: (cutoffDb: number) => void;
};

const { colors, radius, space } = appTheme;
const PERCENT = 100;
const TRACK_HEIGHT = 28;
const MARKER_WIDTH = 4;

/**
 * The live input level with the minimum-volume cutoff drawn over it. Drag
 * anywhere along it, or use the - and + buttons, to set the cutoff just
 * above the room noise. Only this component follows the per-frame level.
 */
export const PitchLevelMeter = ({
  cutoffDb,
  isListening,
  onChangeCutoffDb,
}: PitchLevelMeterProps) => {
  const levelDb = usePitchLevelDb();
  const model = getLevelMeterModel({ cutoffDb, levelDb, isListening });
  const [width, setWidth] = useState(0);
  // The responder is created once, so it reads the latest values via a ref.
  const latest = useRef({ cutoffDb, width, onChangeCutoffDb });
  const dragStartDb = useRef(cutoffDb);

  latest.current = { cutoffDb, width, onChangeCutoffDb };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        const { width: trackWidth, onChangeCutoffDb: change } = latest.current;

        if (trackWidth <= 0) {
          return;
        }

        // A press jumps the cutoff there; a drag then moves it from there.
        const next = meterRatioToCutoffDb(
          event.nativeEvent.locationX / trackWidth,
        );

        dragStartDb.current = next;
        change(next);
      },
      onPanResponderMove: (_event, gesture) => {
        const { width: trackWidth, onChangeCutoffDb: change } = latest.current;

        if (trackWidth > 0) {
          change(dragCutoffDb(dragStartDb.current, gesture.dx / trackWidth));
        }
      },
    }),
  ).current;

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') {
      onChangeCutoffDb(stepCutoffDb(cutoffDb, 'louder'));
    } else if (event.nativeEvent.actionName === 'decrement') {
      onChangeCutoffDb(stepCutoffDb(cutoffDb, 'quieter'));
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>Minimum volume</Text>
        <Text style={styles.value}>{model.valueText}</Text>
      </View>
      <View style={styles.row}>
        <SurfaceIconButton
          accessibilityLabel="Quieter minimum volume"
          disabled={!model.canQuieter}
          icon="minus"
          onPress={() => onChangeCutoffDb(stepCutoffDb(cutoffDb, 'quieter'))}
        />
        <View
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          accessibilityLabel="Minimum volume"
          accessibilityRole="adjustable"
          accessibilityValue={{ text: model.valueText }}
          aria-valuetext={model.valueText}
          accessible
          onAccessibilityAction={onAccessibilityAction}
          onLayout={onLayout}
          style={styles.track}
          {...responder.panHandlers}
        >
          <View
            pointerEvents="none"
            style={[
              styles.level,
              {
                width: `${model.levelRatio * PERCENT}%`,
                backgroundColor: model.isHeard
                  ? colors.success
                  : colors.divider,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[styles.marker, { left: `${model.cutoffRatio * PERCENT}%` }]}
          />
        </View>
        <SurfaceIconButton
          accessibilityLabel="Louder minimum volume"
          disabled={!model.canLouder}
          icon="plus"
          onPress={() => onChangeCutoffDb(stepCutoffDb(cutoffDb, 'louder'))}
        />
      </View>
      <Text style={styles.note}>
        {model.hintText ?? (model.isHeard ? 'Heard' : 'Too quiet, ignored')}
      </Text>
      <Text style={styles.note}>Sounds quieter than this are ignored.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 14 },
  value: { color: colors.textMuted, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  track: {
    flex: 1,
    height: TRACK_HEIGHT,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  level: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MARKER_WIDTH,
    marginLeft: -MARKER_WIDTH / 2,
    backgroundColor: colors.accent,
  },
  note: { color: colors.textMuted, fontSize: 12 },
});
