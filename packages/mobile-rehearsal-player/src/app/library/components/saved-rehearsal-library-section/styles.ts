import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

// Every Library view and detail mode sits directly on the ground at the
// shell's content inset: no panel card (screens 1b–1d).
export const savedRehearsalLibrarySectionStyles = StyleSheet.create({
  savedLibrarySection: {
    gap: appTheme.space.md,
  },
});
