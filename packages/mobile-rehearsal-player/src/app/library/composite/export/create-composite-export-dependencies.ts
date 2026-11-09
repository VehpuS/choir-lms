import type {
  CompositeTrack,
  DriveAudioSource,
} from '@org/audio-library-models';
import { createSoundTouchSumShaper } from '@org/audio-mixing';
import { uploadDriveFileResumable } from '@org/google-drive';

import { saveRecordingFile } from '../../recording/export/save-recording-file';
import { getCompositeAudioContext } from '../engine/create-web-composite-engine';
import { createStemLoader } from '../loading/create-stem-loader';
import {
  buildStemLoaderDependencies,
  type AudioDecoder,
  fetchTrackBlob,
} from '../playback/create-composite-engine-loader';
import { getPreparedStemStore } from '../prepared/prepared-stem-instance';
import type { CompositeExportDependencies } from './composite-export-runner';

const WAV_BLOB_CONSTRUCTOR = Blob as unknown as new (
  parts: unknown[],
  options?: { type?: string },
) => Blob;

/**
 * Everything the composite export runner calls outside itself, for the running
 * app: the same stem loader as playback (so a stem that is not yet prepared is
 * fetched and prepared first), SoundTouch for the shaping, and the recording
 * export's download and Drive upload. Null where composites cannot run.
 */
export const createCompositeExportDependencies = (options: {
  accessToken: string | null;
  composite: Pick<CompositeTrack, 'id' | 'stems'>;
  getTrack: (trackId: string) => DriveAudioSource | undefined;
}): CompositeExportDependencies | null => {
  // Typed by what is read from it: the native build has no context at all.
  const getContext: () => AudioDecoder | null = getCompositeAudioContext;
  const context = getContext();

  if (!context) {
    return null;
  }

  return {
    createShaper: createSoundTouchSumShaper,
    loadStem: createStemLoader(
      buildStemLoaderDependencies({
        accessToken: options.accessToken,
        composite: options.composite,
        context,
        dependencies: {
          fetchBlob: fetchTrackBlob,
          store: getPreparedStemStore(),
        },
        getTrack: options.getTrack,
      }),
    ),
    makeBlob: (parts, type) => new WAV_BLOB_CONSTRUCTOR(parts, { type }),
    sampleRate: context.sampleRate,
    saveToDevice: saveRecordingFile,
    upload: uploadDriveFileResumable,
  };
};
