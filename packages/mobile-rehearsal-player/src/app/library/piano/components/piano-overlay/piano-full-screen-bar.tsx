import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { appTheme } from '../../../../utils/theme';
import { PIANO_FULL_SCREEN_BAR_HEIGHT } from '../../piano-overlay-model';
import { PianoKeyWidthControl, PianoVolumeControl } from './piano-bar-controls';

const { colors, radius, space } = appTheme;
const ICON_SIZE = 18;
const SLIDER_HEIGHT = PIANO_FULL_SCREEN_BAR_HEIGHT;

type PianoFullScreenBarProps = {
  isAutoHideOn: boolean;
  /** False while auto-hide has hidden the controls; only Exit stays on screen. */
  isContentShown: boolean;
  keyWidth: number;
  onChangeKeyWidth: (width: number) => void;
  onChangeVolume: (volume: number) => void;
  onClose: () => void;
  onExitFullScreen: () => void;
  onToggleAutoHide: () => void;
  /** `C♯4 · 17 cents flat` while a note is sung. */
  sungReadout: string | null;
  volume: number;
};

/**
 * The full-screen piano's slim bar: volume, key width, the sung-note readout,
 * the auto-hide choice, Exit full screen and Close. With auto-hide on and the
 * controls hidden, the bar keeps its height (so the keys do not resize) and
 * only Exit full screen stays; any touch brings the rest back.
 */
export const PianoFullScreenBar = ({
  isAutoHideOn,
  isContentShown,
  keyWidth,
  onChangeKeyWidth,
  onChangeVolume,
  onClose,
  onExitFullScreen,
  onToggleAutoHide,
  sungReadout,
  volume,
}: PianoFullScreenBarProps) => (
  <View style={styles.bar}>
    <View
      pointerEvents={isContentShown ? 'auto' : 'none'}
      style={[styles.controls, isContentShown ? null : styles.hidden]}
    >
      <PianoVolumeControl
        height={SLIDER_HEIGHT}
        onChange={onChangeVolume}
        style={styles.control}
        volume={volume}
      />
      <PianoKeyWidthControl
        height={SLIDER_HEIGHT}
        keyWidth={keyWidth}
        onChange={onChangeKeyWidth}
        style={styles.control}
      />
      <Text
        accessibilityLiveRegion="polite"
        numberOfLines={1}
        style={styles.readout}
      >
        {sungReadout ?? ''}
      </Text>
      <Pressable
        accessibilityLabel="Auto-hide controls"
        accessibilityRole="switch"
        accessibilityState={{ checked: isAutoHideOn }}
        onPress={onToggleAutoHide}
        style={[styles.pill, isAutoHideOn ? styles.pillOn : null]}
      >
        <Text style={styles.pillLabel}>Auto-hide</Text>
      </Pressable>
    </View>
    <Pressable
      accessibilityLabel="Exit full screen"
      accessibilityRole="button"
      onPress={onExitFullScreen}
      style={styles.button}
    >
      <AppIcon color={colors.icon} name="arrow-collapse" size={ICON_SIZE} />
    </Pressable>
    <Pressable
      accessibilityLabel="Close piano"
      accessibilityRole="button"
      onPress={onClose}
      pointerEvents={isContentShown ? 'auto' : 'none'}
      style={[styles.button, isContentShown ? null : styles.hidden]}
    >
      <AppIcon color={colors.icon} name="close" size={ICON_SIZE} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    flexDirection: 'row',
    height: PIANO_FULL_SCREEN_BAR_HEIGHT,
    paddingLeft: space.md,
  },
  controls: { alignItems: 'center', flex: 1, flexDirection: 'row' },
  // Hidden, not removed, so the bar's layout and the keys below do not move.
  hidden: { opacity: 0 },
  control: { marginRight: space.sm },
  readout: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontVariant: [...appTheme.tabularNumbers],
    textAlign: 'center',
  },
  pill: {
    borderColor: colors.borderSubtle,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginHorizontal: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
  },
  pillOn: { borderColor: colors.accent },
  pillLabel: { color: colors.textMuted, fontSize: 12 },
  button: {
    alignItems: 'center',
    height: PIANO_FULL_SCREEN_BAR_HEIGHT,
    justifyContent: 'center',
    width: appTheme.space.touchTarget,
  },
});
