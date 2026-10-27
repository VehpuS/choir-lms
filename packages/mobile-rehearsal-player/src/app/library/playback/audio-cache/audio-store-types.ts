/** What the budget and the offline files view read, without loading any bytes. */
export type AudioStoreEntry = {
  driveFileId: string;
  sizeBytes: number;
  /** The Drive content version (`modifiedTime`) the bytes were downloaded at. */
  sourceVersion: string;
  touchedAt: number;
  /** The Drive file name when the caller knew it; the view falls back to the library. */
  name?: string;
  /** Kept offline by the user: automatic eviction never removes it. */
  pinned?: boolean;
  /**
   * A score file (PDF, MusicXML, MIDI) kept with a track rather than audio.
   * Scores are only ever stored kept, so the audio cache size never sees them.
   */
  kind?: 'score';
  /** For a score: the Drive file ids of the kept tracks that use it. */
  ownerIds?: string[];
};

export type AudioStoreRecord = {
  blob: Blob;
  entry: AudioStoreEntry;
};

/** Platform storage behind the audio cache (IndexedDB on web; none on native yet). */
export type AudioStore = {
  clear: () => Promise<void>;
  list: () => Promise<AudioStoreEntry[]>;
  read: (driveFileId: string) => Promise<AudioStoreRecord | null>;
  remove: (driveFileId: string) => Promise<void>;
  /** Pins or unpins a file without rewriting its bytes. */
  setPinned: (driveFileId: string, pinned: boolean) => Promise<void>;
  /** Marks a file as recently used without rewriting its bytes. */
  touch: (driveFileId: string, touchedAt: number) => Promise<void>;
  write: (entry: AudioStoreEntry, blob: Blob) => Promise<void>;
};
