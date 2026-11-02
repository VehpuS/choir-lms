import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource, Recording } from '@org/audio-library-models';

import { buildRecordingFixture } from './recording-fixtures.js';
import {
  EMPTY_LIBRARY_MESSAGE,
  NO_MATCHES_MESSAGE,
  getRecordingsLibraryModel,
  type RecordingExportStatus,
  type RecordingsLibraryInput,
} from './recordings-library-model.js';

const NOW = new Date(2026, 0, 2, 15, 0);
const track = (id: string, name: string, modifiedTime = 'v1') =>
  ({ id, driveFileId: `drive-${id}`, name, modifiedTime }) as DriveAudioSource;
const lineageOf = (id: string, name: string) => ({
  track: { id, driveFileId: `drive-${id}`, name },
});

// A whole-track take of "Alpha", a segment of "Alpha", a loop take of "Beta".
const whole = buildRecordingFixture({
  id: 'whole',
  name: 'Full run',
  createdAt: '2026-01-01T10:00:00.000Z',
  durationMs: 240_000,
  lineage: lineageOf('a', 'Alpha.mp3'),
  source: {
    driveFileId: 'drive-a',
    name: 'Alpha.mp3',
    contentVersion: 'v1',
    durationMs: 240_000,
  },
  timeline: [
    {
      recordingStartMs: 0,
      recordingEndMs: 240_000,
      trackStartMs: 0,
      held: false,
    },
  ],
});
const segment = buildRecordingFixture({
  id: 'segment',
  name: 'Recording 2',
  createdAt: '2026-01-02T10:00:00.000Z',
  durationMs: 20_000,
  lineage: lineageOf('a', 'Alpha.mp3'),
  source: {
    driveFileId: 'drive-a',
    name: 'Alpha.mp3',
    contentVersion: 'v1',
    durationMs: 240_000,
  },
  markers: [
    { name: 'Bridge', positionMs: 100_000 },
    { name: 'Outro', positionMs: 230_000 },
  ],
  timeline: [
    {
      recordingStartMs: 0,
      recordingEndMs: 20_000,
      trackStartMs: 90_000,
      held: false,
    },
  ],
});
const loop = buildRecordingFixture({
  id: 'loop',
  name: 'Chorus take',
  createdAt: '2026-01-03T10:00:00.000Z',
  durationMs: 60_000,
  lineage: {
    ...lineageOf('b', 'Beta.mp3'),
    loop: { id: 'loop-1', name: 'Chorus', startMs: 10_000, endMs: 40_000 },
  },
  source: {
    driveFileId: 'drive-b',
    name: 'Beta.mp3',
    contentVersion: 'v1',
    durationMs: 200_000,
  },
});

const build = (overrides: Partial<RecordingsLibraryInput> = {}) =>
  getRecordingsLibraryModel({
    recordings: [whole, segment, loop],
    query: '',
    filters: {},
    sort: 'newest',
    offline: {
      sources: [track('a', 'Alpha.mp3'), track('b', 'Beta.mp3')],
      stateOf: () => 'kept',
    },
    exportStatusOf: () => 'none',
    now: NOW,
    ...overrides,
  });
const ids = (overrides: Partial<RecordingsLibraryInput> = {}) =>
  build(overrides).rows.map((row) => row.id);

