import { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import {
  enumerateDriveFolderContents,
  getDriveAudioSource,
} from '@org/google-drive';

import { runtimeConfig } from '../../../config/runtime';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import { executeDriveImportPlan } from './drive-import-executor';
import type { DriveImportControllerDependencies } from './use-drive-import-controller';

const practiceRepository = new AsyncStoragePracticeRepository();

const requireAccessToken = (accessToken?: string) => {
  if (!accessToken) {
    throw new Error('Google Drive authorization is required to import.');
  }

  return accessToken;
};

export const createDriveImportControllerDependencies = (
  accessToken?: string,
): DriveImportControllerDependencies => ({
  async enumerateFolderContents(folder, signal) {
    return enumerateDriveFolderContents({
      accessToken: requireAccessToken(accessToken),
      rootFolder: folder,
      signal,
      supportedExtensions: runtimeConfig.supportedAudioExtensions,
      supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
    });
  },
  async executePlan({ onProgress, plan, signal }) {
    return executeDriveImportPlan({
      async loadDriveSource(source, loadSignal) {
        const refreshedSource = await getDriveAudioSource({
          accessToken: requireAccessToken(accessToken),
          driveFileId: source.driveFileId,
          signal: loadSignal,
          supportedExtensions: runtimeConfig.supportedAudioExtensions,
          supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
        });

        return { ...source, ...refreshedSource };
      },
      onProgress,
      ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
      plan,
      repository: practiceRepository,
      signal,
    });
  },
  async loadLibraryState() {
    const [sources, loops, playlists, tree] = await Promise.all([
      practiceRepository.listSources(LOCAL_REHEARSAL_LIBRARY_OWNER_ID),
      practiceRepository.listLoops(LOCAL_REHEARSAL_LIBRARY_OWNER_ID),
      practiceRepository.listPlaylists(LOCAL_REHEARSAL_LIBRARY_OWNER_ID),
      practiceRepository.listLibraryFileTree(LOCAL_REHEARSAL_LIBRARY_OWNER_ID),
    ]);

    return { entityCollections: { loops, playlists, sources }, tree };
  },
});
