import type { Recording, LibraryBundleAuthor } from '@org/audio-library-models';
import type {
  LibraryBundleImportRepository,
  LibraryBundleInput,
  ReplacementLibraryState,
} from '@org/audio-library-runtime';
import type {
  DriveAccessProbeResult,
  DriveFileOwner,
  DriveUploadFailureReason,
  EnsureLibraryBundleFoldersResult,
  ListLibraryBundlesResult,
  PruneBackupsResult,
  ReadLibraryBundleResult,
  UploadLibraryBundleResult,
} from '@org/google-drive';

/**
 * The seams the bundle flows run through, so the logic can be proven with a
 * fake Drive and a fake library and the screens stay thin.
 */

export type BundleDriveApi = {
  ensureFolders(
    signal?: AbortSignal,
  ): Promise<EnsureLibraryBundleFoldersResult>;
  uploadBundle(options: {
    counts?: { tracks: number; loops: number; playlists: number };
    folderId: string;
    json: string;
    name: string;
    signal?: AbortSignal;
  }): Promise<UploadLibraryBundleResult>;
  /** Raw bytes, for the audio of a recording that has no Drive copy yet. */
  uploadAudio(options: {
    bytes: Uint8Array;
    folderId: string;
    name: string;
    signal?: AbortSignal;
  }): Promise<
    | { status: 'uploaded'; file: { id: string; name: string } }
    | { status: 'aborted' }
    | { status: 'failed'; reason: DriveUploadFailureReason }
  >;
  /** Who is signed in, for the bundle's author; null when Drive will not say. */
  currentUser(signal?: AbortSignal): Promise<LibraryBundleAuthor | null>;
  list(signal?: AbortSignal): Promise<ListLibraryBundlesResult>;
  read(fileId: string, signal?: AbortSignal): Promise<ReadLibraryBundleResult>;
  prune(options: {
    backupsFolderId: string;
    protectedIds?: ReadonlySet<string>;
    signal?: AbortSignal;
  }): Promise<PruneBackupsResult>;
  probe(
    fileIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<DriveAccessProbeResult>;
  owners(
    fileIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<Map<string, DriveFileOwner>>;
};

export type BundleLibraryAccess = {
  ownerId: string;
  /** The library as it is now. */
  load(): Promise<LibraryBundleInput>;
  /** Every recording on this device; empty where nothing is stored. */
  recordings(): Promise<readonly Recording[]>;
  readRecordingAudio(recordingId: string): Promise<Uint8Array | null>;
  repository: LibraryBundleImportRepository & {
    replaceLibrary(
      ownerId: string,
      state: ReplacementLibraryState,
    ): Promise<{ removedSourceIds: string[] }>;
  };
  /** Reloads everything the screens hold after the library changed under them. */
  onLibraryChanged(): Promise<void>;
};

export type BundleServiceDependencies = {
  drive: BundleDriveApi;
  library: BundleLibraryAccess;
  now?: () => Date;
  createId?: () => string;
};

export type BundleFailure = {
  status: 'failed';
  reason: DriveUploadFailureReason;
  message: string;
};

export type BundleCancelled = { status: 'cancelled' };

/** What a long step is doing, for the progress line. */
export type BundlePhase =
  | 'folders'
  | 'reading'
  | 'recordings'
  | 'uploading'
  | 'pruning'
  | 'safety-backup'
  | 'replacing';

export type BundleProgress = (phase: BundlePhase) => void;

const FAILURE_COPY: Record<DriveUploadFailureReason, string> = {
  'needs-write-access': 'Allow saving to Drive and try again.',
  quota: 'Drive is full, so nothing could be saved.',
  'folder-not-writable': 'The Choir LMS folder in Drive could not be used.',
  offline: 'You appear to be offline.',
  'too-large': 'The file was too large to save.',
  unavailable: 'Drive could not be reached. Try again in a moment.',
};

export const describeBundleFailure = (
  reason: DriveUploadFailureReason,
): BundleFailure => ({
  status: 'failed',
  reason,
  message: FAILURE_COPY[reason],
});