describe('getRecordingsLibraryModel', () => {
  it('lists every recording newest first by default', () => {
    assert.deepEqual(ids(), ['loop', 'segment', 'whole']);
  });

  it('searches by recording name, track title and loop name', () => {
    assert.deepEqual(ids({ query: 'full run' }), ['whole']);
    assert.deepEqual(ids({ query: ' beta ' }), ['loop']);
    assert.deepEqual(ids({ query: 'chorus' }), ['loop']);
  });

  it('searches marker names only inside the span the recording covers', () => {
    assert.deepEqual(ids({ query: 'bridge' }), ['segment']);
    // "Outro" is on the track but outside the segment's 90–110 s span.
    assert.deepEqual(ids({ query: 'outro' }), []);
  });

  it('filters by kind', () => {
    assert.deepEqual(ids({ filters: { kind: 'loop' } }), ['loop']);
    assert.deepEqual(ids({ filters: { kind: 'whole' } }), ['whole']);
    assert.deepEqual(ids({ filters: { kind: 'segment' } }), ['segment']);
  });

  it('filters adjusted recordings', () => {
    const adjusted: Recording = {
      ...segment,
      id: 'adjusted',
      lineage: { ...segment.lineage, adjusted: { id: 'adj-1', name: 'Slow' } },
    } as Recording;

    assert.deepEqual(
      ids({ recordings: [segment, adjusted], filters: { kind: 'adjusted' } }),
      ['adjusted'],
    );
  });

  it('filters by Drive export status', () => {
    const status: Record<string, RecordingExportStatus> = {
      whole: 'on-drive',
      segment: 'failed',
    };
    const exportStatusOf = (id: string) => status[id] ?? 'none';

    assert.deepEqual(ids({ exportStatusOf, filters: { drive: 'on-drive' } }), [
      'whole',
    ]);
    assert.deepEqual(
      ids({ exportStatusOf, filters: { drive: 'not-on-drive' } }),
      ['loop', 'segment'],
    );
  });

  it('labels the export status on the row', () => {
    const model = build({
      exportStatusOf: (id) => (id === 'whole' ? 'pending' : 'none'),
    });

    assert.equal(
      model.rows.find((row) => row.id === 'whole')?.driveLabel,
      'Upload pending',
    );
    assert.equal(
      model.rows.find((row) => row.id === 'loop')?.driveLabel,
      undefined,
    );
  });

  it('filters to recordings whose original changed on Drive', () => {
    const offline = {
      sources: [track('a', 'Alpha.mp3', 'v2'), track('b', 'Beta.mp3')],
      stateOf: () => 'kept' as const,
    };

    assert.deepEqual(ids({ offline, filters: { originalChanged: true } }), [
      'segment',
      'whole',
    ]);
  });

  it('filters to recordings whose overlay needs a connection', () => {
    const offline = {
      sources: [track('a', 'Alpha.mp3'), track('b', 'Beta.mp3')],
      stateOf: (driveFileId: string) =>
        driveFileId === 'drive-b' ? ('none' as const) : ('kept' as const),
    };

    assert.deepEqual(ids({ offline, filters: { needsConnection: true } }), [
      'loop',
    ]);
  });

  it('filters to one track and combines filters', () => {
    assert.deepEqual(ids({ filters: { trackId: 'a' } }), ['segment', 'whole']);
    assert.deepEqual(ids({ filters: { trackId: 'a', kind: 'whole' } }), [
      'whole',
    ]);
  });

  it('sorts by track, length and name', () => {
    assert.deepEqual(ids({ sort: 'track' }), ['segment', 'whole', 'loop']);
    assert.deepEqual(ids({ sort: 'length' }), ['whole', 'loop', 'segment']);
    // Chorus take, Full run, Recording 2.
    assert.deepEqual(ids({ sort: 'name' }), ['loop', 'whole', 'segment']);
  });

  it('offers each track once with its recording count', () => {
    assert.deepEqual(build().trackOptions, [
      { trackId: 'a', name: 'Alpha.mp3', count: 2 },
      { trackId: 'b', name: 'Beta.mp3', count: 1 },
    ]);
  });

  it('counts active filters', () => {
    assert.equal(build().activeFilterCount, 0);
    assert.equal(
      build({ filters: { kind: 'loop', trackId: 'b', needsConnection: true } })
        .activeFilterCount,
      3,
    );
  });

  it('explains how to record when the library has none', () => {
    assert.equal(build({ recordings: [] }).emptyMessage, EMPTY_LIBRARY_MESSAGE);
  });

  it('says nothing matches when a search or filter removes every row', () => {
    const model = build({ query: 'zzz' });

    assert.equal(model.emptyMessage, NO_MATCHES_MESSAGE);
    assert.equal(model.total, 3);
  });

  it('has no empty message while rows are listed', () => {
    assert.equal(build().emptyMessage, null);
  });
});
