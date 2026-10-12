import type { PlayableItem } from '@org/audio-library-models';
import { createContext, useContext } from 'react';

type LoopPreviewPlaybackContextValue = {
  playbackPositionSeconds: number;
  seekActivePlaybackToPosition: (positionSeconds: number) => Promise<void>;
  /** Gives the playing preview a changed range without reloading the file. */
  syncActivePreviewRange: (previewItem: PlayableItem) => Promise<void>;
};

const defaultContextValue: LoopPreviewPlaybackContextValue = {
  playbackPositionSeconds: 0,
  seekActivePlaybackToPosition: async () => undefined,
  syncActivePreviewRange: async () => undefined,
};

export const LoopPreviewPlaybackContext =
  createContext<LoopPreviewPlaybackContextValue>(defaultContextValue);

export const useLoopPreviewPlaybackContext = () => {
  return useContext(LoopPreviewPlaybackContext);
};
