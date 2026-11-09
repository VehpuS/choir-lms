import type { LibraryBundle } from '@org/audio-library-models';
import {
  buildLibraryBundle,
  type BuildLibraryBundleResult,
  type LibraryBundleSelectionScope,
} from '@org/audio-library-runtime';
import {
  createBundleFileName,
  formatBundleStamp,
  type DriveFolderRef,
  type LibraryBundleFileKind,
} from '@org/google-drive';

import { countBundleContents } from './read-bundle';
import {
  describeBundleFailure,
  type BundleCancelled,
  type BundleFailure,
  type BundleProgress,
  type BundleServiceDependencies,
} from './bundle-service-types';

const ANONYMOUS_AUTHOR = { name: 'A Choir LMS user' };

export type WrittenBundle = {
  status: 'ok';
  fileId: string;
  fileName: string;
  bundle: LibraryBundle;
  built: BuildLibraryBundleResult;
};

const UNREADABLE_AUDIO_FAILURE = {
  status: 'failed',
  reason: 'unavailable',
  message: 'A recording’s audio could not be read, so nothing was saved.',
} as const satisfies BundleFailure;

/** Drive owners of the files, best effort; a source without one falls back to the author. */
const lookupOwners = async (
  deps: BundleServiceDependencies,
  driveFileIds: readonly string[],
  signal?: AbortSignal,
) => {
  const owners = await deps.drive.owners(driveFileIds, signal);

  return Object.fromEntries(owners);
};

/**
 * Builds a bundle and writes it to Drive: first the audio of any selected
 * recording that has no Drive copy (then referenced by id), then the manifest
 * last, so a manifest never names audio that is not there. Used by backup,
 * the pre-restore backup and share.
 */
export const buildAndWriteBundle = async (
  deps: BundleServiceDependencies,
  options: {
    scope: LibraryBundleSelectionScope;
    includeOutsideReferences?: boolean;
    selectedRecordingIds: ReadonlySet<string>;
    folder: DriveFolderRef;
    kind: LibraryBundleFileKind;
    label?: string;
    signal?: AbortSignal;
    onProgress?: BundleProgress;
  },
): Promise<WrittenBundle | BundleFailure | BundleCancelled> => {
  const now = deps.now?.() ?? new Date();

  options.onProgress?.('reading');

  const input = await deps.library.load();
  const recordings = await deps.library.recordings();
  const ownersByDriveFileId = await lookupOwners(
    deps,
    input.sources.map((source) => source.driveFileId),
    options.signal,
  );
  const built = buildLibraryBundle({
    input,
    scope: options.scope,
    author: (await deps.drive.currentUser(options.signal)) ?? ANONYMOUS_AUTHOR,
    createdAt: now.toISOString(),
    ownersByDriveFileId,
    includeOutsideReferences: options.includeOutsideReferences,
    recordings,
    selectedRecordingIds: options.selectedRecordingIds,
  });
  const audioByBundleId = new Map<
    string,
    { driveFileId: string; fileName: string }
  >();

  if (built.recordingsToUpload.length > 0) {
    options.onProgress?.('recordings');
  }

  for (const pending of built.recordingsToUpload) {
    const bytes = await deps.library.readRecordingAudio(pending.recordingId);

    if (!bytes) {
      return UNREADABLE_AUDIO_FAILURE;
    }

    const uploaded = await deps.drive.uploadAudio({
      bytes,
      folderId: options.folder.id,
      name: `choir-lms-recording-${formatBundleStamp(now)}-${pending.id}.wav`,
      signal: options.signal,
    });

    if (uploaded.status === 'aborted') {
      return { status: 'cancelled' };
    }

    if (uploaded.status === 'failed') {
      return describeBundleFailure(uploaded.reason);
    }

    audioByBundleId.set(pending.id, {
      driveFileId: uploaded.file.id,
      fileName: uploaded.file.name,
    });
  }

  const bundle: LibraryBundle = built.bundle.recordings
    ? {
        ...built.bundle,
        recordings: built.bundle.recordings.map((recording) => {
          const audio = audioByBundleId.get(recording.id);

          return audio
            ? { ...recording, audio: { kind: 'drive' as const, ...audio } }
            : recording;
        }),
      }
    : built.bundle;
  const fileName = createBundleFileName({
    kind: options.kind,
    date: now,
    label: options.label,
  });

  options.onProgress?.('uploading');

  const contents = countBundleContents(bundle);
  const uploaded = await deps.drive.uploadBundle({
    counts: {
      tracks: contents.tracks,
      loops: contents.loops,
      playlists: contents.playlists,
    },
    folderId: options.folder.id,
    json: JSON.stringify(bundle),
    name: fileName,
    signal: options.signal,
  });

  if (uploaded.status === 'aborted') {
    return { status: 'cancelled' };
  }

  return uploaded.status === 'failed'
    ? describeBundleFailure(uploaded.reason)
    : {
        status: 'ok',
        fileId: uploaded.file.id,
        fileName: uploaded.file.name,
        bundle,
        built,
      };
};
