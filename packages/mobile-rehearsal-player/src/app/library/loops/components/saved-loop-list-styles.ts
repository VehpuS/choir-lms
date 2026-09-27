import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

export const SAVED_LOOP_PRIMARY_TEXT = appTheme.colors.text;

export const savedLoopListStyles = StyleSheet.create({
  loopGroup: {
    gap: 12,
  },
  loopGroupTitle: {
    color: SAVED_LOOP_PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
});
