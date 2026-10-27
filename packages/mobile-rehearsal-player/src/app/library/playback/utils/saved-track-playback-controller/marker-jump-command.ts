import type { PlayableItem } from '@org/audio-library-models';

import { getPlaybackShapingSession } from '../../shaping';
import { isLoopPreviewItem } from '../loop-preview-item';
import { createSavedTrackPlaybackRuntimeIssue } from '../saved-track-playback-view-model';
import { isSavedTrackDownloadAbortError } from '../saved-track-web-download';
import { planMarkerJump } from './marker-jump-plan';
import type { SavedTrackPlaybackRuntimeCommands } from './runtime-commands';
import type { SavedTrackPlaybackControllerOptions } from './shared';

export type MarkerJumpOutcome =
  | 'seeked'
  | 'started'
  | 'past-end'
  /** An auth or availability issue stopped it, or the load was superseded. */
  | 'blocked';

type MarkerJumpRuntime = Pick<
  SavedTrackPlaybackRuntimeCommands,
  | 'canLoadPlayableItem'
  | 'loadPlayableItemIntoPlayer'
  | 'seekActivePlayableItemTo'
>;

type MarkerJumpDependencies = {
  /** Ambient shaping from an earlier item must not carry into a new start. */
  startNewPlayback?: () => void;
};

const startNewShapingPlayback = () => {
  getPlaybackShapingSession().startNewPlayback();
};

export const createSavedTrackMarkerJumpCommand = (
  options: SavedTrackPlaybackControllerOptions,
  runtime: MarkerJumpRuntime,
  { startNewPlayback = startNewShapingPlayback }: MarkerJumpDependencies = {},
) => {
  const seekWithinActiveItem = async (
    active: PlayableItem,
    positionSeconds: number,
  ): Promise<MarkerJumpOutcome> => {
    try {
      // A seek leaves the player's play state alone.
      await runtime.seekActivePlayableItemTo(active, positionSeconds);
      return 'seeked';
    } catch (error) {
      options.setIssue(createSavedTrackPlaybackRuntimeIssue(active, error));
      return 'blocked';
    }
  };

  const startFromPosition = async (
    target: PlayableItem,
    positionSeconds: number,
  ): Promise<MarkerJumpOutcome> => {
    if (!runtime.canLoadPlayableItem(target)) {
      return 'blocked';
    }

    const accessToken = options.authState.accessToken ?? null;

    // Like standalone playback, leave any queue as soon as loading starts.
    options.setActivePlaylistSession(null);

    if (!isLoopPreviewItem(target)) {
      startNewPlayback();
    }

    options.setIsPreparing(true);

    try {
      await runtime.loadPlayableItemIntoPlayer(target, accessToken, {
        initialPositionSeconds: positionSeconds,
        shouldPlay: true,
      });
      return 'started';
    } catch (error) {
      if (isSavedTrackDownloadAbortError(error)) {
        return 'blocked';
      }

      options.setIssue(createSavedTrackPlaybackRuntimeIssue(target, error));
      return 'blocked';
    } finally {
      options.setIsPreparing(false);
    }
  };

  /**
   * Jumps to a marker. `target` is the item the markers list was opened from.
   */
  return async (
    target: PlayableItem,
    positionMs: number,
  ): Promise<MarkerJumpOutcome> => {
    const active = options.activePlayableItemRef.current;
    const plan = planMarkerJump({ active, positionMs, target });

    options.setIssue(null);

    if (plan.kind === 'refused') {
      return 'past-end';
    }

    if (plan.kind === 'seek' && active) {
      return seekWithinActiveItem(active, plan.positionSeconds);
    }

    return startFromPosition(target, plan.positionSeconds);
  };
};
