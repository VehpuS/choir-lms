/**
 * What the Sound check says (clear-playback-while-listening). It is an
 * experimental page in Settings > Microphone for finding, on a phone with
 * Bluetooth earbuds, which combination of playing a sound, opening the
 * microphone and the page's audio session type makes the sound thin.
 */

export const SOUND_CHECK_COPY = {
  title: 'Sound check',
  body: 'Experimental. Play a test sound, open the microphone and change the audio session, to find what makes Bluetooth earbuds sound thin. The test sound is a tone on the left, then the right, then a sweep up to 8 kHz.',
  webAudioNew: 'Test sound: web audio, new context',
  webAudioApp: 'Test sound: web audio, the app’s context',
  mediaElement: 'Test sound: media element',
  microphone: 'Microphone',
  sessionTitle: 'Audio session type',
} as const;

export type SessionTypeChoice = { label: string; value: string };

/** The values `navigator.audioSession.type` takes in Safari. */
export const SESSION_TYPE_CHOICES: readonly SessionTypeChoice[] = [
  { label: 'Session: auto', value: 'auto' },
  { label: 'Session: playback', value: 'playback' },
  { label: 'Session: play-and-record', value: 'play-and-record' },
  { label: 'Session: ambient', value: 'ambient' },
];

export type ContextReading = {
  state: string;
  sampleRate: number;
  /** Seconds, where the browser reports it. */
  outputLatency?: number;
};

export type SoundCheckReadout = {
  sessionType: string | null;
  isCapturing: boolean;
  microphone: { sampleRate: number; levelDb: number | null } | null;
  appContext: ContextReading | null;
  testContext: ContextReading | null;
  isMediaElementPlaying: boolean;
};

const MS_PER_SECOND = 1000;

export const formatContext = (reading: ContextReading | null): string => {
  if (!reading) {
    return 'none';
  }

  const latency =
    reading.outputLatency === undefined
      ? ''
      : `, output latency ${Math.round(reading.outputLatency * MS_PER_SECOND)} ms`;

  return `${reading.state}, ${reading.sampleRate} Hz${latency}`;
};

/** Level of a block of samples in dB full scale; null for silence. */
export const levelDb = (samples: ArrayLike<number>): number | null => {
  let sum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    sum += samples[index] * samples[index];
  }

  const rms = samples.length > 0 ? Math.sqrt(sum / samples.length) : 0;

  return rms > 0 ? Math.round(20 * Math.log10(rms)) : null;
};

/** The lines the page shows, one fact each, so a photo of the screen is a full report. */
export const describeReadout = (readout: SoundCheckReadout): string[] => [
  `Session type: ${readout.sessionType ?? 'not available in this browser'}`,
  `Microphone open: ${readout.isCapturing ? 'yes' : 'no'}`,
  readout.microphone
    ? `Capture: ${readout.microphone.sampleRate} Hz, level ${
        readout.microphone.levelDb === null
          ? 'silent'
          : `${readout.microphone.levelDb} dB`
      }`
    : 'Capture: off',
  `App audio context: ${formatContext(readout.appContext)}`,
  `Test audio context: ${formatContext(readout.testContext)}`,
  `Media element sound: ${readout.isMediaElementPlaying ? 'playing' : 'off'}`,
];
