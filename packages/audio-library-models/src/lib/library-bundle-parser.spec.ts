import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLibraryBundleFixture } from './library-bundle-fixtures.ts';
import type {
  LibraryBundle,
  LibraryBundleParseResult,
} from './library-bundle.ts';
import { parseLibraryBundle } from './library-bundle-parser.ts';
import { upgradeLibraryBundleRecord } from './library-bundle-upgrade.ts';

const parse = (
  value: unknown,
  options?: Parameters<typeof parseLibraryBundle>[1],
) => parseLibraryBundle(JSON.stringify(value), options);

const expectOk = (result: LibraryBundleParseResult) => {
  assert.equal(result.status, 'ok');

  return result as Extract<LibraryBundleParseResult, { status: 'ok' }>;
};

/** Applies `change` to a deep copy of the fixture, as raw JSON-shaped data. */
// Deliberately untyped: tests damage the fixture in ways the types forbid.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const damaged = (change: (bundle: Record<string, any>) => void) => {
  const raw = JSON.parse(JSON.stringify(createLibraryBundleFixture()));

  change(raw);

  return raw;
};

describe('parseLibraryBundle', () => {
  it('reads a valid bundle without dropping anything', () => {
    const result = expectOk(parse(createLibraryBundleFixture()));

    assert.equal(result.droppedTotal, 0);
    assert.deepEqual(result.bundle, createLibraryBundleFixture());
  });

  it('ignores fields it does not know', () => {
    const result = expectOk(
      parse(
        damaged((bundle) => {
          bundle.futureField = { a: 1 };
          bundle.sources[0].colour = 'red';
        }),
      ),
    );

    assert.equal(result.droppedTotal, 0);
    assert.equal('colour' in result.bundle.sources[0], false);
  });

  it('keeps recordings that resolve and drops, counting, those that do not', () => {
    const recording = (id: string, lineage: Record<string, string>) => ({
      id,
      name: 'Recording 1',
      createdAt: '2026-11-09T10:00:00.000Z',
      durationMs: 10000,
      sampleRate: 44100,
      sizeBytes: 882000,
      source: { driveFileId: 'drive-1', name: 'Soprano' },
      lineage,
      shaping: { rate: 1, pitchSemitones: 0 },
      balance: 50,
      markers: [],
      timeline: [
        {
          recordingStartMs: 0,
          recordingEndMs: 10000,
          trackStartMs: 0,
          held: false,
        },
      ],
      audio: { kind: 'drive', driveFileId: 'drive-rec', fileName: 'r.webm' },
    });
    const result = expectOk(
      parse(
        damaged((bundle) => {
          bundle.recordings = [
            recording('r1', { trackId: 'b-src-1', loopId: 'b-loop-1' }),
            recording('r2', { trackId: 'nowhere' }),
            recording('r3', { trackId: 'b-src-1', adjustedId: 'b-src-2' }),
            { id: 'r4' },
          ];
        }),
      ),
    );

    assert.deepEqual(
      result.bundle.recordings?.map((r) => r.id),
      ['r1'],
    );
    assert.deepEqual(result.bundle.recordings?.[0].audio, {
      kind: 'drive',
      driveFileId: 'drive-rec',
      fileName: 'r.webm',
    });
    assert.equal(result.dropped.recordings, 3);
  });

  it('drops a loop whose source is not in the bundle and counts it', () => {
    const result = expectOk(
      parse(damaged((bundle) => (bundle.loops[0].sourceId = 'nowhere'))),
    );

    assert.deepEqual(result.bundle.loops, []);
    assert.equal(result.dropped.loops, 1);
    // The playlist entry and file link that pointed at it go too.
    assert.equal(
      result.bundle.playlists[0].items.some((i) => i.kind === 'loop'),
      false,
    );
    assert.equal(result.dropped.playlistEntries, 1);
    assert.equal(result.dropped.fileLinks, 1);
    assert.equal(result.droppedTotal, 3);
  });

  it('drops an adjusted track whose original is missing', () => {
    const result = expectOk(
      parse(damaged((bundle) => bundle.sources.splice(0, 1))),
    );

    assert.equal(
      result.bundle.sources.some((s) => s.id === 'b-src-3'),
      false,
    );
    assert.equal(result.dropped.sources, 1);
  });

  it('removes a composite stem outside the bundle and drops the composite below two stems', () => {
    const result = expectOk(
      parse(damaged((bundle) => (bundle.sources = bundle.sources.slice(0, 1)))),
    );

    assert.deepEqual(result.bundle.composites, []);
    assert.equal(result.dropped.composites, 1);
  });

  it('keeps a composite that still has two resolvable stems', () => {
    const result = expectOk(
      parse(
        damaged((bundle) => {
          bundle.composites[0].stems.push({
            id: 'stem-3',
            trackId: 'gone',
            name: 'Bass',
            offsetMs: 0,
            mine: false,
          });
        }),
      ),
    );

    assert.equal(result.bundle.composites[0].stems.length, 2);
    assert.equal(result.dropped.composites, 0);
  });

  it('drops folders outside the tree, including cycles and missing parents', () => {
    const result = expectOk(
      parse(
        damaged((bundle) => {
          bundle.folders.push(
            {
              id: 'x',
              name: 'Orphan',
              parentFolderId: 'missing',
              createdAt: '',
            },
            { id: 'c1', name: 'Cycle A', parentFolderId: 'c2', createdAt: '' },
            { id: 'c2', name: 'Cycle B', parentFolderId: 'c1', createdAt: '' },
          );
        }),
      ),
    );

    assert.deepEqual(
      result.bundle.folders.map((f) => f.id),
      ['b-fol-1', 'b-fol-2'],
    );
    assert.equal(result.dropped.folders, 3);
  });

  it('drops malformed and duplicate entities instead of failing the bundle', () => {
    const result = expectOk(
      parse(
        damaged((bundle) => {
          bundle.sources.push({ id: 'b-src-9' }, 'junk', {
            ...bundle.sources[0],
          });
          bundle.loops.push({
            id: 'b-loop-2',
            name: 'Backwards',
            sourceId: 'b-src-1',
            startMs: 9,
            endMs: 3,
          });
        }),
      ),
    );

    assert.equal(result.bundle.sources.length, 3);
    assert.equal(result.dropped.sources, 3);
    assert.equal(result.dropped.loops, 1);
  });

  it('falls back to an unknown author and the whole-library scope', () => {
    const result = expectOk(
      parse(
        damaged((bundle) => {
          delete bundle.author;
          bundle.scope = 'weird';
        }),
      ),
    );

    assert.deepEqual(result.bundle.author, { name: 'Unknown' });
    assert.deepEqual(result.bundle.scope, { kind: 'library' });
  });

  it('keeps a folder scope with its name', () => {
    const result = expectOk(
      parse(
        damaged(
          (bundle) => (bundle.scope = { kind: 'folder', name: 'Messiah' }),
        ),
      ),
    );

    assert.deepEqual(result.bundle.scope, { kind: 'folder', name: 'Messiah' });
  });

  it('refuses a newer bundle without reading anything else', () => {
    const result = parseLibraryBundle(
      JSON.stringify({ formatVersion: 2, sources: 'not even a list' }),
    );

    assert.equal(result.status, 'refused');
    assert.equal(result.status === 'refused' && result.reason, 'newer-version');
    assert.match(
      result.status === 'refused' ? result.message : '',
      /Update the app/,
    );
  });

  it('refuses text that is not JSON', () => {
    const result = parseLibraryBundle('<html>nope</html>');

    assert.equal(result.status === 'refused' && result.reason, 'not-a-bundle');
    assert.match(
      result.status === 'refused' ? result.message : '',
      /not a Choir LMS bundle/,
    );
  });

  it('refuses JSON that is not a bundle', () => {
    for (const value of [
      [],
      null,
      'x',
      {},
      { formatVersion: 'one', sources: [] },
      { formatVersion: 1 },
      { formatVersion: 0, sources: [] },
    ]) {
      const result = parse(value);

      assert.equal(
        result.status === 'refused' && result.reason,
        'not-a-bundle',
      );
    }
  });

  it('upgrades an older bundle through its steps and reads it', () => {
    // A pretend version 0 called its tracks `tracks`; version 1 calls them `sources`.
    const olderFixture: Record<string, unknown> = JSON.parse(
      JSON.stringify(createLibraryBundleFixture()),
    );
    const { sources, ...rest } = olderFixture;
    const version0 = { ...rest, formatVersion: 0, tracks: sources };
    const options = {
      currentVersion: 1,
      upgradeSteps: {
        0: ({ tracks, ...record }: Record<string, unknown>) => ({
          ...record,
          sources: tracks,
        }),
      },
    };

    // Version 0 is below the supported minimum for real files, so prove the
    // chain through the step function directly and through a 1 → 2 upgrade.
    assert.equal(parse(version0, options).status, 'refused');

    const upgraded = upgradeLibraryBundleRecord(
      version0,
      0,
      options.upgradeSteps,
      1,
    );

    assert.equal(upgraded?.formatVersion, 1);
    assert.deepEqual(upgraded?.sources, sources);
  });

  it('upgrades a version 1 bundle when the app is at version 2', () => {
    const bundle: LibraryBundle = createLibraryBundleFixture();
    const result = expectOk(
      parse(bundle, {
        currentVersion: 2,
        upgradeSteps: {
          1: (record) => ({ ...record, author: { name: 'Upgraded' } }),
        },
      }),
    );

    assert.equal(result.bundle.formatVersion, 2);
    assert.equal(result.bundle.author.name, 'Upgraded');
    assert.equal(result.droppedTotal, 0);
  });

  it('refuses an older bundle when an upgrade step is missing', () => {
    const result = parse(createLibraryBundleFixture(), {
      currentVersion: 2,
      upgradeSteps: {},
    });

    assert.equal(result.status === 'refused' && result.reason, 'not-a-bundle');
  });
});
