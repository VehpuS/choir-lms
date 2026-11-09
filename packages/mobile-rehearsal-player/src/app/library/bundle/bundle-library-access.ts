import { storeRestoredRecording } from './store-restored-recording';
import { loadCanonicalLibraryState } from './load-library-state';
import { recordingsStorageSupported } from '../recording/recording-capabilities';
import { getRecordingsStore } from '../recording/recordings-store-instance';
import { practiceRepository } from '../saved-rehearsal-library/use-saved-rehearsal-library';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import type { BundleLibraryAccess } from './bundle-service-types';

/** The running app's library, as the bundle flows see it. */
export const createBundleLibraryAccess = (options: {
  onLibraryChanged: () => Promise<void>;
}): BundleLibraryAccess => ({
  ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
  load: () =>
    loadCanonicalLibraryState(
      practiceRepository,
      LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    ),
  recordings: async () => {
    if (!recordingsStorageSupported()) {
      return [];
    }

    // A recording still being made is not complete audio yet.
    const all = await getRecordingsStore().list();

    return all;
  },
  readRecordingAudio: async (recordingId) => {
    const blob = await getRecordingsStore().getWavBlob(recordingId);

    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  },
  recordingsSupported: recordingsStorageSupported,
  hasRecording: async (recordingId) =>
    (await getRecordingsStore().get(recordingId)) !== null,
  saveRecording: (recording, samples) =>
    storeRestoredRecording(getRecordingsStore(), recording, samples),
  repository: practiceRepository,
  onLibraryChanged: options.onLibraryChanged,
});
