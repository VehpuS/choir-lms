import { Asset } from 'expo-asset';

import { createPianoSampleCache } from './piano-sample-cache';
import { SAMPLE_MIDIS } from './piano-samples';

// Metro resolves each recording to an asset module; the file names give the
// note (`Ds3` is D♯3). Credits and the licence are in the same folder.
const SAMPLE_MODULES: Record<number, number> = {
  36: require('../../../../assets/audio/piano/C2.mp3'),
  39: require('../../../../assets/audio/piano/Ds2.mp3'),
  42: require('../../../../assets/audio/piano/Fs2.mp3'),
  45: require('../../../../assets/audio/piano/A2.mp3'),
  48: require('../../../../assets/audio/piano/C3.mp3'),
  51: require('../../../../assets/audio/piano/Ds3.mp3'),
  54: require('../../../../assets/audio/piano/Fs3.mp3'),
  57: require('../../../../assets/audio/piano/A3.mp3'),
  60: require('../../../../assets/audio/piano/C4.mp3'),
  63: require('../../../../assets/audio/piano/Ds4.mp3'),
  66: require('../../../../assets/audio/piano/Fs4.mp3'),
  69: require('../../../../assets/audio/piano/A4.mp3'),
  72: require('../../../../assets/audio/piano/C5.mp3'),
  75: require('../../../../assets/audio/piano/Ds5.mp3'),
  78: require('../../../../assets/audio/piano/Fs5.mp3'),
  81: require('../../../../assets/audio/piano/A5.mp3'),
  84: require('../../../../assets/audio/piano/C6.mp3'),
  87: require('../../../../assets/audio/piano/Ds6.mp3'),
  90: require('../../../../assets/audio/piano/Fs6.mp3'),
  93: require('../../../../assets/audio/piano/A6.mp3'),
  96: require('../../../../assets/audio/piano/C7.mp3'),
};

const fetchPianoSample = async (midi: number): Promise<ArrayBuffer> => {
  const module = SAMPLE_MODULES[midi];

  if (module === undefined) {
    throw new Error(`No piano sample for MIDI note ${midi}.`);
  }

  const response = await fetch(Asset.fromModule(module).uri);

  if (!response.ok) {
    throw new Error(
      `Piano sample ${midi} failed to load (${response.status}).`,
    );
  }

  return response.arrayBuffer();
};

const sampleCache = createPianoSampleCache(fetchPianoSample);

/**
 * One recording as encoded audio, ready for `decodeAudioData`: from the warm-up
 * if it has fetched it already, otherwise fetched now (once).
 */
export const loadPianoSample = sampleCache.load;

/** Starts fetching all the recordings, without waiting for them. */
export const warmPianoSamples = () => {
  sampleCache.warm(SAMPLE_MIDIS);
};
