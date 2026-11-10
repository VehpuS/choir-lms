import { NO_ROOM_TO_PREPARE_MESSAGE } from '../../composite/loading/load-composite-engine';
import { requestClearOfflineFiles } from '../../offline/clear-offline-files-request';
import { DriveSessionBanner } from '../../drive/components/drive-session-banner';
import { getDriveSessionBannerCopy } from '../../drive/utils/drive-access-copy';
import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import {
  shouldShowPlaybackStatusCard,
  shouldShowSavedLibraryStatusCard,
} from './status-card-visibility';
import type { SavedRehearsalLibrarySectionProps } from './types';

type SavedRehearsalLibraryStatusCardsProps = {
  authorization?: SavedRehearsalLibrarySectionProps['authorization'];
  isPlaybackIssueShownOnRow: boolean;
  isSavedLibraryLoading: boolean;
  isSearchPanelVisible: boolean;
  savedSourceCount: number;
  savedLibraryStatusCopy: SavedRehearsalLibrarySectionProps['savedLibraryStatusCopy'];
  savedTrackPlaybackStatusCopy: SavedRehearsalLibrarySectionProps['savedTrackPlaybackStatusCopy'];
};

export const SavedRehearsalLibraryStatusCards = ({
  authorization,
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

  // A disconnected session is one fault, so it gets one line (issue #40)
  // instead of the paragraph card, and only while saved tracks are affected.
  const sessionBannerCopy =
    authorization && savedSourceCount > 0
      ? getDriveSessionBannerCopy(authorization.authState.status)
      : null;

  return (
    <>
      {sessionBannerCopy && authorization && !isSearchPanelVisible ? (
        <DriveSessionBanner
          copy={sessionBannerCopy}
          isBusy={authorization.isBusy}
          onPressAction={
            authorization.canStartAuthorization
              ? () => {
                  void authorization.startAuthorization();
                }
              : undefined
          }
        />
      ) : shouldShowSavedLibraryStatus ? (
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
