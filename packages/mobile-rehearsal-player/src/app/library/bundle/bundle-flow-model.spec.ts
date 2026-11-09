import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveBundleListing } from '@org/google-drive';

import {
  buildImportRows,
  buildPhaseLines,
  buildRecordingPicker,
  buildRestoreRows,
  describeRecordingRestoreChoice,
  describeRecordingRestoreOutcome,
  describeReplaceConfirmation,
  describeShareLeftOut,
  formatBundleDate,
  readableBundleName,
  sumRecordingUploadBytes,
} from './bundle-flow-model';
import { recording } from './bundle-test-support';

const listing = (
  overrides: Partial<DriveBundleListing>,
): DriveBundleListing => ({
  id: 'x',
  name: 'choir-lms-backup-2026-11-09T1530.json',
  origin: 'mine',
  kind: 'backup',
  marked: true,
  modifiedTime: '2026-11-09T15:30:00.000Z',
  ...overrides,
});

describe('restore rows', () => {
  it('lists only the user’s own backups, tags the safety ones, and shows counts when stored', () => {
    const rows = buildRestoreRows([
      listing({ id: 'a', counts: { tracks: 46, loops: 12, playlists: 5 } }),
      listing({ id: 'b', kind: 'pre-restore' }),
      listing({ id: 'c', origin: 'shared', kind: 'share' }),
      listing({ id: 'd', kind: 'share' }),
    ]);

    assert.deepEqual(
      rows.map((r) => [r.id, r.tag]),
      [
        ['a', undefined],
        ['b', 'Undo'],
      ],
    );
    assert.equal(rows[0].meta, '46 tracks · 12 loops · 5 playlists');
    assert.match(rows[0].title, /^Backup · 9 Nov 2026, /);
    assert.match(rows[1].title, /^Before restore · /);
  });

  it('falls back to the size when no counts were stored', () => {
    assert.equal(
      buildRestoreRows([listing({ sizeBytes: 2048 })])[0].meta,
      '2 KB',
    );
  });
});

describe('import rows', () => {
  it('splits shared and own and names a share by its folder', () => {
    const rows = buildImportRows([
      listing({
        id: 's',
        origin: 'shared',
        kind: 'share',
        name: 'choir-lms-share-Messiah 2026-11-09T1530.json',
        owner: { name: 'Dana' },
      }),
      listing({ id: 'm' }),
    ]);

    assert.equal(rows.shared[0].title, 'Messiah');
    assert.match(rows.shared[0].meta, /^Dana · 9 Nov 2026/);
    assert.equal(rows.mine[0].meta.startsWith('Your backup'), true);
    assert.equal(
      readableBundleName('choir-lms-share-Soprano parts 2026-11-09T1530.json'),
      'Soprano parts',
    );
  });

  it('formats nothing for a missing date', () => {
    assert.equal(formatBundleDate(undefined), '');
  });
});

describe('recording picker', () => {
  const onDrive = recording('rec-b', {
    exports: {
      done: [
        {
          kind: 'recording',
          driveFileId: 'd',
          fileName: 'f',
          folderId: 'f',
          folderName: 'F',
          exportedAt: '',
        },
      ],
      failed: [],
    },
  });
  const local = recording('rec-a', { sizeBytes: 3_250_000 });

  it('preselects nothing and says no audio uploads', () => {
    const picker = buildRecordingPicker([local, onDrive], new Set());

    assert.equal(
      picker.rows.every((r) => !r.checked),
      true,
    );
    assert.equal(picker.totalLabel, 'No audio will be uploaded.');
  });

  it('totals only the audio that would upload', () => {
    assert.equal(
      buildRecordingPicker([local, onDrive], new Set(['rec-a'])).totalLabel,
      '3.1 MB of recording audio will be uploaded.',
    );
    assert.equal(
      buildRecordingPicker([local, onDrive], new Set(['rec-b'])).totalLabel,
      'Included. Already on Drive, so nothing extra uploads.',
    );
    assert.equal(
      buildRecordingPicker([local, onDrive], new Set(['rec-b'])).rows[1].detail,
      'On Drive already · no upload',
    );
  });
});

