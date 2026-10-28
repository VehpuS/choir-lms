import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { appTheme } from '../../../utils/theme';
import { usePitch } from '../use-pitch';
import { closePitchMonitor } from '../pitch-monitor-controller';
import {
  buildSparkline,
  getMonitorModel,
  type MonitorAction,
  type MonitorNotice,
} from '../view/pitch-monitor-model';
import { PitchMonitorNote } from './pitch-monitor-note';

/** The strip's height with its top border; the dock height counts it. */
export const PITCH_MONITOR_HEIGHT = 65;

const { colors, space } = appTheme;

/**
 * The compact monitor (design Decision 6): the sung note, a cents gauge and a
 * few seconds of history, docked above the piano or the mini-player. It is a
 * consumer of the pitch store, so mounting it is what lets the microphone open.
 */
export const PitchMonitorStrip = () => {
  const { state, store } = usePitch();
  const model = getMonitorModel(state);
  const act = (action: MonitorAction) => {
    if (action === 'continue') {
      void store.confirmExplanation();
    } else {
      void store.requestListen();
    }
  };
  const dismissNotice = (notice: MonitorNotice) => {
    if (notice.kind === 'headphones') {
      store.dismissHeadphonesNote();
    } else {
      store.dismissBackgroundNotice();
    }
  };

  return (
    <View style={styles.dock}>
      {model.notice ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{model.notice.text}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => dismissNotice(model.notice as MonitorNotice)}
            style={styles.noticeButton}
          >
            <Text style={styles.noticeButtonLabel}>Got it</Text>
          </Pressable>
        </View>
      ) : null}
      <View accessibilityLabel="Pitch monitor" style={styles.strip}>
        {model.note ? (
          <PitchMonitorNote
            note={model.note}
            sparkline={buildSparkline(store.history.getSnapshot())}
          />
        ) : (
          <View style={styles.messageColumn}>
            <Text numberOfLines={3} style={styles.message}>
              <Text style={styles.messageTitle}>{model.message?.title} </Text>
              {model.message?.body}
            </Text>
          </View>
        )}
        {model.message?.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              act((model.message?.action as { kind: MonitorAction }).kind)
            }
            style={styles.action}
          >
            <Text style={styles.actionLabel}>{model.message.action.label}</Text>
          </Pressable>
        ) : null}
        <View style={styles.controls}>
          <SurfaceIconButton
            accessibilityLabel="Close pitch detection"
            icon="close"
            onPress={closePitchMonitor}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dock: { position: 'relative' },
  strip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    height: PITCH_MONITOR_HEIGHT,
    paddingLeft: space.md,
    paddingRight: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surfaceRaised,
  },
  messageColumn: { flex: 1, minWidth: 0 },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 17,
  },
  messageTitle: { color: colors.text, fontWeight: appTheme.fontWeight.medium },
  action: {
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: appTheme.radius.pill,
  },
  actionLabel: { color: colors.accentText, fontSize: 13 },
  controls: { flexDirection: 'row', gap: 2 },
  // Floats above the strip so the dock keeps one fixed height.
  notice: {
    position: 'absolute',
    right: 0,
    bottom: PITCH_MONITOR_HEIGHT,
    left: 0,
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.xs,
    paddingLeft: space.md,
    paddingRight: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.accentBorderDeep,
    backgroundColor: colors.surfaceAccent,
  },
  noticeText: { flex: 1, color: colors.text, fontSize: 12 },
  noticeButton: {
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  noticeButtonLabel: { color: colors.accentText, fontSize: 12 },
});
