import type { DriveAudioSource, Recording } from '@org/audio-library-models';

import {
  uniqueSourcesByFile,
  type OfflineBatchResult,
  type OfflineBatchRunner,
} from '../offline/offline-batch';
import type { OfflineState } from '../offline/offline-state-store';

/**
 * Keeping the track of a recording offline (rehearsal-recording design
 * Decision 13). A recording owns no copy of its track and adds no cache: these
 * actions are the existing track actions, reached from a recording. Nothing
 * about the recordings themselves is asked, because recordings are always on
 * the device (Decision 4).
 */

export const KEEP_TRACK_OFFLINE_LABEL = 'Keep track offline';
export const REMOVE_TRACK_OFFLINE_LABEL = 'Remove track from offline';
export const DOWNLOADING_TRACK_LABEL = 'Downloading track…';
export const NEEDS_CONNECTION_LABEL = 'Needs connection for overlay';

export type RecordingOfflineContext = {
  /** Saved tracks in the library (not adjusted copies). */
  sources: readonly DriveAudioSource[];
  stateOf: (driveFileId: string) => OfflineState;
};

export type RecordingOfflineAction = {
  kind: 'keep' | 'remove' | 'downloading' | 'unavailable';
  label: string;
  /** Says the action covers the whole track and every recording of it. */
  note: string;
  disabled: boolean;
  /** The tracks the action applies to, once per Drive file. */
  sources: DriveAudioSource[];
};

/** The saved track a recording was made on, or `undefined` once it left the library. */
export const findRecordingTrack = (
  recording: Pick<Recording, 'lineage'>,
  sources: readonly DriveAudioSource[],
): DriveAudioSource | undefined => {
  const { id, driveFileId } = recording.lineage.track;

  return (
    sources.find((source) => source.id === id) ??
    sources.find(
      (source) => source.driveFileId === driveFileId && !source.adjustment,
    )
  );
};

/** The overlay needs a connection when the track is neither cached nor kept. */
export const recordingNeedsConnection = (
  recording: Pick<Recording, 'source'>,
  stateOf: RecordingOfflineContext['stateOf'],
): boolean => stateOf(recording.source.driveFileId) === 'none';

const describeScope = (trackCount: number, firstName: string) => {
  return trackCount === 1
    ? `Applies to the whole track “${firstName}” and all its recordings.`
    : `Applies to ${trackCount} whole tracks and all their recordings.`;
};

const action = (
  kind: RecordingOfflineAction['kind'],
  label: string,
  sources: DriveAudioSource[],
  disabled = false,
): RecordingOfflineAction => ({
  kind,
  label,
  disabled,
  sources,
  note: describeScope(sources.length, sources[0]?.name ?? ''),
});

/**
 * The one offline action for a recording or a selection: `Remove` when every
 * track is kept, `Keep` for the tracks that are not, a disabled
 * `Downloading…` while the missing ones are being fetched. Several recordings
 * of one track count that track once.
 */
export const resolveRecordingOfflineAction = (
  recordings: readonly Pick<Recording, 'lineage'>[],
  context: RecordingOfflineContext,
): RecordingOfflineAction => {
  const tracks = uniqueSourcesByFile(
    recordings.flatMap((recording) => {
      const track = findRecordingTrack(recording, context.sources);

      return track ? [track] : [];
    }),
  );

  if (tracks.length === 0) {
    return {
      kind: 'unavailable',
      label: KEEP_TRACK_OFFLINE_LABEL,
      disabled: true,
      sources: [],
      note: 'The track is no longer in your library.',
    };
  }

  const states = tracks.map((track) => context.stateOf(track.driveFileId));

  if (states.every((state) => state === 'kept')) {
    return action('remove', REMOVE_TRACK_OFFLINE_LABEL, tracks);
  }

  const toKeep = tracks.filter((_, index) => states[index] !== 'kept');

  if (
    toKeep.every(
      (track) => context.stateOf(track.driveFileId) === 'downloading',
    )
  ) {
    return action('downloading', DOWNLOADING_TRACK_LABEL, toKeep, true);
  }

  // A file with no Drive version cannot be cached, as for any track.
  const keepable = toKeep.filter((track) => track.modifiedTime !== undefined);

  return keepable.length === 0
    ? action('keep', KEEP_TRACK_OFFLINE_LABEL, toKeep, true)
    : action('keep', KEEP_TRACK_OFFLINE_LABEL, keepable);
};

/** Runs the action through the same batch runner the Library's bulk actions use. */
export const runRecordingOfflineAction = async (
  offlineAction: RecordingOfflineAction,
  runner: OfflineBatchRunner,
): Promise<OfflineBatchResult | null> => {
  if (offlineAction.disabled) {
    return null;
  }

  if (offlineAction.kind === 'remove') {
    await runner.removeSources(offlineAction.sources);

    return null;
  }

  return offlineAction.kind === 'keep'
    ? runner.keepSources(offlineAction.sources)
    : null;
};
