import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

export const savedLoopListStyles = StyleSheet.create({
  loopGroup: {
    gap: appTheme.space.md,
  },
  loopGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loopGroupTitle: {
    ...appTheme.type.kicker,
    flex: 1,
    color: appTheme.colors.textMuted,
  },
  // Loops are a card stack rather than hairline rows because the active
  // loop expands (screen 1d).
  loopCards: {
    gap: 10,
  },
});
