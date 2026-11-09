import type { CompositeTrack } from './composite-track.ts';
import type { DriveSourceLocation } from './drive-source-location.ts';
import type { PlaybackShaping } from './playback-shaping.ts';
import type {
  RecordingMarker,
  RecordingPunch,
  RecordingShaping,
  RecordingSource,
  RecordingTimelineSegment,
} from './recording.ts';
import type {
  PlayableItemKind,
  RehearsalLibraryEntityKind,
} from './rehearsal-domain.ts';
import type { SourceLyrics } from './source-lyrics.ts';
import type { SheetMusicSource } from './source-sheet-music.ts';
import type { TrackMarker } from './track-markers.ts';

/**
 * A library bundle is one versioned, self-contained JSON snapshot of the
 * library or of one folder subtree (library-bundle spec). Every entity and
 * every cross reference uses a bundle-local id, so a bundle never leaks the
 * ids of the device that wrote it and import is a pure id-mapping problem.
 * Audio is never embedded; sources are addressed by their global Drive file id.
 *
 * Recordings are optional and carry metadata only; their audio is referenced
 * on Drive or marked as still to be uploaded (design Decision 9).
 */

/** The bundle format this app writes and fully understands. */
export const CURRENT_LIBRARY_BUNDLE_FORMAT_VERSION = 1;

export type LibraryBundleScope =
  | { kind: 'library' }
  | { kind: 'folder'; name: string };

/** Who wrote the bundle; shown as `Imported from <name>`. */
export type LibraryBundleAuthor = {
  name: string;
  email?: string;
};

/** The Drive owner of a source's file when Drive reported one at export. */
export type LibraryBundleOwner = {
  name?: string;
  email?: string;
};

/** Where an imported entity came from; never set on a reused source. */
export type ImportedFrom = {
  author: string;
  bundleName: string;
  importedAt: string;
};

export type LibraryBundleAdjustment = {
  /** Bundle-local id of the saved track this one is adjusted from. */
  sourceRef: string;
  sourceName: string;
  transform: PlaybackShaping;
};

/** A saved track, or an adjusted track when `adjustment` is set. */
export type LibraryBundleSource = {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  extension?: string;
  durationMs?: number;
  sizeBytes?: number;
  modifiedTime?: string;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  lyrics?: SourceLyrics;
  sheetMusic?: SheetMusicSource[];
  markers?: TrackMarker[];
  sourceLocation?: DriveSourceLocation;
  adjustment?: LibraryBundleAdjustment;
  owner?: LibraryBundleOwner;
  createdAt: string;
};

export type LibraryBundleFolder = {
  id: string;
  name: string;
  /** Bundle-local parent id; `null` for a folder at the top of the bundle. */
  parentFolderId: string | null;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  createdAt: string;
};

export type LibraryBundleFileLink = {
  id: string;
  /** Bundle-local folder id; `null` for a file at the top of the bundle. */
  parentFolderId: string | null;
  entityKind: RehearsalLibraryEntityKind;
  /** Bundle-local id of the entity of that kind. */
  entityId: string;
  visibleName?: string;
};

export type LibraryBundleLoop = {
  id: string;
  name: string;
  sourceId: string;
  sourceName: string;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  startMs: number;
  endMs: number;
  transform?: PlaybackShaping;
  createdAt: string;
  updatedAt: string;
};

export type LibraryBundlePlaylistEntry = {
  id: string;
  sortIndex: number;
  kind: PlayableItemKind;
  /** Bundle-local source id, or composite id when `kind` is `composite`. */
  sourceId: string;
  /** Bundle-local loop id when `kind` is `loop`. */
  loopId?: string;
  title: string;
  description?: string;
  createdAt: string;
};

export type LibraryBundlePlaylist = {
  id: string;
  name: string;
  tags?: string[];
  tagAddedAt?: Record<string, string>;
  items: LibraryBundlePlaylistEntry[];
  createdAt: string;
  updatedAt: string;
};

/** Where a recording's audio is: a Drive copy, or not uploaded yet (the writer uploads it). */
export type LibraryBundleRecordingAudio =
  | { kind: 'drive'; driveFileId: string; fileName: string }
  | { kind: 'not-uploaded' };

/** What a recording was sung against, by bundle-local ids. */
export type LibraryBundleRecordingLineage = {
  trackId: string;
  adjustedId?: string;
  loopId?: string;
};

export type LibraryBundleRecording = {
  id: string;
  name: string;
  createdAt: string;
  durationMs: number;
  sampleRate: number;
  sizeBytes: number;
  appliedLatencyMs: number;
  nudgeMs: number;
  source: RecordingSource;
  lineage: LibraryBundleRecordingLineage;
  shaping: RecordingShaping;
  balance: number;
  levelDb?: number;
  engineVersion: number;
  markers: RecordingMarker[];
  punch?: RecordingPunch;
  timeline: RecordingTimelineSegment[];
  audio: LibraryBundleRecordingAudio;
};

/** A composite whose stems name bundle-local source ids. */
export type LibraryBundleComposite = CompositeTrack;

export type LibraryBundle = {
  formatVersion: number;
  createdAt: string;
  author: LibraryBundleAuthor;
  scope: LibraryBundleScope;
  sources: LibraryBundleSource[];
  folders: LibraryBundleFolder[];
  fileLinks: LibraryBundleFileLink[];
  loops: LibraryBundleLoop[];
  playlists: LibraryBundlePlaylist[];
  composites: LibraryBundleComposite[];
  /** Present only when the writer chose to include recordings. */
  recordings?: LibraryBundleRecording[];
};

/** What the parser dropped, so a preview can say how much of a bundle was damaged. */
export type LibraryBundleDropCounts = {
  sources: number;
  folders: number;
  fileLinks: number;
  loops: number;
  playlists: number;
  playlistEntries: number;
  composites: number;
  recordings: number;
};

export type LibraryBundleRefusal =
  /** Not JSON, or JSON that is not a Choir LMS bundle. */
  | { reason: 'not-a-bundle'; message: string }
  /** Written by a newer app; nothing beyond the version was read. */
  | {
      reason: 'newer-version';
      message: string;
      formatVersion: number;
    };

export type LibraryBundleParseResult =
  | {
      status: 'ok';
      bundle: LibraryBundle;
      dropped: LibraryBundleDropCounts;
      /** Total of `dropped`, for the preview line. */
      droppedTotal: number;
    }
  | ({ status: 'refused' } & LibraryBundleRefusal);
