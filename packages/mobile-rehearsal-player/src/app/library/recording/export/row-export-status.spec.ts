import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RecordingExports } from '@org/audio-library-models';

import { buildRecordingFixture } from '../recording-fixtures';
import type { AutoExportSettings } from './auto-export-model';
import { DEFAULT_AUTO_EXPORT_SETTINGS } from './auto-export-settings';
import { getExportKindLines, getRowExportStatus } from './row-export-status';

const SINCE = '2026-11-03T00:00:00.000Z';
const on = (
  overrides: Partial<AutoExportSettings> = {},
): AutoExportSettings => ({
  ...DEFAULT_AUTO_EXPORT_SETTINGS,
  eligibleFrom: SINCE,
  enabled: true,
  folder: { folderId: 'f', folderName: 'Choir Recordings' },
  ...overrides,
});
const NEW = '2026-11-03T12:00:00.000Z';
const OLD = '2026-10-01T00:00:00.000Z';
const copy = (kind: 'recording' | 'mix') => ({
  driveFileId: 'x',
  exportedAt: NEW,
  fileName: `Song - Recording 1${kind === 'mix' ? ' (mix)' : ''}.wav`,
  folderId: 'f',
  folderName: 'Choir Recordings',
  kind,
});
const rec = (createdAt: string, exports?: RecordingExports) =>
  buildRecordingFixture({ createdAt, exports });

describe('getRowExportStatus', () => {
  it('is none for a recording with nothing exported, whatever the setting', () => {
    assert.equal(
      getRowExportStatus(rec(NEW), DEFAULT_AUTO_EXPORT_SETTINGS),
      'none',
    );
    assert.equal(getRowExportStatus(rec(OLD), on()), 'none');
  });

  it('is pending while a wanted kind is missing for a recording the setting covers', () => {
    assert.equal(getRowExportStatus(rec(NEW), on()), 'pending');
    assert.equal(
      getRowExportStatus(
        rec(NEW, { done: [copy('recording')], failed: [] }),
        on({ what: 'both' }),
      ),
      'pending',
    );
  });

  it('is on-drive once every wanted kind is there, and for any copy when it does not cover the recording', () => {
    assert.equal(
      getRowExportStatus(
        rec(NEW, { done: [copy('recording')], failed: [] }),
        on(),
      ),
      'on-drive',
    );
    assert.equal(
      getRowExportStatus(rec(OLD, { done: [copy('mix')], failed: [] }), on()),
      'on-drive',
    );
    assert.equal(
      getRowExportStatus(
        rec(NEW, { done: [copy('mix')], failed: [] }),
        DEFAULT_AUTO_EXPORT_SETTINGS,
      ),
      'on-drive',
    );
  });

  it('is failed when a wanted kind failed, and ignores a failure for a kind not wanted', () => {
    const failed: RecordingExports = {
      done: [copy('recording')],
      failed: [{ failedAt: NEW, kind: 'mix', reason: 'original' }],
    };

    assert.equal(
      getRowExportStatus(rec(NEW, failed), on({ what: 'both' })),
      'failed',
    );
    assert.equal(
      getRowExportStatus(rec(NEW, failed), on({ what: 'recording' })),
      'on-drive',
    );
  });
});

describe('getExportKindLines', () => {
  it('lists each wanted kind with where it went, why it failed, or that it waits', () => {
    const lines = getExportKindLines(
      rec(NEW, {
        done: [copy('recording')],
        failed: [{ failedAt: NEW, kind: 'mix', reason: 'original' }],
      }),
      on({ what: 'both' }),
    );

    assert.deepEqual(
      lines.map((line) => [line.kind, line.state, line.canRetry]),
      [
        ['recording', 'on-drive', false],
        ['mix', 'failed', true],
      ],
    );
    assert.equal(
      lines[0]?.detail,
      'Song - Recording 1.wav in Choir Recordings',
    );
    assert.match(lines[1]?.detail ?? '', /original track could not be fetched/);
    assert.equal(
      getExportKindLines(rec(NEW), on({ what: 'mix' }))[0]?.detail,
      'Waiting to upload.',
    );
  });

  it('lists only what reached Drive when the setting does not cover the recording', () => {
    assert.deepEqual(getExportKindLines(rec(OLD), on()), []);
    assert.equal(
      getExportKindLines(rec(OLD, { done: [copy('mix')], failed: [] }), on())[0]
        ?.kind,
      'mix',
    );
  });

  it('describes a failure reason it does not know in general words', () => {
    const lines = getExportKindLines(
      rec(NEW, {
        done: [],
        failed: [
          { failedAt: NEW, kind: 'recording', reason: 'from-the-future' },
        ],
      }),
      on(),
    );

    assert.equal(lines[0]?.detail, 'The export did not complete.');
  });
});
