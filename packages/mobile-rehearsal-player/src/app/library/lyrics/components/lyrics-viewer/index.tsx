import { useEffect, useState } from 'react';

import { CompositeLyricsPicker } from '../../../composite/content/composite-lyrics-picker';
import { getCompositeStore } from '../../../composite/store/composite-store-instance';
import { describeLyricsOwner } from '../../../composite/content/composite-lyrics-model';
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
  const { composite, lyrics, owner } = useLyricsFor({
    sourceId: view?.sourceId ?? '',
  });

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
  // A composite can switch the stem whose lyrics are read, as in the section.
  const picker = composite ? (
    <CompositeLyricsPicker
      info={composite}
      onSelect={(stemId) => {
        void getCompositeStore().setLyricsStem(composite.compositeId, stemId);
      }}
    />
  ) : null;

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
        ownerName={describeLyricsOwner(owner.name, composite?.stemName)}
        picker={picker}
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
      ownerName={describeLyricsOwner(owner.name, composite?.stemName)}
      picker={picker}
      text={lyrics.text}
    />
  );
};
