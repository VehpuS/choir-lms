import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';

import { buildRecordingFixture } from './recording-fixtures.js';
import {
  formatRecordedAt,
  formatRecordingsMenuCount,
  getRecordingsPanelModel,
  getRecordingsView,
  type RecordingsPanelInput,
} from './recordings-panel-model.js';

const NOW = new Date(2026, 0, 2, 15, 0);
const TRACK = {
  id: 'track-1',
  driveFileId: 'drive-1',
  name: 'Song.mp3',
  modifiedTime: 'v1',
} as DriveAudioSource;

const input = (
  overrides: Partial<RecordingsPanelInput> = {},
): RecordingsPanelInput => ({
  view: { kind: 'track', sourceId: 'track-1' },
  viewName: 'Song',
  recordings: [],
  library: {
    sources: [{ id: 'track-1' }, { id: 'adj-1' }],
    loops: [{ id: 'loop-1' }],
  },
  offline: { sources: [TRACK], stateOf: () => 'kept' },
  now: NOW,
  ...overrides,
});

const adjusted = {
  id: 'adj-1',
  name: 'Song (0.7×)',
  transform: { speed: { kind: 'multiplier', multiplier: 0.7 } },
} as never;
const loop = { id: 'loop-1', name: 'Chorus', startMs: 1000, endMs: 9000 };

