import type { PlayableItem } from '@org/audio-library-models';

import {
  createSavedTrackMarkerJumpCommand,
  type MarkerJumpOutcome,
} from './marker-jump-command';
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
  jumpToMarker: (
    target: PlayableItem,
    positionMs: number,
  ) => Promise<MarkerJumpOutcome>;
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
    jumpToMarker: createSavedTrackMarkerJumpCommand(options, runtimeCommands),
  };
};
