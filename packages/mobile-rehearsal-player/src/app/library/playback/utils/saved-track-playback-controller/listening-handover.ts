import type { PlayableItem } from '@org/audio-library-models';

import { getActiveEngineKind } from '../../../composite/playback/active-composite';
import { loadCompositeItemIntoPlayer } from '../../../composite/playback/load-composite-item';
import {
  createListeningHandover,
  type HandoverSnapshot,
  type ListeningHandover,
} from '../../listening-engine/handover';
import { getListeningFallbackStore } from '../../listening-engine/listening-fallback-state';
import { getListeningRuleState } from '../../listening-engine/listening-rule-state';
import { getListeningTrackLoads } from '../../listening-engine/listening-track-loads';
import { shouldPlayOnListeningEngine } from '../../listening-engine/load-listening-item';
import { getTrackGain } from '../../track-gain';
import type { LoadPlayableItemIntoPlayer } from '../saved-track-duration-resolution';
import { getSavedTrackPlayer } from '../saved-track-player-interop';
import { createSavedTrackPlaybackRuntimeIssue } from '../saved-track-playback-view-model';
import type { SavedTrackProgress } from '../saved-track-progress-gate';
import type { SavedTrackPlaybackControllerOptions } from './shared';

/**
 * The hand-over between the media element and the Web Audio engine, wired to
 * the playback controller's own pieces (clear-playback-while-listening design
 * Decision 4). The decisions are in `listening-engine/handover.ts`; this file
 * only says how this controller reads the player and loads each side.
 */
export const createControllerListeningHandover = (core: {
  options: SavedTrackPlaybackControllerOptions;
  applyAmbientShaping: (transform?: PlayableItem['transform']) => Promise<void>;
  isLoadInFlight: () => boolean;
  loadPlayableItemIntoPlayer: LoadPlayableItemIntoPlayer;
  readLivePlaybackSnapshot: () => Promise<HandoverSnapshot | null>;
  runAsLoad: <Result>(
    task: () => Promise<Result>,
    heldProgress?: SavedTrackProgress,
  ) => Promise<Result>;
}): ListeningHandover => {
  const { options } = core;
  const accessToken = () => options.authState.accessToken ?? null;
  const fallbacks = getListeningFallbackStore();
  // Across a switch the same track is still where it was, so its position and
  // length stay on screen instead of the empty progress of a load.
  const heldProgressAt = (positionSeconds: number): SavedTrackProgress => ({
    buffered: options.progressDurationSeconds,
    duration: options.progressDurationSeconds,
    position: positionSeconds,
  });

  return createListeningHandover({
    getItem: () => options.activePlayableItemRef.current,
    getEngineKind: getActiveEngineKind,
    wantsEngine: (item) => {
      const byRule = shouldPlayOnListeningEngine(item, getListeningRuleState());

      // Without a microphone nothing is thin: a track that could not be
      // prepared is tried again the next time one opens.
      if (!byRule) {
        fallbacks.clear();
      }

      return byRule && !fallbacks.has(item.source.id);
    },
    isLoadInFlight: core.isLoadInFlight,
    readSnapshot: core.readLivePlaybackSnapshot,
    prepareEngine: (item) =>
      getListeningTrackLoads().load(item.source, {
        accessToken: accessToken(),
      }),
    playOnEngine: (item, engine, snapshot) =>
      core.runAsLoad(async () => {
        await loadCompositeItemIntoPlayer({
          item,
          kind: 'track',
          player: getSavedTrackPlayer(),
          loadEngine: async () => engine,
          volume: options.volumeLevelRef.current * getTrackGain(),
          initialPositionSeconds: snapshot.positionSeconds,
          shouldPlay: snapshot.isPlaying,
          applyShaping: () => core.applyAmbientShaping(item.transform),
        });
      }, heldProgressAt(snapshot.positionSeconds)),
    playOnElement: async (item, snapshot) => {
      await core.loadPlayableItemIntoPlayer(item, accessToken(), {
        initialPositionSeconds: snapshot.positionSeconds,
        shouldPlay: snapshot.isPlaying,
        syncActivePlayableItem: false,
        heldProgress: heldProgressAt(snapshot.positionSeconds),
      });
    },
    onStayedOnElement: (item, error) => fallbacks.report(item.source.id, error),
    onFailure: (item, error) =>
      options.setIssue(createSavedTrackPlaybackRuntimeIssue(item, error)),
  });
};
