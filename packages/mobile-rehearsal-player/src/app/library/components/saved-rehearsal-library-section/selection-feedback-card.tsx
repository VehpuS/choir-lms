import { LibraryFilesSuccessFeedbackCard } from './library-files-success-feedback-card';
import type { LibraryFilesSuccessFeedback } from './library-files-success-feedback';

type SelectionFeedbackCardProps = {
  feedback: LibraryFilesSuccessFeedback | null;
  /** The Files view draws the acknowledgment itself, over its own list. */
  isShownByFilesView: boolean;
  onBlur: () => void;
  onDismiss: () => void;
  onFocus: () => void;
  onOpenFolder: (folderId: string) => void;
};

/**
 * The completion acknowledgment of a bulk action in every Library view but
 * Files, in the flow above the content so it covers no control (see 8.71).
 */
export const SelectionFeedbackCard = ({
  feedback,
  isShownByFilesView,
  onBlur,
  onDismiss,
  onFocus,
  onOpenFolder,
}: SelectionFeedbackCardProps) =>
  feedback && !isShownByFilesView ? (
    <LibraryFilesSuccessFeedbackCard
      feedback={feedback}
      onBlur={onBlur}
      onDismiss={onDismiss}
      onFocus={onFocus}
      onOpenFolder={onOpenFolder}
    />
  ) : null;
