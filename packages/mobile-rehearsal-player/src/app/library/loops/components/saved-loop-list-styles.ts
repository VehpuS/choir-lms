import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

export const savedLoopListStyles = StyleSheet.create({
  loopGroup: {
    gap: appTheme.space.md,
  },
  loopGroupTitle: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
  },
  // Loops are a card stack rather than hairline rows because the active
  // loop expands (screen 1d).
  loopCards: {
    gap: 10,
  },
});
