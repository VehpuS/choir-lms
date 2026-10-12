import { useEffect, useState } from 'react';

import { requestSavedItemAction } from '../../../components/saved-item-menu/saved-item-requests';
import { useLyricsFor } from '../../../components/saved-item-menu/saved-item-availability-context';
import {
  subscribeToLyricsViewRequests,
  type LyricsViewRequest,
} from '../../lyrics-view-request';
import { LyricsPeekSheet } from './lyrics-peek-sheet';
import { LyricsReadingMode } from './lyrics-reading-mode';

type LyricsViewerHostProps = {
  isPlaybackToggleDisabled: boolean;
  isPlaying: boolean;
  onTogglePlayback: () => void;
};

/**
 * Owns the lyrics peek and reading mode, opened over the lyrics view request
 * channel by the playback screen's Lyrics section and the mini-player.
 */
export const LyricsViewerHost = ({
  isPlaybackToggleDisabled,
  isPlaying,
  onTogglePlayback,
}: LyricsViewerHostProps) => {
  const [view, setView] = useState<LyricsViewRequest | null>(null);
  const { lyrics, owner } = useLyricsFor({ sourceId: view?.sourceId ?? '' });

  useEffect(() => {
    return subscribeToLyricsViewRequests(setView);
  }, []);

  // The lyrics were deleted or the owning track removed while a view was open.
  if (!view || !lyrics || !owner) {
    return null;
  }

  const close = () => {
    setView(null);
  };

  if (view.mode === 'peek') {
    return (
      <LyricsPeekSheet
        onClose={close}
        onEdit={() => {
          close();
          requestSavedItemAction({
            action: 'edit-lyrics',
            id: view.sourceId,
            kind: 'track',
          });
        }}
        onExpand={() => {
          setView({ ...view, mode: 'reading' });
        }}
        ownerName={owner.name}
        text={lyrics.text}
      />
    );
  }

  return (
    <LyricsReadingMode
      isPlaybackToggleDisabled={isPlaybackToggleDisabled}
      isPlaying={isPlaying}
      onClose={close}
      onTogglePlayback={onTogglePlayback}
      ownerName={owner.name}
      text={lyrics.text}
    />
  );
};
