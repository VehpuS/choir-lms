import type {
  DriveAuthorizationState,
  DriveBrowseSnapshot,
  DriveSearchSnapshot,
} from '@org/google-drive';

export const AUTHORIZED_STATE: DriveAuthorizationState = {
  accessToken: 'drive-token',
  scope: 'https://www.googleapis.com/auth/drive.readonly',
  status: 'authorized',
};

export const PLAYABLE_SOURCE: DriveBrowseSnapshot['playableSources'][number] = {
  id: 'drive:alto-line',
  provider: 'google-drive',
  driveFileId: 'alto-line',
  name: 'Alto Line.mp3',
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  durationMs: 185000,
  modifiedTime: '2026-05-10T10:00:00.000Z',
  availability: {
    status: 'available',
  },
};

export const UNSUPPORTED_SOURCE: DriveBrowseSnapshot['unavailableSources'][number] =
  {
    id: 'drive:guide-aiff',
    provider: 'google-drive',
    driveFileId: 'guide-aiff',
    name: 'Guide Track.aiff',
    mimeType: 'audio/aiff',
    extension: 'aiff',
    modifiedTime: '2026-05-10T10:00:00.000Z',
    availability: {
      status: 'unsupported',
      reason: 'unsupported-format',
      message: 'This Drive file format is outside the MVP audio set.',
    },
  };

export const BROWSE_SNAPSHOT: DriveBrowseSnapshot = {
  location: {
    id: 'root',
    kind: 'root',
    name: 'My Drive',
    rootKind: 'my-drive',
  },
  folders: [
    {
      id: 'folder-1',
      name: 'Sectionals',
      modifiedTime: '2026-05-10T10:00:00.000Z',
      rootKind: 'my-drive',
      shared: false,
    },
  ],
  playableSources: [PLAYABLE_SOURCE],
  unavailableSources: [UNSUPPORTED_SOURCE],
};

export const SEARCH_SNAPSHOT: DriveSearchSnapshot = {
  query: 'Kyrie',
  playableSources: [
    {
      ...PLAYABLE_SOURCE,
      locationLabel: 'Shared with you',
    },
  ],
  unavailableSources: [
    {
      ...UNSUPPORTED_SOURCE,
      locationLabel: 'My Drive',
    },
  ],
};

export const SAVED_LOOP = {
  id: 'loop-1',
  name: 'Entrance cue',
  sourceId: PLAYABLE_SOURCE.id,
  sourceName: PLAYABLE_SOURCE.name,
  startMs: 12000,
  endMs: 18500,
  ownerId: 'user-1',
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
};
