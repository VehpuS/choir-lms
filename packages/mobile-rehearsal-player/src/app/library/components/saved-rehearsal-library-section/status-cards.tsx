import { NO_ROOM_TO_PREPARE_MESSAGE } from '../../composite/loading/load-composite-engine';
import { requestClearOfflineFiles } from '../../offline/clear-offline-files-request';
import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import {
  shouldShowPlaybackStatusCard,
  shouldShowSavedLibraryStatusCard,
} from './status-card-visibility';
import type { SavedRehearsalLibrarySectionProps } from './types';

type SavedRehearsalLibraryStatusCardsProps = {
  isPlaybackIssueShownOnRow: boolean;
  isSavedLibraryLoading: boolean;
  isSearchPanelVisible: boolean;
  savedSourceCount: number;
  savedLibraryStatusCopy: SavedRehearsalLibrarySectionProps['savedLibraryStatusCopy'];
  savedTrackPlaybackStatusCopy: SavedRehearsalLibrarySectionProps['savedTrackPlaybackStatusCopy'];
};

export const SavedRehearsalLibraryStatusCards = ({
  isPlaybackIssueShownOnRow,
  isSavedLibraryLoading,
  isSearchPanelVisible,
  savedSourceCount,
  savedLibraryStatusCopy,
  savedTrackPlaybackStatusCopy,
}: SavedRehearsalLibraryStatusCardsProps) => {
  const shouldShowSavedLibraryStatus = shouldShowSavedLibraryStatusCard({
    isLoading: isSavedLibraryLoading,
    isSearchPanelVisible,
    savedSourceCount,
    statusTone: savedLibraryStatusCopy.tone,
  });
  const shouldShowPlaybackStatus = shouldShowPlaybackStatusCard({
    isIssueShownOnRow: isPlaybackIssueShownOnRow,
    isSearchPanelVisible,
    statusTone: savedTrackPlaybackStatusCopy?.tone ?? null,
  });

  return (
    <>
      {shouldShowSavedLibraryStatus ? (
        <DriveLibraryStatusCard
          isLoading={false}
          statusCopy={savedLibraryStatusCopy}
        />
      ) : null}
      {savedTrackPlaybackStatusCopy && shouldShowPlaybackStatus ? (
        <DriveLibraryStatusCard
          action={
            // A play that ran out of room offers the same `Clear all` the
            // create sheet does; the user presses play again afterwards
            // (composite-tracks 12.24).
            savedTrackPlaybackStatusCopy.message === NO_ROOM_TO_PREPARE_MESSAGE
              ? {
                  label: 'Clear offline files…',
                  onPress: () => requestClearOfflineFiles(),
                }
              : undefined
          }
          isLoading={false}
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
    </>
  );
};
