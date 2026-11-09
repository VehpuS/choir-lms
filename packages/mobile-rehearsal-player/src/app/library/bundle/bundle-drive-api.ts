import {
  bytesUploadSource,
  ensureLibraryBundleFolders,
  listLibraryBundles,
  lookupDriveFileOwners,
  lookupDriveUser,
  probeDriveFilesAccess,
  pruneLibraryBackups,
  readDriveFileBytes,
  readLibraryBundleText,
  uploadDriveFileResumable,
  uploadLibraryBundle,
} from '@org/google-drive';

import type { BundleDriveApi } from './bundle-service-types';

const ANONYMOUS_AUTHOR = 'A Choir LMS user';

/** The bundle Drive calls for one signed-in session. */
export const createBundleDriveApi = (accessToken: string): BundleDriveApi => ({
  ensureFolders: (signal) =>
    ensureLibraryBundleFolders({ accessToken, signal }),
  uploadBundle: (options) => uploadLibraryBundle({ accessToken, ...options }),
  uploadAudio: async ({ bytes, folderId, name, signal }) => {
    const result = await uploadDriveFileResumable({
      accessToken,
      folderId,
      mimeType: 'audio/wav',
      name,
      signal,
      source: bytesUploadSource(bytes),
    });

    if (result.status === 'uploaded') {
      return {
        status: 'uploaded',
        file: { id: result.file.id, name: result.file.name },
      };
    }

    return result.status === 'aborted'
      ? { status: 'aborted' }
      : { status: 'failed', reason: result.reason };
  },
  currentUser: async (signal) => {
    const user = await lookupDriveUser({ accessToken, signal });

    return user
      ? {
          name: user.name ?? user.email ?? ANONYMOUS_AUTHOR,
          ...(user.email ? { email: user.email } : {}),
        }
      : null;
  },
  downloadAudio: (fileId, signal) =>
    readDriveFileBytes({ accessToken, fileId, signal }),
  list: (signal) => listLibraryBundles({ accessToken, signal }),
  read: (fileId, signal) =>
    readLibraryBundleText({ accessToken, fileId, signal }),
  prune: (options) => pruneLibraryBackups({ accessToken, ...options }),
  probe: (fileIds, signal) =>
    probeDriveFilesAccess({ accessToken, fileIds, signal }),
  owners: (fileIds, signal) =>
    lookupDriveFileOwners({ accessToken, fileIds, signal }),
});