describe('recordings panel model', () => {
  it('lists whole-track and segment recordings in the main section, newest first', () => {
    const model = getRecordingsPanelModel(
      input({
        recordings: [
          buildRecordingFixture({ id: 'a', createdAt: '2026-01-01T08:00:00Z' }),
          buildRecordingFixture({ id: 'b', createdAt: '2026-01-02T08:00:00Z' }),
        ],
      }),
    );

    assert.deepEqual(
      model.main.map((row) => row.id),
      ['b', 'a'],
    );
    assert.equal(model.mainTitle, 'This track');
    assert.equal(model.count, 2);
  });

  it('keeps a loop recording out of the main list and groups it under Loops', () => {
    const model = getRecordingsPanelModel(
      input({
        recordings: [
          buildRecordingFixture({
            id: 'l',
            lineage: {
              track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song' },
              loop,
            },
          }),
        ],
      }),
    );

    assert.equal(model.main.length, 0);
    assert.equal(model.loops.length, 1);
    assert.equal(model.loops[0]?.name, 'Chorus');
    assert.equal(model.loops[0]?.rows[0]?.tags[0]?.label, 'Loop · Chorus');
  });

  it('shows an adjusted-copy recording under the parent, labelled with the adjustment', () => {
    const rec = buildRecordingFixture({
      id: 'adj',
      shaping: { rate: 0.7, pitchSemitones: 2 },
      lineage: {
        track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song' },
        adjusted,
      },
    });
    const parent = getRecordingsPanelModel(input({ recordings: [rec] }));
    const copy = getRecordingsPanelModel(
      input({
        recordings: [rec],
        view: { kind: 'adjusted', sourceId: 'adj-1' },
      }),
    );

    assert.equal(parent.main[0]?.tags[0]?.label, '0.7×, +2');
    assert.equal(copy.main.length, 1);
    assert.equal(copy.mainTitle, 'This adjusted track');
  });

  it('lists a loop of an adjusted copy in both Loops sections and in the loop view', () => {
    const rec = buildRecordingFixture({
      id: 'al',
      lineage: {
        track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song' },
        adjusted,
        loop,
      },
    });
    const at = (view: RecordingsPanelInput['view']) =>
      getRecordingsPanelModel(input({ recordings: [rec], view }));

    assert.equal(at({ kind: 'track', sourceId: 'track-1' }).loops.length, 1);
    assert.equal(at({ kind: 'adjusted', sourceId: 'adj-1' }).loops.length, 1);
    assert.equal(at({ kind: 'loop', loopId: 'loop-1' }).main.length, 1);
    assert.equal(at({ kind: 'track', sourceId: 'track-1' }).main.length, 0);
  });

  it('shows only that loop’s recordings in a loop view', () => {
    const model = getRecordingsPanelModel(
      input({
        view: { kind: 'loop', loopId: 'loop-1' },
        recordings: [
          buildRecordingFixture({ id: 'plain' }),
          buildRecordingFixture({
            id: 'mine',
            lineage: {
              track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song' },
              loop,
            },
          }),
        ],
      }),
    );

    assert.deepEqual(
      model.main.map((row) => row.id),
      ['mine'],
    );
    assert.equal(model.loops.length, 0);
    assert.equal(model.mainTitle, 'This loop');
  });

  it('falls back to the parent once the adjusted copy is deleted', () => {
    const rec = buildRecordingFixture({
      lineage: {
        track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song' },
        adjusted,
      },
    });
    const model = getRecordingsPanelModel(
      input({
        recordings: [rec],
        library: { sources: [{ id: 'track-1' }], loops: [] },
      }),
    );

    assert.equal(model.main.length, 1);
  });

  it('describes a row with its span, length, size and speed and pitch', () => {
    const row = getRecordingsPanelModel(
      input({
        recordings: [
          buildRecordingFixture({
            markers: [{ name: 'Verse 2', positionMs: 38_000 }],
            shaping: { rate: 0.7, pitchSemitones: 0 },
          }),
        ],
      }),
    ).main[0];

    assert.equal(row?.detail, 'Verse 2 · 0:42 · 3.6 MB');
    assert.equal(row?.meta, 'Today · 0.7×');
  });

  it('says original speed when nothing was shaped', () => {
    const row = getRecordingsPanelModel(
      input({ recordings: [buildRecordingFixture()] }),
    ).main[0];

    assert.equal(row?.meta, 'Today · Original speed and pitch');
  });

  it('tags a recording whose track changed on Drive', () => {
    const row = getRecordingsPanelModel(
      input({
        recordings: [buildRecordingFixture()],
        offline: {
          sources: [{ ...TRACK, modifiedTime: 'v2' } as DriveAudioSource],
          stateOf: () => 'kept',
        },
      }),
    ).main[0];

    assert.deepEqual(
      row?.tags.map((tag) => tag.label),
      ['Original changed'],
    );
  });

  it('tags a recording whose track is neither cached nor kept as needing a connection', () => {
    const row = getRecordingsPanelModel(
      input({
        recordings: [buildRecordingFixture()],
        offline: { sources: [TRACK], stateOf: () => 'none' },
      }),
    ).main[0];

    assert.deepEqual(
      row?.tags.map((tag) => tag.label),
      ['Needs connection'],
    );
  });

  it('tags a punch recording', () => {
    const row = getRecordingsPanelModel(
      input({
        recordings: [
          buildRecordingFixture({
            punch: { inMs: 1000, outMs: 5000, preRollMs: 3000 },
          }),
        ],
      }),
    ).main[0];

    assert.equal(row?.tags[0]?.label, 'Punch');
  });

  it('offers the whole-track offline action for the row', () => {
    const row = getRecordingsPanelModel(
      input({ recordings: [buildRecordingFixture()] }),
    ).main[0];

    assert.equal(row?.offline.kind, 'remove');
  });

  it('is empty with a message when nothing was recorded', () => {
    const model = getRecordingsPanelModel(input());

    assert.equal(model.count, 0);
    assert.equal(model.emptyMessage, 'None yet.');
  });
});

describe('recordings view and menu count', () => {
  it('views a loop item by its loop, an adjusted copy by itself, a track by itself', () => {
    const source = { id: 's1' } as DriveAudioSource;

    assert.deepEqual(
      getRecordingsView({ kind: 'loop', loopId: 'l1', source }),
      { kind: 'loop', loopId: 'l1' },
    );
    assert.deepEqual(
      getRecordingsView({
        kind: 'track',
        source: { ...source, adjustment: {} as never },
      }),
      { kind: 'adjusted', sourceId: 's1' },
    );
    assert.deepEqual(getRecordingsView({ kind: 'track', source }), {
      kind: 'track',
      sourceId: 's1',
    });
  });

  it('shows a count only when there is something to count', () => {
    assert.equal(formatRecordingsMenuCount(0), undefined);
    assert.equal(formatRecordingsMenuCount(3), '3');
  });

  it('names today, yesterday and older days', () => {
    assert.equal(formatRecordedAt('2026-01-02T08:00:00', NOW), 'Today');
    assert.equal(formatRecordedAt('2026-01-01T20:00:00', NOW), 'Yesterday');
    assert.notEqual(formatRecordedAt('2025-12-01T08:00:00', NOW), 'Today');
    assert.equal(formatRecordedAt('not a date', NOW), '');
  });
});
