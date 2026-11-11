import type { ViewStyle } from 'react-native';

import { NOW_PLAYING_PANE_WIDTH, RAIL_WIDTH } from './shell-dimensions';

// The shell's `SafeAreaView` pads the page by the safe-area insets, which
// leaves the dock band short of the screen edges (dark strips at both ends and
// below it). The dock grows into that padding with a negative margin and pads
// its own content back by the same amount. `env()` needs
// `viewport-fit=cover` (public/index.html); `0px` is the fallback without it.
const LEFT = 'env(safe-area-inset-left, 0px)';
const RIGHT = 'env(safe-area-inset-right, 0px)';
const BOTTOM = 'env(safe-area-inset-bottom, 0px)';
const TOP = 'env(safe-area-inset-top, 0px)';

// react-native-web passes these strings through to CSS; the React Native
// style type only allows numbers there, hence the cast.
export const dockBleedStyle = {
  marginBottom: `calc(-1 * ${BOTTOM})`,
  marginLeft: `calc(-1 * ${LEFT})`,
  marginRight: `calc(-1 * ${RIGHT})`,
  paddingBottom: BOTTOM,
  paddingLeft: LEFT,
  paddingRight: RIGHT,
} as unknown as ViewStyle;

// The rail grows into the padding on its leading edge and above and below it
// in the same way, so its background reaches the screen edge it sits against.
// The width adds the inset: with border-box sizing the padding below is part of
// the width, so a rail that kept its 84 points would be left with 84 minus the
// inset for its entries.
export const railBleedStyle = {
  width: `calc(${RAIL_WIDTH}px + ${LEFT})`,
  marginBottom: `calc(-1 * ${BOTTOM})`,
  marginLeft: `calc(-1 * ${LEFT})`,
  marginTop: `calc(-1 * ${TOP})`,
  paddingBottom: BOTTOM,
  paddingLeft: LEFT,
  paddingTop: TOP,
} as unknown as ViewStyle;

// The pane sits against the trailing edge: it grows into the padding there and
// above and below it.
// Same for the pane's width on the trailing edge.
export const paneBleedStyle = {
  width: `calc(${NOW_PLAYING_PANE_WIDTH}px + ${RIGHT})`,
  marginBottom: `calc(-1 * ${BOTTOM})`,
  marginRight: `calc(-1 * ${RIGHT})`,
  marginTop: `calc(-1 * ${TOP})`,
  paddingBottom: BOTTOM,
  paddingRight: RIGHT,
  paddingTop: TOP,
} as unknown as ViewStyle;
