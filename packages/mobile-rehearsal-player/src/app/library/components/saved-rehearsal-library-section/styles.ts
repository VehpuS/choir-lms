import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

export const SAVED_LIBRARY_SECTION_BACKGROUND = appTheme.colors.surface;

export const savedRehearsalLibrarySectionStyles = StyleSheet.create({
  savedLibrarySection: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.borderSubtle,
    borderRadius: 16,
    backgroundColor: SAVED_LIBRARY_SECTION_BACKGROUND,
  },
});
