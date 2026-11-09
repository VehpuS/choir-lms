import type { LibraryBundle } from './library-bundle.ts';

const CREATED_AT = '2026-11-09T10:00:00.000Z';

/**
 * A small valid bundle: two tracks, a loop, an adjusted track, a composite,
 * a playlist holding one of each playable kind, and a folder tree. Tests
 * start from it and damage one thing at a time.
 */
export const createLibraryBundleFixture = (): LibraryBundle => ({
  formatVersion: 1,
  createdAt: CREATED_AT,
  author: { name: 'Dana Director', email: 'dana@example.com' },
  scope: { kind: 'library' },
  sources: [
    {
      id: 'b-src-1',
      driveFileId: 'drive-1',
      name: 'Soprano',
      mimeType: 'audio/mpeg',
      durationMs: 60000,
      tags: ['Messiah'],
      owner: { name: 'Dana Director', email: 'dana@example.com' },
      createdAt: CREATED_AT,
    },
    {
      id: 'b-src-2',
      driveFileId: 'drive-2',
      name: 'Alto',
      mimeType: 'audio/mpeg',
      durationMs: 61000,
      createdAt: CREATED_AT,
    },
    {
      id: 'b-src-3',
      driveFileId: 'drive-1',
      name: 'Soprano • Slow',
      mimeType: 'audio/mpeg',
      adjustment: {
        sourceRef: 'b-src-1',
        sourceName: 'Soprano',
        transform: {
          pitchSemitones: 0,
          speedMultiplier: 0.8,
          tempoSource: 'multiplier',
        },
      },
      createdAt: CREATED_AT,
    },
  ],
  folders: [
    {
      id: 'b-fol-1',
      name: 'Messiah',
      parentFolderId: null,
      createdAt: CREATED_AT,
    },
    {
      id: 'b-fol-2',
      name: 'Parts',
      parentFolderId: 'b-fol-1',
      createdAt: CREATED_AT,
    },
  ],
  fileLinks: [
    {
      id: 'b-link-1',
      parentFolderId: 'b-fol-2',
      entityKind: 'track',
      entityId: 'b-src-1',
    },
    {
      id: 'b-link-2',
      parentFolderId: 'b-fol-2',
      entityKind: 'track',
      entityId: 'b-src-2',
    },
    {
      id: 'b-link-3',
      parentFolderId: 'b-fol-1',
      entityKind: 'loop',
      entityId: 'b-loop-1',
    },
    {
      id: 'b-link-4',
      parentFolderId: null,
      entityKind: 'playlist',
      entityId: 'b-pl-1',
    },
    {
      id: 'b-link-5',
      parentFolderId: 'b-fol-1',
      entityKind: 'composite',
      entityId: 'b-comp-1',
    },
  ],
  loops: [
    {
      id: 'b-loop-1',
      name: 'Bar 5 to 9',
      sourceId: 'b-src-1',
      sourceName: 'Soprano',
      startMs: 5000,
      endMs: 9000,
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
  ],
  playlists: [
    {
      id: 'b-pl-1',
      name: 'Tonight',
      items: [
        {
          id: 'b-ent-1',
          sortIndex: 0,
          kind: 'track',
          sourceId: 'b-src-1',
          title: 'Soprano',
          createdAt: CREATED_AT,
        },
        {
          id: 'b-ent-2',
          sortIndex: 1,
          kind: 'loop',
          sourceId: 'b-src-1',
          loopId: 'b-loop-1',
          title: 'Bar 5 to 9',
          createdAt: CREATED_AT,
        },
        {
          id: 'b-ent-3',
          sortIndex: 2,
          kind: 'composite',
          sourceId: 'b-comp-1',
          title: 'Messiah mix',
          createdAt: CREATED_AT,
        },
      ],
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
    },
  ],
  composites: [
    {
      id: 'b-comp-1',
      name: 'Messiah mix',
      stems: [
        {
          id: 'stem-1',
          trackId: 'b-src-1',
          name: 'Soprano',
          offsetMs: 0,
          mine: true,
        },
        {
          id: 'stem-2',
          trackId: 'b-src-2',
          name: 'Alto',
          offsetMs: 0,
          mine: false,
        },
      ],
      defaultMix: { levels: {} },
      presets: [],
      createdAt: CREATED_AT,
    },
  ],
});
