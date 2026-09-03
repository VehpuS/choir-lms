import { StyleSheet } from 'react-native';

const BORDER_COLOR = '#d6d1c4';

export const SAVED_LIBRARY_SECTION_BACKGROUND = '#faf6ee';

export const savedRehearsalLibrarySectionStyles = StyleSheet.create({
  savedLibrarySection: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: SAVED_LIBRARY_SECTION_BACKGROUND,
  },
});
