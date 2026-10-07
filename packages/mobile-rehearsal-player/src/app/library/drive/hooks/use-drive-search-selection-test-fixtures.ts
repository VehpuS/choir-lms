import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';

import type { useDriveSearchSelection } from './use-drive-search-selection.js';

export const ROOT_LOCATION: DriveBrowseLocation = {
  id: 'root',
  kind: 'root',
  name: 'My Drive',
  rootKind: 'my-drive',
};

export const RESULTS: DriveDiscoveryResult[] = [
  {
    id: 'folder-warmups',
    kind: 'folder',
    name: 'Warmups',
    rootKind: 'my-drive',
    shared: false,
  },
  {
    availability: { status: 'available' },
    createdAt: '2026-09-16T00:00:00.000Z',
    driveFileId: 'track-warmup',
    id: 'track-warmup',
    kind: 'audio',
    mimeType: 'audio/mpeg',
    name: 'Warmup.mp3',
    provider: 'google-drive',
    rootKind: 'my-drive',
  },
];

export type HarnessProps = {
  activeQuery: string | null;
  browse?: Parameters<typeof useDriveSearchSelection>[0]['browse'];
  inputQuery: string;
  isComplete: boolean;
  isLoading: boolean;
  location: DriveBrowseLocation;
  results: DriveDiscoveryResult[];
};

export type SelectionHook = ReturnType<typeof useDriveSearchSelection>;
