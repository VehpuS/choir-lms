import {
  ensureDriveFolder,
  type DriveFolderRef,
  type EnsureDriveFolderOptions,
} from './drive-folder-ensure';
import type { DriveUploadFailureReason } from './drive-file-upload';

/**
 * Where library bundles live on Drive (library-backup-restore design
 * Decision 5): visible folders the app creates, so `drive.file` can read and
 * manage them and the user can share `Shares` in Drive themselves.
 *
 *   Choir LMS/Backups   Choir LMS/Shares
 */

export const BUNDLE_ROOT_FOLDER_NAME = 'Choir LMS';
export const BUNDLE_BACKUPS_FOLDER_NAME = 'Backups';
export const BUNDLE_SHARES_FOLDER_NAME = 'Shares';

export type LibraryBundleFolders = {
  root: DriveFolderRef;
  backups: DriveFolderRef;
  shares: DriveFolderRef;
};

export type EnsureLibraryBundleFoldersResult =
  | { status: 'ready'; folders: LibraryBundleFolders }
  | { status: 'aborted' }
  | { status: 'failed'; reason: DriveUploadFailureReason };

type FolderFetchOptions = Pick<
  EnsureDriveFolderOptions,
  'accessToken' | 'fetch' | 'signal'
>;

/** Finds or creates `Choir LMS/Backups` and `Choir LMS/Shares`; never throws. */
export const ensureLibraryBundleFolders = async (
  options: FolderFetchOptions,
): Promise<EnsureLibraryBundleFoldersResult> => {
  const root = await ensureDriveFolder({
    ...options,
    name: BUNDLE_ROOT_FOLDER_NAME,
  });

  if (root.status !== 'ready') {
    return root;
  }

  const backups = await ensureDriveFolder({
    ...options,
    name: BUNDLE_BACKUPS_FOLDER_NAME,
    parentId: root.folder.id,
  });

  if (backups.status !== 'ready') {
    return backups;
  }

  const shares = await ensureDriveFolder({
    ...options,
    name: BUNDLE_SHARES_FOLDER_NAME,
    parentId: root.folder.id,
  });

  return shares.status === 'ready'
    ? {
        status: 'ready',
        folders: {
          root: root.folder,
          backups: backups.folder,
          shares: shares.folder,
        },
      }
    : shares;
};

const FILE_NAME_STAMP_LENGTH = 16;
const TIME_COLON_PATTERN = /:/g;
const WHITESPACE_RUN_PATTERN = /\s+/g;
const UNSAFE_NAME_CHARACTERS_PATTERN = /[\\/:*?"<>|]+/g;

/** `2026-11-09T1530`, sortable and free of characters Drive names dislike. */
export const formatBundleStamp = (date: Date): string => {
  return date
    .toISOString()
    .slice(0, FILE_NAME_STAMP_LENGTH)
    .replace(TIME_COLON_PATTERN, '');
};

export type LibraryBundleFileKind = 'backup' | 'pre-restore' | 'share';

const KIND_PREFIX: Record<LibraryBundleFileKind, string> = {
  backup: 'choir-lms-backup-',
  'pre-restore': 'choir-lms-pre-restore-',
  share: 'choir-lms-share-',
};

/** A dated file name; shares carry the folder name so the recipient sees what it is. */
export const createBundleFileName = (options: {
  kind: LibraryBundleFileKind;
  date: Date;
  /** The shared folder's name, for `share` files. */
  label?: string;
}): string => {
  const stamp = formatBundleStamp(options.date);
  const label = options.label
    ?.replace(UNSAFE_NAME_CHARACTERS_PATTERN, ' ')
    .replace(WHITESPACE_RUN_PATTERN, ' ')
    .trim();

  return options.kind === 'share' && label
    ? `${KIND_PREFIX.share}${label} ${stamp}.json`
    : `${KIND_PREFIX[options.kind]}${stamp}.json`;
};

/** What a bundle file name says it is; `null` for any other name. */
export const getBundleFileKind = (
  name: string,
): LibraryBundleFileKind | null => {
  const kinds = Object.keys(KIND_PREFIX) as LibraryBundleFileKind[];

  return kinds.find((kind) => name.startsWith(KIND_PREFIX[kind])) ?? null;
};
