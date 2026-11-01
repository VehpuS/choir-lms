import AsyncStorage from '@react-native-async-storage/async-storage';

import { appVisibility } from '../pitch/app-visibility';
import { getPcmSource } from '../pitch/pcm-source';
import {
  createRecordingSession,
  type RecordingSession,
} from './recording-session';
import { browserStorageEstimate } from './recording-storage-limit';
import { getRecordingsStore } from './recordings-store-instance';

let session: RecordingSession | null = null;

/** The app's one recording session, created on first use with the real microphone and store. */
export const getRecordingSession = (): RecordingSession => {
  session ??= createRecordingSession({
    source: getPcmSource(),
    store: getRecordingsStore(),
    estimate: browserStorageEstimate,
    storage: AsyncStorage,
    visibility: appVisibility,
  });

  return session;
};
