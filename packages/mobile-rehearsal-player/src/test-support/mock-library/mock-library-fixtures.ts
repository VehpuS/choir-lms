import type { DriveAudioSource, Playlist } from '@org/audio-library-models';

/** The device owner the app reads its local library under. */
export const MOCK_LIBRARY_OWNER_ID = 'local-device-user';

const MOCK_TIMESTAMP = '2026-01-01T00:00:00.000Z';
const MOCK_AUDIO_MIME_TYPE = 'audio/mpeg';
const STORAGE_KEY_PREFIX = 'choirlms:practice';

export type MockLibrary = {
  playlists: Playlist[];
  sources: DriveAudioSource[];
};

export const buildMockSource = (
  name: string,
  overrides: Partial<DriveAudioSource> = {},
): DriveAudioSource => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
});
