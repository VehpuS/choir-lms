/** What the budget and the offline files view read, without loading any bytes. */
export type AudioStoreEntry = {
  driveFileId: string;
  sizeBytes: number;
  /** The Drive content version (`modifiedTime`) the bytes were downloaded at. */
  sourceVersion: string;
  touchedAt: number;
  /** Kept offline by the user: automatic eviction never removes it. */
  pinned?: boolean;
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
