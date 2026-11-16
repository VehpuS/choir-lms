import {
  isCompositeSource,
  type PlayableItem,
} from '@org/audio-library-models';

import {
  loadCompositeItemIntoPlayer,
  type CompositeLoadPlayer,
} from '../../composite/playback/load-composite-item';
import { isSavedTrackDownloadAbortError } from '../utils/saved-track-blob-download';
import type { ListeningTrackLoads } from './listening-track-loads';

/**
 * The rule (clear-playback-while-listening design Decision 1): while a
 * microphone is open a track plays through the Web Audio engine, because a
 * playing media element is what thins Bluetooth output then. A composite has
 * its own engine load. Recording still follows the media element's clock
 * (until stage 2 gives it the engine's), so with the Recording tool open, and
 * for a recording item, the track stays on the media element. So does every
 * track while the app is hidden: the engine does not play in the background,
 * the media element does (design Decisions 4 and 5).
 */
export type ListeningRuleState = {
  isMicrophoneOpen: boolean;
  isRecordingToolOpen: boolean;
  isAppHidden: boolean;
};

export const shouldPlayOnListeningEngine = (
  item: Pick<PlayableItem, 'source' | 'recordingId'>,
  state: ListeningRuleState,
): boolean =>
  state.isMicrophoneOpen &&
  !state.isRecordingToolOpen &&
  !state.isAppHidden &&
  !isCompositeSource(item.source) &&
  item.recordingId === undefined;

export type LoadListeningItemOptions = {
  item: PlayableItem;
  accessToken: string | null;
  isMicrophoneOpen: boolean;
  isRecordingToolOpen: boolean;
  isAppHidden: boolean;
  player: CompositeLoadPlayer;
  loads: ListeningTrackLoads;
  volume: number;
  initialPositionSeconds: number;
  shouldPlay: boolean;
  applyShaping: () => Promise<void>;
  /** Told why the track could not go on the engine; it then plays on the media element. */
  onFallback?: (error: unknown) => void;
};

/**
 * Loads the item onto the engine when the rule says so. Resolves `true` when
 * the engine is now the player, `false` when the caller should load the media
 * element as usual: the rule does not apply, or the engine could not be built
 * (the track must still play). A superseded load rejects with the abort error.
 */
export const loadItemOnListeningEngine = async (
  options: LoadListeningItemOptions,
): Promise<boolean> => {
  const { item } = options;

  if (!shouldPlayOnListeningEngine(item, options)) {
    return false;
  }

  try {
    await loadCompositeItemIntoPlayer({
      item,
      kind: 'track',
      player: options.player,
      loadEngine: () =>
        options.loads.load(item.source, { accessToken: options.accessToken }),
      volume: options.volume,
      initialPositionSeconds: options.initialPositionSeconds,
      shouldPlay: options.shouldPlay,
      applyShaping: options.applyShaping,
    });

    return true;
  } catch (error) {
    if (isSavedTrackDownloadAbortError(error)) {
      throw error;
    }

    options.onFallback?.(error);

    return false;
  }
};
