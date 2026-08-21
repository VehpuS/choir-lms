import { useCallback, useEffect, useRef } from 'react';

import type { PlaylistDetailHeaderPlaybackAction } from '../utils/saved-playlist-playback-view-model';

type UsePlaylistDetailHeaderPlaybackOptions = {
  isDetailVisible: boolean;
  isMutating: boolean;
  onDetailPlaybackChange?: (
    action: PlaylistDetailHeaderPlaybackAction | null,
  ) => void;
  orderedPlaybackActionDisabled: boolean;
  orderedPlaybackActionLabel: string;
  playOrderedPlaylist: () => void;
  playlistTitle: string | undefined;
};

export const usePlaylistDetailHeaderPlayback = ({
  isDetailVisible,
  isMutating,
  onDetailPlaybackChange,
  orderedPlaybackActionDisabled,
  orderedPlaybackActionLabel,
  playOrderedPlaylist,
  playlistTitle,
}: UsePlaylistDetailHeaderPlaybackOptions) => {
  const playOrderedPlaylistRef = useRef(playOrderedPlaylist);
  playOrderedPlaylistRef.current = playOrderedPlaylist;
  const handlePress = useCallback(() => {
    playOrderedPlaylistRef.current();
  }, []);

  useEffect(() => {
    if (!onDetailPlaybackChange) {
      return;
    }

    if (!isDetailVisible || !playlistTitle) {
      onDetailPlaybackChange(null);
      return;
    }

    onDetailPlaybackChange({
      accessibilityLabel: orderedPlaybackActionDisabled
        ? orderedPlaybackActionLabel
        : `Play ${playlistTitle}`,
      disabled: isMutating || orderedPlaybackActionDisabled,
      onPress: handlePress,
    });
  }, [
    handlePress,
    isDetailVisible,
    isMutating,
    onDetailPlaybackChange,
    orderedPlaybackActionDisabled,
    orderedPlaybackActionLabel,
    playlistTitle,
  ]);
};
