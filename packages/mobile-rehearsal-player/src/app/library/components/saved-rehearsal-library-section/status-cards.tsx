import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import {
  shouldShowPlaybackStatusCard,
  shouldShowSavedLibraryStatusCard,
} from './status-card-visibility';
import type { SavedRehearsalLibrarySectionProps } from './types';

type SavedRehearsalLibraryStatusCardsProps = {
  isSavedLibraryLoading: boolean;
  isSearchPanelVisible: boolean;
  savedSourceCount: number;
  savedLibraryStatusCopy: SavedRehearsalLibrarySectionProps['savedLibraryStatusCopy'];
  savedTrackPlaybackStatusCopy: SavedRehearsalLibrarySectionProps['savedTrackPlaybackStatusCopy'];
};

export const SavedRehearsalLibraryStatusCards = ({
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
          isLoading={false}
          statusCopy={savedTrackPlaybackStatusCopy}
        />
      ) : null}
    </>
  );
};
