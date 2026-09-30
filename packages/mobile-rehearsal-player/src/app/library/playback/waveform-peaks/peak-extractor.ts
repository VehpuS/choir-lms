import type { WaveformPeaks } from '@org/audio-library-models';

/**
 * Native has no decoder yet: a pure-JS MP3 decode measured 43 s for a 5:34
 * track in Node alone (task 4.1), so native keeps the neutral placeholder
 * band until a native extractor lands (tracked in tasks 8.41). Web decodes
 * the downloaded file in `peak-extractor.web.ts`.
 */
export const extractWaveformPeaks: (
  audio: Blob,
) => Promise<WaveformPeaks | null> = async () => null;
