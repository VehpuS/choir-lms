import { Pressable, StyleSheet, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { appTheme } from '../../../../utils/theme';
import { PIANO_COMPACT_BAR_HEIGHT } from '../../piano-overlay-model';
import { PianoKeyWidthControl, PianoVolumeControl } from './piano-bar-controls';
import { PianoScrollStrip } from './piano-scroll-strip';

const { colors, space } = appTheme;
const ICON_SIZE = 18;
/** The sliders are as tall as the bar, so the bar stays at its 34 pt. */
const SLIDER_HEIGHT = PIANO_COMPACT_BAR_HEIGHT;
/** Narrower than the docked row's 104, so the minimap keeps room beside the pane. */
const COMPACT_CONTROL_WIDTH = 72;

type PianoCompactBarProps = {
  keyWidth: number;
  onChangeKeyWidth: (width: number) => void;
  onChangeVolume: (volume: number) => void;
  onClose: () => void;
  /** Absent where full screen is not offered (the viewer). */
  onFullScreen?: () => void;
  onScrollLeftChange: (scrollLeft: number) => void;
  scrollLeft: number;
  stripWidth: number;
  viewportWidth: number;
  volume: number;
};

/**
 * The wide-short piano's controls: volume, key width, the minimap (which is
 * how the keys scroll, so it stays), Full screen and close, in one 34 pt row above the keys.
 */
export const PianoCompactBar = ({
  keyWidth,
  onChangeKeyWidth,
  onChangeVolume,
  onClose,
  onFullScreen,
  onScrollLeftChange,
  scrollLeft,
  stripWidth,
  viewportWidth,
  volume,
}: PianoCompactBarProps) => (
  <View style={styles.bar}>
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
    <PianoScrollStrip
      isInBar
      onScrollLeftChange={onScrollLeftChange}
      scrollLeft={scrollLeft}
      stripWidth={stripWidth}
      viewportWidth={viewportWidth}
    />
    {onFullScreen ? (
      <Pressable
        accessibilityLabel="Full screen"
        accessibilityRole="button"
        onPress={onFullScreen}
        style={styles.button}
      >
        <AppIcon color={colors.icon} name="arrow-expand" size={ICON_SIZE} />
      </Pressable>
    ) : null}
    <Pressable
      accessibilityLabel="Close piano"
      accessibilityRole="button"
      onPress={onClose}
      style={styles.button}
    >
      <AppIcon color={colors.icon} name="close" size={ICON_SIZE} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: PIANO_COMPACT_BAR_HEIGHT,
    paddingLeft: space.md,
  },
  control: { marginRight: space.sm, width: COMPACT_CONTROL_WIDTH },
  button: {
    alignItems: 'center',
    height: PIANO_COMPACT_BAR_HEIGHT,
    justifyContent: 'center',
    width: appTheme.space.touchTarget,
  },
});
