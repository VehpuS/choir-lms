import { StyleSheet, View } from 'react-native';

import type { LibraryFilesSuccessFeedback } from '../../library/components/saved-rehearsal-library-section/library-files-success-feedback';
import { LibraryFilesSuccessFeedbackCard } from '../../library/components/saved-rehearsal-library-section/library-files-success-feedback-card';
import { appTheme } from '../../utils/theme';

// Clears the create button's corner, so the toast covers no header or control.
const SUCCESS_TOAST_BOTTOM_OFFSET = 76;

type LibrarySuccessToastProps = {
  feedback: LibraryFilesSuccessFeedback | null;
  onBlur: () => void;
  onDismiss: () => void;
  onFocus: () => void;
  onOpenFolder: (folderId: string) => void;
};

// A bottom toast above the dock: it covers no header or control and shows in
// every Library view (task 8.71).
export const LibrarySuccessToast = ({
  feedback,
  onBlur,
  onDismiss,
  onFocus,
  onOpenFolder,
}: LibrarySuccessToastProps) =>
  feedback ? (
    <View pointerEvents="box-none" style={styles.toast}>
      <LibraryFilesSuccessFeedbackCard
        feedback={feedback}
        onBlur={onBlur}
        onDismiss={onDismiss}
        onFocus={onFocus}
        onOpenFolder={onOpenFolder}
      />
    </View>
  ) : null;

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: appTheme.space.lg,
    right: appTheme.space.lg,
    bottom: SUCCESS_TOAST_BOTTOM_OFFSET,
    zIndex: 20,
  },
});
