import {
  createDriveAudioSource,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

export const AVAILABLE_SOURCE = createDriveAudioSource({
  availability: {
    status: 'available',
  },
  driveFileId: 'drive-file-1',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-05T09:00:00.000Z',
  name: 'Full Choir.mp3',
});

export const UNAVAILABLE_SOURCE = createDriveAudioSource({
  availability: {
    message: 'Reconnect Drive to restore this track.',
    reason: 'access-revoked',
    status: 'unavailable',
  },
  driveFileId: 'drive-file-2',
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-02T09:00:00.000Z',
  name: 'Section Notes.mp3',
});

export const SAVED_LOOP: NamedLoop = {
  createdAt: '2026-07-01T00:00:00.000Z',
  endMs: 24000,
  id: 'loop-1',
  name: 'Verse entrance',
  ownerId: 'user-1',
  sourceId: AVAILABLE_SOURCE.id,
  sourceName: AVAILABLE_SOURCE.name,
  startMs: 12000,
  updatedAt: '2026-07-01T00:00:00.000Z',
};

export const PLAYLIST: Playlist = {
  createdAt: '2026-07-01T00:00:00.000Z',
  id: 'playlist-1',
  items: [],
  name: 'Evening Warmups',
  ownerId: 'user-1',
  updatedAt: '2026-07-01T00:00:00.000Z',
};
