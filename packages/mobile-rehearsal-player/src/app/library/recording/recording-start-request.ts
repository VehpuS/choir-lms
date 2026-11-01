import { omit } from 'es-toolkit';
import {
  createTransportTracker,
  type SyncTimers,
  type Transport,
} from '@org/audio-mixing';
import type {
  DriveAudioSource,
  PlayableItem,
  PlaybackShaping,
  RecordingOwner,
} from '@org/audio-library-models';

import { captureRecordingStart } from './recording-metadata';
import type { RecordingStartRequest } from './recording-session';

export type BuildStartRequestOptions = {
  item: PlayableItem;
  /** The track position when Record is pressed, in original-audio milliseconds. */
  positionMs: number;
  /** The owner's markers, as resolved for the playing item. */
  markers: readonly { name: string; positionMs: number }[];
  /** The speed and pitch in effect now; read once and fixed for the recording. */
  shaping: PlaybackShaping;
  /** Names of the owner's existing recordings, for the default name. */
  existingNames: readonly string[];
  id: string;
  createdAt: string;
  appliedLatencyMs?: number;
  /**
   * The track's transport. With it the timeline follows pauses, seeks and loop
   * wraps; without it the timeline is one plain stretch from `positionMs`.
   */
  transport?: Transport;
  /** Wall clock the transport is sampled against; `performance.now()` in the app. */
  nowMs?: () => number;
  timers?: SyncTimers;
};

/** The saved track under a playing adjusted copy: the copy's own audio with the source's identity. */
export const resolveParentSource = (
  playing: DriveAudioSource,
): DriveAudioSource => {
  const { adjustment } = playing;

  if (!adjustment) {
    return playing;
  }

  return {
    ...omit(playing, ['adjustment']),
    id: adjustment.sourceRef,
    name: adjustment.sourceName,
  };
};

/** Who owns a recording made on this item: its loop, its adjusted copy, or the track. */
export const getRecordingOwnerForItem = (
  item: PlayableItem,
): RecordingOwner => {
  if (item.kind === 'loop' && item.loopId) {
    return { kind: 'loop', id: item.loopId };
  }

  return item.source.adjustment
    ? { kind: 'adjusted', id: item.source.id }
    : { kind: 'track', id: item.source.id };
};

/**
 * What the session needs to start: the metadata draft for the item and a
 * timeline that follows the transport (rehearsal-recording design Decision 2).
 */
export const buildRecordingStartRequest = (
  options: BuildStartRequestOptions,
): RecordingStartRequest => {
  const { item, positionMs, shaping } = options;
  const loop =
    item.kind === 'loop' && item.loopId && item.range.endMs !== null
      ? {
          id: item.loopId,
          name: item.title,
          startMs: item.range.startMs,
          endMs: item.range.endMs,
        }
      : null;
  const appliedLatencyMs = options.appliedLatencyMs ?? 0;
  const draft = captureRecordingStart({
    id: options.id,
    createdAt: options.createdAt,
    playing: item.source,
    parent: resolveParentSource(item.source),
    loop,
    shaping,
    markers: options.markers,
    existingNames: options.existingNames,
    appliedLatencyMs,
  });

  if (options.transport && options.nowMs) {
    const tracker = createTransportTracker({
      transport: options.transport,
      rate: shaping.speedMultiplier,
      latencyMs: appliedLatencyMs,
      nowMs: options.nowMs,
      timers: options.timers,
    });

    return {
      draft,
      getTimeline: tracker.getTimeline,
      transport: options.transport,
      onCaptureStart: tracker.setOriginWallMs,
      dispose: tracker.dispose,
    };
  }

  return {
    draft,
    getTimeline: (elapsedMs) => [
      {
        recordingStartMs: 0,
        recordingEndMs: elapsedMs,
        trackStartMs: positionMs,
        held: false,
      },
    ],
  };
};
