import type { PlayableItem } from '@org/audio-library-models';

import { createSavedTrackPlaybackQueueCommands } from './queue-commands';
import {
  createSavedTrackPlaybackRuntimeCommands,
  type SavedTrackPlaybackRuntimeCommands,
} from './runtime-commands';
import type { SavedTrackPlaybackControllerOptions } from './shared';

export type SavedTrackPlaybackController = SavedTrackPlaybackRuntimeCommands & {
  advancePlaylistPlayback: () => Promise<void>;
  playNextQueueItem: () => Promise<void>;
  playPreviousQueueItem: () => Promise<void>;
  loadPlayableItem: (playableItem: PlayableItem) => Promise<boolean>;
};

export const createSavedTrackPlaybackController = (
  options: SavedTrackPlaybackControllerOptions,
): SavedTrackPlaybackController => {
  const runtimeCommands = createSavedTrackPlaybackRuntimeCommands(options);
  const queueCommands = createSavedTrackPlaybackQueueCommands(
    options,
    runtimeCommands,
  );

  return {
    ...runtimeCommands,
    ...queueCommands,
  };
};
