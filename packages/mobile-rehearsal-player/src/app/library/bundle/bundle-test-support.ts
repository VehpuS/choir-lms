import {
  createDriveAudioSource,
  type Recording,
} from '@org/audio-library-models';
import type {
  LibraryBundleInput,
  ReplacementLibraryState,
} from '@org/audio-library-runtime';

import type {
  BundleDriveApi,
  BundleServiceDependencies,
} from './bundle-service-types';

export const AT = '2026-11-09T10:00:00.000Z';
export const ROOT = 'folder:library-root';
export const NOW = new Date('2026-11-09T15:30:00.000Z');

const source = (driveFileId: string, name: string) =>
  createDriveAudioSource({
    driveFileId,
    name,
    mimeType: 'audio/mpeg',
    durationMs: 60_000,
    createdAt: AT,
    availability: { status: 'available' },
  });

export const SOPRANO = source('d-sop', 'Soprano');
export const ALTO = source('d-alt', 'Alto');

export const libraryInput = (): LibraryBundleInput => ({
  sources: [SOPRANO, ALTO],
  loops: [
    {
      id: 'loop-1',
      name: 'Entrance',
      sourceId: SOPRANO.id,
      sourceName: 'Soprano',
      startMs: 1000,
      endMs: 5000,
      ownerId: 'local-device-user',
      createdAt: AT,
      updatedAt: AT,
    },
  ],
  playlists: [],
  composites: [],
  tree: {
    version: 1,
    rootFolderId: ROOT,
    folders: [
      { id: ROOT, name: 'Library', parentFolderId: null, createdAt: AT },
      {
        id: 'folder:messiah',
        name: 'Messiah',
        parentFolderId: ROOT,
        createdAt: AT,
      },
    ],
    fileLinks: [
      {
        id: 'k1',
        parentFolderId: 'folder:messiah',
        entityKind: 'track',
        entityId: SOPRANO.id,
      },
      {
        id: 'k2',
        parentFolderId: 'folder:messiah',
        entityKind: 'track',
        entityId: ALTO.id,
      },
      {
        id: 'k3',
        parentFolderId: 'folder:messiah',
        entityKind: 'loop',
        entityId: 'loop-1',
      },
    ],
  },
});

export const recording = (
  id: string,
  overrides: Partial<Recording> = {},
): Recording => ({
  id,
  name: 'Take',
  createdAt: AT,
  durationMs: 10_000,
  sampleRate: 44_100,
  sizeBytes: 1_000,
  appliedLatencyMs: 0,
  nudgeMs: 0,
  source: { driveFileId: 'd-sop', name: 'Soprano' },
  lineage: { track: { id: SOPRANO.id, driveFileId: 'd-sop', name: 'Soprano' } },
  shaping: { rate: 1, pitchSemitones: 0 },
  balance: 50,
  engineVersion: 1,
  markers: [],
  timeline: [],
  ...overrides,
});

export type FakeDriveLog = {
  uploads: { name: string; folderId: string; json?: string }[];
  audio: string[];
  pruneCalls: { protectedIds: string[] }[];
};

type FakeDriveOptions = {
  failUpload?: 'quota' | 'offline';
  /** Drive file ids the probe reports as needing access. */
  needsAccess?: string[];
  listing?: Awaited<ReturnType<BundleDriveApi['list']>>;
  readText?: string;
  unknownProbe?: string[];
};

export const createFakeDrive = (options: FakeDriveOptions = {}) => {
  const log: FakeDriveLog = { uploads: [], audio: [], pruneCalls: [] };
  let counter = 0;
  const drive: BundleDriveApi = {
    ensureFolders: async () => ({
      status: 'ready',
      folders: {
        root: { id: 'root', name: 'Choir LMS' },
        backups: { id: 'backups', name: 'Backups' },
        shares: { id: 'shares', name: 'Shares' },
      },
    }),
    uploadBundle: async ({ name, folderId, json }) => {
      if (options.failUpload) {
        return { status: 'failed', reason: options.failUpload };
      }

      log.uploads.push({ name, folderId, json });
      counter += 1;

      return { status: 'uploaded', file: { id: `file-${counter}`, name } };
    },
    uploadAudio: async ({ name }) => {
      log.audio.push(name);
      counter += 1;

      return { status: 'uploaded', file: { id: `audio-${counter}`, name } };
    },
    list: async () => options.listing ?? { status: 'ok', bundles: [] },
    read: async () => ({ status: 'ok', text: options.readText ?? '' }),
    prune: async ({ protectedIds }) => {
      log.pruneCalls.push({ protectedIds: [...(protectedIds ?? [])] });

      return { status: 'ok', removedIds: ['old-1'] };
    },
    probe: async (fileIds) => ({
      aborted: false,
      access: new Map(
        fileIds.map((id) => [
          id,
          options.unknownProbe?.includes(id)
            ? ('unknown' as const)
            : options.needsAccess?.includes(id)
              ? ('needs-access' as const)
              : ('accessible' as const),
        ]),
      ),
    }),
    currentUser: async () => ({ name: 'Dana', email: 'dana@example.com' }),
    owners: async () =>
      new Map([['d-alt', { name: 'Ann', email: 'ann@example.com' }]]),
  };

  return { drive, log };
};

export const createFakeDependencies = (
  options: FakeDriveOptions & {
    recordings?: Recording[];
    input?: LibraryBundleInput;
  } = {},
) => {
  const { drive, log } = createFakeDrive(options);
  const calls = {
    replace: [] as ReplacementLibraryState[],
    entities: [] as unknown[],
    tree: [] as unknown[],
    changed: 0,
  };
  const deps: BundleServiceDependencies = {
    drive,
    now: () => NOW,
    createId: () => 'import-1',
    library: {
      ownerId: 'local-device-user',
      load: async () => options.input ?? libraryInput(),
      recordings: async () => options.recordings ?? [],
      readRecordingAudio: async () => new Uint8Array([1, 2, 3]),
      onLibraryChanged: async () => {
        calls.changed += 1;
      },
      repository: {
        importLibraryEntities: async (_owner, entities) => {
          calls.entities.push(entities);
        },
        importLibraryTreeNodes: async (_owner, nodes) => {
          calls.tree.push(nodes);
        },
        replaceLibrary: async (_owner, state) => {
          calls.replace.push(state);

          return { removedSourceIds: ['gone'] };
        },
      },
    },
  };

  return { deps, log, calls };
};
