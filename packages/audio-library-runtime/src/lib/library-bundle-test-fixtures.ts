import {
  createDriveAudioSource,
  type CompositeTrack,
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import type { LibraryBundleInput } from './library-bundle-selection.ts';

export const AT = '2026-11-09T10:00:00.000Z';
export const ROOT = 'folder:library-root';
export const AUTHOR = { name: 'Dana' };

export const track = (driveFileId: string, name: string): DriveAudioSource =>
  createDriveAudioSource({
    driveFileId,
    name,
    mimeType: 'audio/mpeg',
    durationMs: 60000,
    createdAt: AT,
    availability: { status: 'available' },
  });

export const SOPRANO = track('d-sop', 'Soprano');
export const ALTO = track('d-alt', 'Alto');
export const OUTSIDE = track('d-out', 'Elsewhere');
export const SLOW: DriveAudioSource = {
  ...track('d-sop', 'Soprano slow'),
  id: 'adjusted:1',
  adjustment: {
    sourceRef: SOPRANO.id,
    sourceName: 'Soprano',
    transform: {
      pitchSemitones: 0,
      speedMultiplier: 0.8,
      tempoSource: 'multiplier',
    },
  },
};

export const loop = (
  id: string,
  source: DriveAudioSource,
  name: string,
): NamedLoop => ({
  id,
  name,
  sourceId: source.id,
  sourceName: source.name,
  startMs: 1000,
  endMs: 5000,
  ownerId: 'local-device-user',
  createdAt: AT,
  updatedAt: AT,
});

export const entry = (
  id: string,
  kind: 'track' | 'loop' | 'composite',
  sourceId: string,
  loopId?: string,
): Playlist['items'][number] => ({
  id,
  playlistId: 'pl',
  sortIndex: 0,
  kind,
  sourceId,
  ...(loopId ? { loopId } : {}),
  title: id,
  createdAt: AT,
});

export const composite = (id: string, trackIds: string[]): CompositeTrack => ({
  id,
  name: `Mix ${id.length}`,
  stems: trackIds.map((trackId, index) => ({
    id: `device-stem-${index}`,
    trackId,
    name: `Part ${index + 1}`,
    offsetMs: 0,
    mine: index === 0,
  })),
  defaultMix: {
    levels: { 'device-stem-0': { volume: 80, muted: false, soloed: false } },
  },
  presets: [],
  lyricsStemId: 'device-stem-1',
  createdAt: AT,
});

export const folder = (id: string, parentFolderId: string) => ({
  id,
  name: id,
  parentFolderId,
  createdAt: AT,
});

export const link = (
  id: string,
  parentFolderId: string,
  entityKind: 'track' | 'loop' | 'playlist' | 'composite',
  entityId: string,
) => ({ id, parentFolderId, entityKind, entityId });

export const tree: RehearsalLibraryFileTree = {
  version: 1,
  rootFolderId: ROOT,
  folders: [
    { id: ROOT, name: 'Library', parentFolderId: null, createdAt: AT },
    folder('folder:messiah', ROOT),
    folder('folder:parts', 'folder:messiah'),
    folder('folder:other', ROOT),
  ],
  fileLinks: [
    link('k1', 'folder:parts', 'track', SOPRANO.id),
    link('k2', 'folder:parts', 'track', ALTO.id),
    link('k3', 'folder:other', 'track', OUTSIDE.id),
    link('k4', 'folder:other', 'track', SLOW.id),
    link('k5', 'folder:other', 'loop', 'loop-out'),
    link('k6', 'folder:messiah', 'loop', 'loop-in'),
    link('k7', ROOT, 'playlist', 'pl'),
    link('k8', 'folder:messiah', 'composite', 'comp-in'),
    link('k9', 'folder:other', 'composite', 'comp-mixed'),
    link('k10', 'folder:messiah', 'composite', 'comp-mixed'),
  ],
};

export const input = (): LibraryBundleInput => ({
  sources: [SOPRANO, ALTO, OUTSIDE, SLOW],
  loops: [
    loop('loop-in', SOPRANO, 'Entrance'),
    loop('loop-out', OUTSIDE, 'Far away'),
  ],
  playlists: [
    {
      id: 'pl',
      name: 'Tonight',
      items: [
        entry('e1', 'track', SOPRANO.id),
        entry('e2', 'track', OUTSIDE.id),
        entry('e3', 'loop', SOPRANO.id, 'loop-in'),
        entry('e4', 'composite', 'comp-in'),
      ],
      ownerId: 'local-device-user',
      createdAt: AT,
      updatedAt: AT,
    },
  ],
  composites: [
    composite('comp-in', [SOPRANO.id, ALTO.id]),
    composite('comp-mixed', [SOPRANO.id, OUTSIDE.id]),
  ],
  tree,
});
