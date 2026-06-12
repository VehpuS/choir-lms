import { createContext, useContext } from 'react';

type LoopPreviewPlaybackContextValue = {
  playbackPositionSeconds: number;
  seekActivePlaybackToPosition: (positionSeconds: number) => Promise<void>;
};

const defaultContextValue: LoopPreviewPlaybackContextValue = {
  playbackPositionSeconds: 0,
  seekActivePlaybackToPosition: async () => undefined,
};

export const LoopPreviewPlaybackContext =
  createContext<LoopPreviewPlaybackContextValue>(defaultContextValue);

export const useLoopPreviewPlaybackContext = () => {
  return useContext(LoopPreviewPlaybackContext);
};
