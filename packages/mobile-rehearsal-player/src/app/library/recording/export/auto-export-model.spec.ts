import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRecordingFixture } from '../recording-fixtures';
import {
  getAutoExportGate,
  getAutoExportJobs,
  getRetryDelayMs,
  jobKey,
  shouldRetryAutomatically,
  type AutoExportSettings,
} from './auto-export-model';

const settings = (
  overrides: Partial<AutoExportSettings> = {},
): AutoExportSettings => ({
  eligibleFrom: null,
  enabled: true,
  folder: { folderId: 'f', folderName: 'Choir Recordings' },
  uploadOver: 'wifi',
  what: 'both',
  ...overrides,
});
const session = { accessToken: 'token', hasWriteAccess: true };
const gate = (over: Partial<Parameters<typeof getAutoExportGate>[0]> = {}) =>
  getAutoExportGate({
    connectionType: 'unknown',
    online: true,
    session,
    settings: settings(),
    ...over,
  });

describe('getAutoExportGate', () => {
  it('is ready with a folder, a session, a connection, and nothing reported as cellular', () => {
    assert.deepEqual(gate(), { state: 'ready' });
    assert.deepEqual(gate({ connectionType: 'wifi' }), { state: 'ready' });
    assert.deepEqual(gate({ connectionType: 'ethernet' }), { state: 'ready' });
  });

  it('holds for each missing condition, in the order the user can fix them', () => {
    assert.deepEqual(gate({ settings: settings({ enabled: false }) }), {
      reason: 'off',
      state: 'held',
    });
    assert.deepEqual(gate({ settings: settings({ folder: undefined }) }), {
      reason: 'no-folder',
      state: 'held',
    });
    assert.deepEqual(
      gate({ session: { accessToken: undefined, hasWriteAccess: false } }),
      { reason: 'no-session', state: 'held' },
    );
    assert.deepEqual(
      gate({ session: { accessToken: 'token', hasWriteAccess: false } }),
      { reason: 'no-session', state: 'held' },
    );
    assert.deepEqual(gate({ online: false }), {
      reason: 'offline',
      state: 'held',
    });
  });

  it('holds on a reported cellular connection only under Wi-Fi only', () => {
    assert.deepEqual(gate({ connectionType: 'cellular' }), {
      reason: 'cellular',
      state: 'held',
    });
    assert.deepEqual(
      gate({
        connectionType: 'cellular',
        settings: settings({ uploadOver: 'any' }),
      }),
      { state: 'ready' },
    );
  });
});

describe('getAutoExportJobs', () => {
  const recording = (id: string, createdAt: string, extra = {}) =>
    buildRecordingFixture({ createdAt, id, ...extra });
  const done = (kind: 'recording' | 'mix') => ({
    done: [
      {
        driveFileId: 'x',
        exportedAt: '',
        fileName: '',
        folderId: '',
        folderName: '',
        kind,
      },
    ],
    failed: [],
  });

  it('lists the recording alone before the mix, newest recording first', () => {
    const jobs = getAutoExportJobs(
      [
        recording('old', '2026-01-01T00:00:00.000Z'),
        recording('new', '2026-02-01T00:00:00.000Z'),
      ],
      settings(),
    );

    assert.deepEqual(
      jobs.map((job) => jobKey(job.recording.id, job.kind)),
      ['new:recording', 'new:mix', 'old:recording', 'old:mix'],
    );
  });

  it('skips kinds already on Drive, so only the missing mix is due', () => {
    const jobs = getAutoExportJobs(
      [
        recording('a', '2026-01-01T00:00:00.000Z', {
          exports: done('recording'),
        }),
      ],
      settings(),
    );

    assert.deepEqual(
      jobs.map((job) => job.kind),
      ['mix'],
    );
  });

  it('leaves out a kind with a recorded failure and a job still waiting to retry', () => {
    const failed = {
      done: [],
      failed: [{ failedAt: '', kind: 'mix' as const, reason: 'original' }],
    };
    const jobs = getAutoExportJobs(
      [recording('a', '2026-01-01T00:00:00.000Z', { exports: failed })],
      settings(),
      (key) => key === 'a:recording',
    );

    assert.deepEqual(jobs, []);
  });

  it('leaves recordings made before eligibleFrom alone, until every recording is eligible', () => {
    const recordings = [
      recording('old', '2026-01-01T00:00:00.000Z'),
      recording('new', '2026-03-01T00:00:00.000Z'),
    ];

    assert.deepEqual(
      new Set(
        getAutoExportJobs(
          recordings,
          settings({ eligibleFrom: '2026-02-01T00:00:00.000Z' }),
        ).map((job) => job.recording.id),
      ),
      new Set(['new']),
    );
    assert.equal(
      getAutoExportJobs(recordings, settings({ eligibleFrom: null })).length,
      4,
    );
  });

  it('is empty when nothing is wanted that is missing', () => {
    const both = {
      done: [...done('recording').done, ...done('mix').done],
      failed: [],
    };

    assert.deepEqual(
      getAutoExportJobs(
        [recording('a', '2026-01-01T00:00:00.000Z', { exports: both })],
        settings(),
      ),
      [],
    );
  });
});

describe('retry timing', () => {
  it('backs off 30 seconds, 2 minutes, 10 minutes, then hourly', () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5, 20].map(getRetryDelayMs),
      [30_000, 120_000, 600_000, 3_600_000, 3_600_000, 3_600_000],
    );
  });

  it('retries a lost connection or an unavailable Drive, but not a refusal', () => {
    assert.equal(shouldRetryAutomatically('offline'), true);
    assert.equal(shouldRetryAutomatically('unavailable'), true);
    for (const reason of [
      'quota',
      'folder-not-writable',
      'needs-write-access',
      'original',
      'too-large',
      'render',
      'recording-missing',
    ] as const) {
      assert.equal(shouldRetryAutomatically(reason), false);
    }
  });
});
