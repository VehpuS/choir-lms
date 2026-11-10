import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseLibraryBundle,
  type LibraryBundle,
  type Recording,
} from '@org/audio-library-models';

import { buildLibraryBundle } from './library-bundle-builder.ts';
import { planLibraryBundleImport } from './library-bundle-import-plan.ts';
import {
  AT,
  AUTHOR,
  entry,
  input,
  SOPRANO,
} from './library-bundle-test-fixtures.ts';

const RECORDING_ID = 'rec-a';
const recording: Recording = {
  id: RECORDING_ID,
  name: 'Take 1',
  createdAt: AT,
  durationMs: 10_000,
  sampleRate: 44_100,
  sizeBytes: 1_000,
  appliedLatencyMs: 0,
  nudgeMs: 0,
  source: { driveFileId: 'd-sop', name: 'Soprano' },
  lineage: {
    track: { id: SOPRANO.id, driveFileId: 'd-sop', name: 'Soprano' },
  },
  shaping: { rate: 1, pitchSemitones: 0 },
  balance: 50,
  engineVersion: 1,
  markers: [],
  timeline: [],
};

const withRecordingEntry = () => {
  const library = input();

  return {
    ...library,
    playlists: [
      {
        ...library.playlists[0],
        items: [
          ...library.playlists[0].items,
          { ...entry('e5', 'track', SOPRANO.id), recordingId: RECORDING_ID },
        ],
      },
    ],
  };
};

const build = (selected: string[]) =>
  buildLibraryBundle({
    input: withRecordingEntry(),
    scope: { kind: 'library' },
    author: AUTHOR,
    createdAt: AT,
    recordings: [recording],
    selectedRecordingIds: new Set(selected),
  });

describe('playlist entries that play a recording', () => {
  it('are written with the bundle id of the included recording', () => {
    const { bundle, leftOutReferenceCount } = build([RECORDING_ID]);
    const entries = bundle.playlists[0].items;

    assert.equal(entries.at(-1)?.recordingId, 'r1');
    assert.equal(JSON.stringify(bundle).includes(RECORDING_ID), false);
    assert.equal(leftOutReferenceCount, 0);
  });

  it('stay left out and counted when the recording is not included', () => {
    const { bundle, leftOutReferenceCount } = build([]);

    assert.equal(
      bundle.playlists[0].items.some((item) => item.recordingId),
      false,
    );
    assert.equal(leftOutReferenceCount, 1);
  });

  it('are dropped, counting, when the bundle lacks the recording they name', () => {
    const { bundle } = build([RECORDING_ID]);
    const text = JSON.stringify({ ...bundle, recordings: [] });
    const parsed = parseLibraryBundle(text);

    assert.equal(parsed.status, 'ok');

    if (parsed.status === 'ok') {
      assert.equal(
        parsed.bundle.playlists[0].items.some((item) => item.recordingId),
        false,
      );
      assert.equal(parsed.dropped.playlistEntries, 1);
    }
  });

  it('survive the round trip and map to the ids restore will give the recording', () => {
    const parsed = parseLibraryBundle(
      JSON.stringify(build([RECORDING_ID]).bundle),
    );

    assert.equal(parsed.status, 'ok');

    const bundle = (parsed as { bundle: LibraryBundle }).bundle;
    const plan = planLibraryBundleImport({
      bundle,
      bundleName: 'b.json',
      destinationFolderId: 'folder:library-root',
      importId: 'imp1',
      importedAt: AT,
      ownerId: 'local-device-user',
      state: {
        entityCollections: {
          sources: [],
          loops: [],
          playlists: [],
          composites: [],
        },
        tree: {
          version: 1,
          rootFolderId: 'folder:library-root',
          folders: [],
          fileLinks: [],
        },
      },
    });
    const planned = plan.playlists[0].items.find((item) => item.recordingId);

    assert.equal(planned?.recordingId, plan.idMaps.recordings.r1);
    assert.equal(planned?.recordingId, 'recording:import:imp1:r1');
  });
});
