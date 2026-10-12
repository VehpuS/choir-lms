import { isScreenReaderEnabled } from '../../components/scoped-success-acknowledgment/is-screen-reader-enabled';
import { useScopedSuccessAcknowledgment } from '../../components/scoped-success-acknowledgment/use-scoped-success-acknowledgment';
import type { LibraryFilesSuccessFeedback } from '../../library/components/saved-rehearsal-library-section/library-files-success-feedback';
import type { SavedRehearsalLibraryView } from '../../library/saved-rehearsal-library/detail-mode';
import { useDismissOnViewChange } from './use-dismiss-on-view-change';
import { useOpenSuccessFeedbackFolder } from './use-open-success-feedback-folder';

const SUCCESS_ACKNOWLEDGMENT_AUTO_DISMISS_MS = 5000;

// The Library's completion acknowledgment (the bottom toast): it clears when
// the screen or view changes, and its `Open` action shows the folder it names.
export const useLibrarySuccessFeedback = (options: {
  isActive: boolean;
  openFolder: (folderId: string) => void;
  selectedView: SavedRehearsalLibraryView;
  setSelectedView: (view: SavedRehearsalLibraryView) => void;
}) => {
  const feedback = useScopedSuccessAcknowledgment<LibraryFilesSuccessFeedback>({
    autoDismissMs: SUCCESS_ACKNOWLEDGMENT_AUTO_DISMISS_MS,
    isActive: options.isActive,
    isScreenReaderEnabled,
  });

  useDismissOnViewChange(feedback.dismiss, options.selectedView);

  const openFeedbackFolder = useOpenSuccessFeedbackFolder({
    dismiss: feedback.dismiss,
    openFolder: options.openFolder,
    setSelectedView: options.setSelectedView,
  });

  return { feedback, openFeedbackFolder };
};
