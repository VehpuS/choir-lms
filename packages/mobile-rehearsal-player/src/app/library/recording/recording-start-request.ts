import { omit } from 'es-toolkit';
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
 * timeline. The timeline here is one plain stretch from where Record was
 * pressed; seeks, pauses and loop wraps are added when the transport is
 * tracked (task 5.3).
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
  const draft = captureRecordingStart({
    id: options.id,
    createdAt: options.createdAt,
    playing: item.source,
    parent: resolveParentSource(item.source),
    loop,
    shaping,
    markers: options.markers,
    existingNames: options.existingNames,
    appliedLatencyMs: options.appliedLatencyMs ?? 0,
  });

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
