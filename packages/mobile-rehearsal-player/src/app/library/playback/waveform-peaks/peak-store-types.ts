import type { WaveformPeaks } from '@org/audio-library-models';

/** One cached analysis: the peaks plus what they were derived from. */
export type WaveformPeakRecord = {
  key: string;
  peaks: WaveformPeaks;
  /** The Drive content version the audio had when it was analyzed. */
  sourceVersion: string;
  touchedAt: number;
};

/** What the budget is enforced over, without loading every record's buckets. */
export type WaveformPeakEntry = {
  key: string;
  sizeBytes: number;
  touchedAt: number;
};

/** Platform storage behind the peak cache (IndexedDB on web, AsyncStorage on native). */
export type WaveformPeakStore = {
  get: (key: string) => Promise<WaveformPeakRecord | null>;
  list: () => Promise<WaveformPeakEntry[]>;
  put: (record: WaveformPeakRecord) => Promise<void>;
  remove: (key: string) => Promise<void>;
};
