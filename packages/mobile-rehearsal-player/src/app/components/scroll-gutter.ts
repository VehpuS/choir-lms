import { StyleSheet } from 'react-native';

import { appTheme } from '../utils/theme';

// The shell pads every destination by `screenInset`, and a ScrollView clips
// whatever is drawn outside its own bounds, which hid the explorer row's accent
// mark (drawn `space.sm` left of the row). Letting the ScrollView bleed into
// the gutter by that amount and padding its content back keeps every row and
// header where it was while giving the mark room to show.
const SCROLL_GUTTER_BLEED = appTheme.space.sm;

export const scrollGutterStyles = StyleSheet.create({
  content: { paddingHorizontal: SCROLL_GUTTER_BLEED },
  scrollView: { marginHorizontal: -SCROLL_GUTTER_BLEED },
});
