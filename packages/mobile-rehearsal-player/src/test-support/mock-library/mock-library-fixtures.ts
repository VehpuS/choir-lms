import type {
  CompositeTrack,
  DriveAudioSource,
  NamedLoop,
  SheetMusicSource,
  Playlist,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

/** The device owner the app reads its local library under. */
export const MOCK_LIBRARY_OWNER_ID = 'local-device-user';

const NON_SLUG_PATTERN = /[^a-z0-9]+/g;

/** A name as an id fragment: lower case, other characters as hyphens. */
export const slugify = (name: string): string =>
  name.toLowerCase().replace(NON_SLUG_PATTERN, '-');

export const MOCK_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const MOCK_AUDIO_MIME_TYPE = 'audio/mpeg';
const STORAGE_KEY_PREFIX = 'choirlms:practice';

/** The root of the Files tree (`REHEARSAL_LIBRARY_ROOT_FOLDER_ID`, kept in step by a spec). */
export const MOCK_LIBRARY_ROOT_FOLDER_ID = 'folder:library-root';
const LIBRARY_TREE_STORAGE_KEY_PREFIX = 'choirlms:practice:library-tree';

export type MockLibrary = {
  /** Composite tracks (stems plus a mix), stored beside the tracks. */
  composites?: CompositeTrack[];
  /** Named loops over saved tracks. */
  loops?: NamedLoop[];
  /** Files copies of tracks; a track without one gets a root copy on load. */
  fileLinks?: RehearsalLibraryFileLinkNode[];
  /** Files folders beneath the root. */
  folders?: RehearsalLibraryFolderNode[];
  playlists: Playlist[];
  sources: DriveAudioSource[];
};

export const buildMockSource = (
  name: string,
  overrides: Partial<DriveAudioSource> = {},
): DriveAudioSource => {
  const slug = slugify(name);

  return {
    id: `mock-source-${slug}`,
    provider: 'google-drive',
    driveFileId: `mock-drive-${slug}`,
    name,
    mimeType: MOCK_AUDIO_MIME_TYPE,
    extension: 'mp3',
    durationMs: 180_000,
    modifiedTime: MOCK_TIMESTAMP,
    createdAt: MOCK_TIMESTAMP,
    availability: { status: 'available' },
    ...overrides,
  };
};

export const buildMockPlaylist = (
  name: string,
  overrides: Partial<Playlist> = {},
): Playlist => {
  const slug = slugify(name);

  return {
    id: `mock-playlist-${slug}`,
    name,
    items: [],
    ownerId: MOCK_LIBRARY_OWNER_ID,
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
    ...overrides,
  };
};

export const buildMockFolder = (
  name: string,
  overrides: Partial<RehearsalLibraryFolderNode> = {},
): RehearsalLibraryFolderNode => ({
  id: `mock-folder-${slugify(name)}`,
  name,
  parentFolderId: MOCK_LIBRARY_ROOT_FOLDER_ID,
  createdAt: MOCK_TIMESTAMP,
  ...overrides,
});

/** A Files copy of a track, in `folder` (the root by default). */
export const buildMockTrackCopy = (
  source: DriveAudioSource,
  options: {
    folder?: RehearsalLibraryFolderNode;
    id?: string;
    visibleName?: string;
  } = {},
): RehearsalLibraryFileLinkNode => ({
  id: options.id ?? `mock-copy-${source.id}-${options.folder?.id ?? 'root'}`,
  parentFolderId: options.folder?.id ?? MOCK_LIBRARY_ROOT_FOLDER_ID,
  entityKind: 'track',
  entityId: source.id,
  ...(options.visibleName ? { visibleName: options.visibleName } : {}),
});

/** A small choir library: a few part tracks and two empty playlists. */
export const buildDefaultMockLibrary = (): MockLibrary => ({
  playlists: [buildMockPlaylist('Sunday Set'), buildMockPlaylist('Warmups')],
  sources: [
    buildMockSource('Soprano Part'),
    buildMockSource('Alto Part'),
    buildMockSource('Tenor Part'),
    buildMockSource('Full Choir'),
  ],
});

/**
 * Maps a library to the browser-storage entries the app reads on startup
 * (the same keys as `storageKey` in `@org/audio-library-runtime`, which a spec
 * keeps in step). Seed these into `localStorage` before the app loads.
 */
export const buildMockLibraryStorageEntries = (
  library: MockLibrary,
  ownerId: string = MOCK_LIBRARY_OWNER_ID,
): Record<string, string> => ({
  [`${STORAGE_KEY_PREFIX}:sources:${ownerId}`]: JSON.stringify(library.sources),
  [`${STORAGE_KEY_PREFIX}:playlists:${ownerId}`]: JSON.stringify(
    library.playlists,
  ),
  ...(library.loops
    ? {
        [`${STORAGE_KEY_PREFIX}:loops:${ownerId}`]: JSON.stringify(
          library.loops,
        ),
      }
    : {}),
  ...(library.composites
    ? {
        [`${STORAGE_KEY_PREFIX}:composites:${ownerId}`]: JSON.stringify(
          library.composites,
        ),
      }
    : {}),
  ...buildMockLibraryTreeEntries(library, ownerId),
});

const buildMockLibraryTreeEntries = (
  library: MockLibrary,
  ownerId: string,
): Record<string, string> => {
  if (!library.folders && !library.fileLinks) {
    return {};
  }

  const tree: RehearsalLibraryFileTree = {
    version: 1,
    rootFolderId: MOCK_LIBRARY_ROOT_FOLDER_ID,
    folders: [
      {
        id: MOCK_LIBRARY_ROOT_FOLDER_ID,
        name: 'Library',
        parentFolderId: null,
        createdAt: MOCK_TIMESTAMP,
      },
      ...(library.folders ?? []),
    ],
    fileLinks: library.fileLinks ?? [],
  };

  return {
    [`${LIBRARY_TREE_STORAGE_KEY_PREFIX}:${ownerId}`]: JSON.stringify(tree),
  };
};

/**
 * A library for renaming: "Alto Part" has copies in two folders (one named on
 * purpose), "Soprano Part" has only its one copy.
 */
export const buildTrackRenameMockLibrary = (): MockLibrary => {
  const alto = buildMockSource('Alto Part');
  const soprano = buildMockSource('Soprano Part');
  const rehearsal = buildMockFolder('Rehearsal');
  const archive = buildMockFolder('Archive');

  return {
    folders: [rehearsal, archive],
    fileLinks: [
      buildMockTrackCopy(alto),
      buildMockTrackCopy(alto, { folder: rehearsal }),
      buildMockTrackCopy(alto, { folder: archive, visibleName: 'Alto (old)' }),
      buildMockTrackCopy(soprano),
    ],
    playlists: [],
    sources: [alto, soprano],
  };
};

/** A PDF score linked from a web address; the browser session serves the bytes. */
export const buildMockPdfSheetMusic = (
  label: string,
  url: string,
  overrides: Partial<SheetMusicSource> = {},
): SheetMusicSource => ({
  id: `mock-sheet-music-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  label,
  location: { kind: 'url', url },
  format: 'pdf',
  addedAt: MOCK_TIMESTAMP,
  ...overrides,
});
