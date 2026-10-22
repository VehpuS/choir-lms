import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { MarkerNoticeBar } from './markers-sheet/marker-notice-bar';

type MarkerAddToastProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
};

// Floats above the playback surface without taking layout space, so adding a
// marker never moves the waveform or the transport controls. `box-none` keeps
// everything outside the card tappable.
const TOAST_BOTTOM_OFFSET = 24;

export const MarkerAddToast = (props: MarkerAddToastProps) => {
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View style={styles.card}>
        <MarkerNoticeBar {...props} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...appTheme.elevation.raised,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surfaceRaised,
  },
  layer: {
    position: 'absolute',
    right: appTheme.space.sheetInset,
    bottom: TOAST_BOTTOM_OFFSET,
    left: appTheme.space.sheetInset,
    zIndex: 10,
  },
});
