import type { ReactNode } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type SafeAreaFrameProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fills its parent and keeps its children clear of the device's safe areas
 * (the Dynamic Island, the home indicator, rounded corners). Surfaces that
 * render outside the shell's own `SafeAreaView` (sheets, dialogs and the
 * playback overlay are positioned absolutely or in a Modal, which ignore the
 * shell's padding) wrap their content in this so it does not run under them.
 * The backdrop stays outside the frame so it still reaches the screen edges.
 *
 * On the web `SafeAreaView` pads by `env(safe-area-inset-*)`, which needs
 * `viewport-fit=cover` (public/index.html); on iOS it uses the native insets;
 * on Android it adds nothing. A `padding*` in `style` replaces that side's
 * inset, so pass one only when it should.
 */
export const SafeAreaFrame = ({ children, style }: SafeAreaFrameProps) => (
  // box-none: the frame itself must not swallow taps meant for the backdrop.
  <SafeAreaView pointerEvents="box-none" style={[styles.frame, style]}>
    {children}
  </SafeAreaView>
);

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
});
