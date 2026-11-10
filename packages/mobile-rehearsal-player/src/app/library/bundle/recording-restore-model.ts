import { omit } from 'es-toolkit';
import type {
  DriveAudioSource,
  LibraryBundleRecording,
  NamedLoop,
  Recording,
} from '@org/audio-library-models';

/**
 * Turns a recording from a bundle into a recording on this device. The bundle
 * names what it was sung against by bundle ids; here those become the ids the
 * import or replace gave the tracks and loops, so the recording appears where
 * it belongs. One that cannot be attached is left out rather than orphaned.
 */

export type RecordingRestoreContext = {
  /** Bundle id to library id, from the import or replace that just ran. */
  idMaps: {
    sources: Record<string, string>;
    loops: Record<string, string>;
    /** The ids the planner gave the recordings, so playlist entries line up. */
    recordings: Record<string, string>;
  };
  sources: readonly DriveAudioSource[];
  loops: readonly NamedLoop[];
  now: string;
};

export const toRestoredRecording = (
  bundleRecording: LibraryBundleRecording,
  id: string,
  context: RecordingRestoreContext,
): Recording | null => {
  if (bundleRecording.audio.kind !== 'drive') {
    return null;
  }

  const sourceById = new Map(context.sources.map((s) => [s.id, s]));
  const track = sourceById.get(
    context.idMaps.sources[bundleRecording.lineage.trackId] ?? '',
  );
  const adjusted = bundleRecording.lineage.adjustedId
    ? sourceById.get(
        context.idMaps.sources[bundleRecording.lineage.adjustedId] ?? '',
      )
    : undefined;
  const loop = bundleRecording.lineage.loopId
    ? context.loops.find(
        (candidate) =>
          candidate.id ===
          context.idMaps.loops[bundleRecording.lineage.loopId ?? ''],
      )
    : undefined;

  if (
    !track ||
    (bundleRecording.lineage.adjustedId && !adjusted?.adjustment) ||
    (bundleRecording.lineage.loopId && !loop)
  ) {
    return null;
  }

  const { audio } = bundleRecording;
  const rest = omit(bundleRecording, ['audio', 'lineage']);

  return {
    ...rest,
    id,
    lineage: {
      track: { id: track.id, driveFileId: track.driveFileId, name: track.name },
      ...(adjusted?.adjustment
        ? {
            adjusted: {
              id: adjusted.id,
              name: adjusted.name,
              transform: adjusted.adjustment.transform,
            },
          }
        : {}),
      ...(loop
        ? {
            loop: {
              id: loop.id,
              name: loop.name,
              startMs: loop.startMs,
              endMs: loop.endMs,
            },
          }
        : {}),
    },
    // The audio is already on Drive, so the export queue must not upload it again.
    exports: {
      done: [
        {
          kind: 'recording',
          driveFileId: audio.driveFileId,
          fileName: audio.fileName,
          folderId: '',
          folderName: '',
          exportedAt: context.now,
        },
      ],
      failed: [],
    },
  };
};
