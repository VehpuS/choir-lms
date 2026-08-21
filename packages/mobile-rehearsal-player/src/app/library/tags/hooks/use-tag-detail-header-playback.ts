import type { PlayableItem } from '@org/audio-library-models';
import { useCallback, useEffect, useRef } from 'react';

import type { PlaylistDetailHeaderPlaybackAction } from '../../playlists/utils/saved-playlist-playback-view-model';

const getTagPlayAccessibilityLabel = (tag: string) => {
  return `Play everything tagged "${tag}"`;
};

type UseTagDetailHeaderPlaybackOptions = {
  onDetailPlaybackChange?: (
    action: PlaylistDetailHeaderPlaybackAction | null,
  ) => void;
  onPlayMatches: (items: PlayableItem[]) => void;
  playableItems: PlayableItem[];
  tag: string;
};

export const useTagDetailHeaderPlayback = ({
  onDetailPlaybackChange,
  onPlayMatches,
  playableItems,
  tag,
}: UseTagDetailHeaderPlaybackOptions) => {
  const onPlayMatchesRef = useRef(onPlayMatches);
  onPlayMatchesRef.current = onPlayMatches;
  const playableItemsRef = useRef(playableItems);
  playableItemsRef.current = playableItems;
  const handlePress = useCallback(() => {
    onPlayMatchesRef.current(playableItemsRef.current);
  }, []);

  useEffect(() => {
    if (!onDetailPlaybackChange) {
      return;
    }

    onDetailPlaybackChange({
      accessibilityLabel: getTagPlayAccessibilityLabel(tag),
      disabled: playableItems.length === 0,
      onPress: handlePress,
    });

    return () => {
      onDetailPlaybackChange(null);
    };
  }, [handlePress, onDetailPlaybackChange, playableItems.length, tag]);
};
