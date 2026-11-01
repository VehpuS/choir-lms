import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { buttonInteractionGuardStyle } from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import type {
  RecordingStripModel,
  StripAction,
  StripButton,
} from '../recording-strip-model';
import type { TimeLeftReadout } from '../recording-storage-limit';

/** The strip's height with its top border; the dock height counts it. */
export const RECORDING_STRIP_HEIGHT = 72;

const { colors, space } = appTheme;
const STOP_SIZE = 44;
const DOT_SIZE = 10;

type RecordingStripProps = {
  model: RecordingStripModel;
  onAction: (action: StripAction) => void;
};

const TimeLeft = ({ readout }: { readout: TimeLeftReadout | null }) => {
  return readout ? (
    <Text
      style={
        readout.tone === 'warning' ? styles.timeLeftWarning : styles.timeLeft
      }
    >
      {readout.text}
    </Text>
  ) : null;
};

const ActionButton = ({
  button,
  onAction,
  primary = true,
}: {
  button: StripButton;
  onAction: (action: StripAction) => void;
  primary?: boolean;
}) => (
  <Pressable
    accessibilityLabel={button.label}
    accessibilityRole="button"
    onPress={() => onAction(button.action)}
    style={({ pressed }) => [
      styles.action,
      primary ? styles.actionPrimary : null,
      buttonInteractionGuardStyle,
      pressed ? styles.pressed : null,
    ]}
  >
    {button.action === 'record' ? (
      <AppIcon color={colors.danger} name="record" size={18} />
    ) : null}
    <Text style={styles.actionLabel}>{button.label}</Text>
  </Pressable>
);

const Message = ({
  title,
  body,
  isProblem = false,
}: {
  title?: string;
  body: string;
  isProblem?: boolean;
}) => (
  <Text
    numberOfLines={3}
    style={[styles.message, isProblem ? styles.messageProblem : null]}
  >
    {title ? <Text style={styles.messageTitle}>{`${title} `}</Text> : null}
    {body}
  </Text>
);

/**
 * The recording strip (design Decision 8): one state at a time, from the
 * first-time explanation to the clock and stop control while recording, and
 * the message once it stops. It only renders a model; the session decides.
 */
export const RecordingStrip = ({ model, onAction }: RecordingStripProps) => {
  return (
    <View accessibilityLabel="Recording" style={styles.strip}>
      {model.kind === 'recording' ? (
        <>
          <View
            accessibilityLabel={model.accessibilityLabel}
            accessibilityLiveRegion="polite"
            style={styles.clockBlock}
          >
            <View style={styles.clockRow}>
              <View style={styles.dot} />
              <Text style={styles.clock}>{model.clock}</Text>
            </View>
            <TimeLeft readout={model.timeLeft} />
          </View>
          <View style={styles.markers}>
            {model.passed ? (
              <Text numberOfLines={1} style={styles.markerLine}>
                {model.passed}
              </Text>
            ) : null}
            {model.next ? (
              <Text numberOfLines={1} style={styles.markerLine}>
                {model.next}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={model.stop.label}
            accessibilityRole="button"
            onPress={() => onAction(model.stop.action)}
            style={({ pressed }) => [
              styles.stop,
              buttonInteractionGuardStyle,
              pressed ? styles.pressed : null,
            ]}
          >
            <AppIcon color={colors.bg} name="stop" size={20} />
          </Pressable>
        </>
      ) : model.kind === 'ready' ? (
        <>
          <View style={styles.messageColumn}>
            <Message body={model.body} title={model.title} />
            <TimeLeft readout={model.timeLeft} />
          </View>
          <ActionButton button={model.primary} onAction={onAction} />
        </>
      ) : model.kind === 'no-track' ? (
        <View style={styles.messageColumn}>
          <Message body={model.body} title={model.title} />
        </View>
      ) : model.kind === 'stopped' ? (
        <>
          <View style={styles.messageColumn}>
            <Message body={model.message} isProblem={model.isProblem} />
          </View>
          <ActionButton
            button={model.primary}
            onAction={onAction}
            primary={false}
          />
        </>
      ) : (
        <>
          <View style={styles.messageColumn}>
            <Message
              body={model.body}
              isProblem={model.kind !== 'explain'}
              title={model.title}
            />
          </View>
          <View style={styles.buttons}>
            <ActionButton button={model.primary} onAction={onAction} />
            {model.kind === 'explain' ? (
              <ActionButton
                button={model.secondary}
                onAction={onAction}
                primary={false}
              />
            ) : null}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
    justifyContent: 'center',
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: space.md,
    borderRadius: appTheme.radius.pill,
  },
  actionLabel: { color: colors.accentText, fontSize: 13 },
  actionPrimary: { borderWidth: 1, borderColor: colors.accent },
  buttons: { gap: 2 },
  clock: {
    color: colors.text,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: appTheme.fontWeight.medium,
  },
  clockBlock: { gap: 2 },
  clockRow: { alignItems: 'center', flexDirection: 'row', gap: space.xs },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.danger,
  },
  markerLine: { color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  markers: { flex: 1, minWidth: 0 },
  message: { color: colors.textMuted, fontSize: 13, lineHeight: 17 },
  messageColumn: { flex: 1, gap: 2, minWidth: 0 },
  messageProblem: { color: colors.warning },
  messageTitle: { color: colors.text, fontWeight: appTheme.fontWeight.medium },
  pressed: { opacity: 0.7 },
  stop: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: STOP_SIZE / 2,
    height: STOP_SIZE,
    justifyContent: 'center',
    width: STOP_SIZE,
  },
  strip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space.sm,
    height: RECORDING_STRIP_HEIGHT,
    paddingLeft: space.md,
    paddingRight: space.sm,
  },
  timeLeft: { color: colors.textMuted, fontSize: 12 },
  timeLeftWarning: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: appTheme.fontWeight.medium,
  },
});