describe('share left-out card', () => {
  it('warns about gaps by default and says nothing is left out when included', () => {
    assert.deepEqual(
      describeShareLeftOut({
        includeOutside: false,
        leftOutReferenceCount: 4,
        outsideItemCount: 4,
      })?.tone,
      'warn',
    );
    assert.equal(
      describeShareLeftOut({
        includeOutside: true,
        leftOutReferenceCount: 4,
        outsideItemCount: 4,
      })?.headline,
      'Nothing is left out.',
    );
    assert.equal(
      describeShareLeftOut({
        includeOutside: false,
        leftOutReferenceCount: 0,
        outsideItemCount: 0,
      }),
      null,
    );
  });
});

describe('replace confirmation', () => {
  const counts = { tracks: 46, loops: 12, playlists: 5, recordings: 2 };

  it('names what is lost, what is in the backup and the safety backup', () => {
    const copy = describeReplaceConfirmation({
      counts,
      isOwn: true,
      authorName: 'Dana',
      uploadBytes: 12_400_000,
    });

    assert.match(copy.contents, /46 tracks, 12 loops, 5 playlists/);
    assert.match(
      copy.safety,
      /including all your recordings \(11\.8 MB to upload\)/,
    );
    assert.equal('fromLine' in copy, false);
    assert.equal(copy.confirmLabel, 'Back up, then replace');
  });

  it('names the author when the bundle is not the user’s own', () => {
    assert.equal(
      (
        describeReplaceConfirmation({
          counts,
          isOwn: false,
          authorName: 'Dana',
          uploadBytes: 0,
        }) as { fromLine?: string }
      ).fromLine,
      'It comes from Dana, not from you.',
    );
  });
});

describe('progress lines', () => {
  it('marks done, current and next steps, skipping recording audio when none is chosen', () => {
    assert.deepEqual(
      buildPhaseLines('backup', 'uploading', { includesRecordings: false }).map(
        (l) => l.state,
      ),
      ['done', 'done', 'now', 'next'],
    );
    assert.equal(
      buildPhaseLines('backup', 'folders', { includesRecordings: true }).length,
      5,
    );
    assert.deepEqual(
      buildPhaseLines('replace', 'replacing', { includesRecordings: true }).map(
        (l) => l.state,
      ),
      ['done', 'now', 'next'],
    );
    assert.deepEqual(
      buildPhaseLines('replace', 'replacing', {
        includesRecordings: false,
      }).map((l) => l.state),
      ['done', 'now'],
    );
  });
});

describe('upload size of the safety backup', () => {
  it('counts only recordings that have no Drive copy', () => {
    const onDrive = recording('rec-b', {
      sizeBytes: 9_000,
      exports: {
        done: [
          {
            kind: 'recording',
            driveFileId: 'd',
            fileName: 'f',
            folderId: 'f',
            folderName: 'F',
            exportedAt: '',
          },
        ],
        failed: [],
      },
    });

    assert.equal(
      sumRecordingUploadBytes([
        recording('rec-a', { sizeBytes: 1_000 }),
        onDrive,
        recording('rec-c', { sizeBytes: 2_000 }),
      ]),
      3_000,
    );
    assert.equal(sumRecordingUploadBytes([]), 0);
  });
});

describe('recording restore wording', () => {
  it('offers a checkbox where recordings can be restored, a note where not, and nothing when there are none', () => {
    const choice = describeRecordingRestoreChoice({
      count: 2,
      bytes: 3_250_000,
      supported: true,
    });

    assert.equal(choice?.kind, 'choice');
    assert.match(
      choice?.kind === 'choice' ? choice.title : '',
      /Also restore 2 recordings/,
    );
    assert.match(
      choice?.kind === 'choice' ? choice.detail : '',
      /3\.1 MB.*Off by default/,
    );
    assert.match(
      (
        describeRecordingRestoreChoice({
          count: 1,
          bytes: 1,
          supported: false,
        }) as { text: string }
      ).text,
      /1 recording in this file can’t be restored on this device yet/,
    );
    assert.equal(
      describeRecordingRestoreChoice({ count: 0, bytes: 0, supported: true }),
      null,
    );
  });

  it('summarises how many were restored and how many failed', () => {
    assert.equal(
      describeRecordingRestoreOutcome({
        restored: 2,
        alreadyHere: 1,
        failed: 1,
        cancelled: false,
      }),
      '3 recordings restored; 1 couldn’t be restored.',
    );
    assert.equal(describeRecordingRestoreOutcome(null), null);
    assert.equal(
      describeRecordingRestoreOutcome({
        restored: 0,
        alreadyHere: 0,
        failed: 0,
        cancelled: false,
      }),
      null,
    );
  });
});
