import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import type { SavedRehearsalLibrarySectionProps } from './types';

type SavedRehearsalLibraryStatusCardsProps = {
  isSavedLibraryLoading: boolean;
  isSavedTrackPlaybackLoading: boolean;
  shouldShowPlaybackStatus: boolean;
  shouldShowSavedLibraryStatus: boolean;
  savedLibraryStatusCopy: SavedRehearsalLibrarySectionProps['savedLibraryStatusCopy'];
  savedTrackPlaybackStatusCopy: SavedRehearsalLibrarySectionProps['savedTrackPlaybackStatusCopy'];
};

export const SavedRehearsalLibraryStatusCards = ({
  isSavedLibraryLoading,
  isSavedTrackPlaybackLoading,
  savedLibraryStatusCopy,
  savedTrackPlaybackStatusCopy,
  shouldShowPlaybackStatus,
  shouldShowSavedLibraryStatus,
}: SavedRehearsalLibraryStatusCardsProps) => {
  return (
    <>
      {shouldShowSavedLibraryStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedLibraryLoading}
          loadingLabel="Refreshing saved rehearsal tracks…"
          statusCopy={savedLibraryStatusCopy}
        />
      ) : null}
      {savedTrackPlaybackStatusCopy && shouldShowPlaybackStatus ? (
        <DriveLibraryStatusCard
          isLoading={isSavedTrackPlaybackLoading}
          loadingLabel="Starting track playback…"
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
    </>
  );
};
