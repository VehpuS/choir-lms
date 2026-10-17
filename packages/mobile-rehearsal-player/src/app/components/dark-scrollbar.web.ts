import type { ViewStyle } from 'react-native';

// A CSS `color-scheme` value, not a color from the palette.
const DARK_SCHEME = 'dark';

// Browsers draw a light scrollbar on a dark ground unless told the element is
// dark. `colorScheme` is a CSS property that react-native-web passes through
// but React Native's style types do not list.
export const darkScrollbarStyle = { colorScheme: DARK_SCHEME } as ViewStyle;
