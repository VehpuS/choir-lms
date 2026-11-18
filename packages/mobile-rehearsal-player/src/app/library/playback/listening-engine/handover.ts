import type { PlayableItem } from '@org/audio-library-models';

import type { CompositeEngine } from '../../composite/engine/composite-engine';
import type { ActiveEngineKind } from '../../composite/playback/active-composite';
import { isSavedTrackDownloadAbortError } from '../utils/saved-track-blob-download';

/**
 * Moves the track that is playing between the media element and the Web Audio
 * engine when the rule changes under it (clear-playback-while-listening design
 * Decision 4): a microphone opens or closes, or the Recording tool does. The
 * track continues from where it is, in the same playing or paused state.
 *
 * To the engine: the engine is built first, while the media element goes on
 * playing, and only then does the switch happen, so preparing a track costs no
 * silence. To the media element: the element loads at the engine's position.
 * One switch runs at a time, and each looks at the state as it is when its turn
 * comes, so quick changes settle on the last one.
 */

export type HandoverSnapshot = {
  isPlaying: boolean;
  positionSeconds: number;
};

export type ListeningHandoverDependencies = {
  getItem: () => PlayableItem | null;
  /** What the engine plays now; null when the media element is the player. */
  getEngineKind: () => ActiveEngineKind | null;
  /** The rule, for this item, as things are now. */
  wantsEngine: (item: PlayableItem) => boolean;
  /** A load owns the player: it applies the rule itself, and its numbers are not the track's. */
  isLoadInFlight: () => boolean;
  readSnapshot: () => Promise<HandoverSnapshot | null>;
  prepareEngine: (item: PlayableItem) => Promise<CompositeEngine>;
  playOnEngine: (
    item: PlayableItem,
    engine: CompositeEngine,
    snapshot: HandoverSnapshot,
  ) => Promise<void>;
  playOnElement: (
    item: PlayableItem,
    snapshot: HandoverSnapshot,
  ) => Promise<void>;
  /** The engine could not be built: the track goes on playing on the media element. */
  onStayedOnElement: (item: PlayableItem, error: unknown) => void;
  /** A switch that started and could not be finished. */
  onFailure: (item: PlayableItem, error: unknown) => void;
};

export type ListeningHandover = {
  /** Brings the player in line with the rule. Resolves when this and earlier syncs are done. */
  sync: () => Promise<void>;
  /** Resolves when no switch is running. */
  whenSettled: () => Promise<void>;
};

export const createListeningHandover = (
  dependencies: ListeningHandoverDependencies,
): ListeningHandover => {
  let queue: Promise<void> = Promise.resolve();

  const isStillCurrent = (item: PlayableItem) =>
    dependencies.getItem()?.id === item.id && !dependencies.isLoadInFlight();

  const toEngine = async (item: PlayableItem) => {
    let engine: CompositeEngine;

    try {
      engine = await dependencies.prepareEngine(item);
    } catch (error) {
      // Superseded by a newer load, which applies the rule itself.
      if (!isSavedTrackDownloadAbortError(error)) {
        dependencies.onStayedOnElement(item, error);
      }

      return;
    }

    // Preparing can take seconds: only switch if nothing changed meanwhile.
    if (
      !isStillCurrent(item) ||
      !dependencies.wantsEngine(item) ||
      dependencies.getEngineKind() !== null
    ) {
      engine.dispose();

      return;
    }

    const snapshot = await dependencies.readSnapshot();

    if (!snapshot) {
      engine.dispose();

      return;
    }

    await dependencies.playOnEngine(item, engine, snapshot);
  };

  const toElement = async (item: PlayableItem) => {
    const snapshot = await dependencies.readSnapshot();

    if (snapshot) {
      await dependencies.playOnElement(item, snapshot);
    }
  };

  const run = async () => {
    const item = dependencies.getItem();

    if (!item || dependencies.isLoadInFlight()) {
      return;
    }

    const kind = dependencies.getEngineKind();
    const wantsEngine = dependencies.wantsEngine(item);

    try {
      if (wantsEngine && kind === null) {
        await toEngine(item);
      } else if (!wantsEngine && kind === 'track') {
        await toElement(item);
      }
    } catch (error) {
      // Superseded by a newer load, which applies the rule itself.
      if (!isSavedTrackDownloadAbortError(error)) {
        dependencies.onFailure(item, error);
      }
    }
  };

  return {
    sync: () => {
      queue = queue.then(run);

      return queue;
    },
    whenSettled: () => queue,
  };
};

let appHandover: ListeningHandover | null = null;

/** The app's hand-over, registered by the playback controller. */
export const setAppListeningHandover = (handover: ListeningHandover | null) => {
  appHandover = handover;
};

/** Resolves once no switch between players is running (at once without a controller). */
export const whenListeningHandoverSettled = (): Promise<void> =>
  appHandover?.whenSettled() ?? Promise.resolve();
