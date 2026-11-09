import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type DriveAudioSource,
} from '@org/audio-library-models';

import {
  applyAccessCheck,
  buildCopyList,
  buildOwnerMailto,
  formatAccessGuideTitle,
  formatFolderHint,
  getDriveFileOpenUrl,
  groupNeedsAccessSources,
} from './access-guide-model';

const AT = '2026-11-09T10:00:00.000Z';

const needing = (
  driveFileId: string,
  name: string,
  extra: Partial<DriveAudioSource> = {},
): DriveAudioSource => ({
  ...createDriveAudioSource({
    driveFileId,
    name,
    mimeType: 'audio/mpeg',
    createdAt: AT,
    availability: {
      status: 'unavailable',
      reason: 'needs-access',
      message: 'Can’t open this file. Ask the owner to share it with you.',
    },
  }),
  ...extra,
});

const folder = (id: string, name: string) => ({
  parentFolderId: id,
  parentFolderName: name,
  rootKind: 'shared' as const,
  path: [],
});

describe('groupNeedsAccessSources', () => {
  it('groups by recorded owner, files in name order, biggest group first', () => {
    const groups = groupNeedsAccessSources([
      needing('a', 'Zed', { owner: { name: 'Ann', email: 'ann@example.com' } }),
      needing('b', 'Alpha', {
        owner: { name: 'Ann', email: 'ann@example.com' },
      }),
      needing('c', 'Solo', {
        owner: { name: 'Bob', email: 'bob@example.com' },
      }),
    ]);

    assert.deepEqual(
      groups.map((g) => [g.ownerName, g.files.map((f) => f.name)]),
      [
        ['Ann', ['Alpha', 'Zed']],
        ['Bob', ['Solo']],
      ],
    );
    assert.equal(
      groups[0].files[0].url,
      'https://drive.google.com/file/d/b/view',
    );
  });

  it('falls back to the bundle author when no owner was recorded', () => {
    const [group] = groupNeedsAccessSources([
      needing('a', 'A', {
        importedFrom: {
          author: 'Dana',
          authorEmail: 'dana@example.com',
          bundleName: 'b',
          importedAt: AT,
        },
      }),
      needing('b', 'B', { owner: { name: 'Dana', email: 'dana@example.com' } }),
    ]);

    // The same person by email is one group, whichever way we learned it.
    assert.equal(group.files.length, 2);
    assert.equal(group.ownerEmail, 'dana@example.com');
  });

  it('marks an author fallback and ignores sources that do not need access', () => {
    const groups = groupNeedsAccessSources([
      needing('a', 'A', {
        importedFrom: { author: 'Dana', bundleName: 'b', importedAt: AT },
      }),
      { ...needing('b', 'B'), availability: { status: 'available' } },
    ]);

    assert.equal(groups.length, 1);
    assert.equal(groups[0].isAuthorFallback, true);
    assert.equal(groups[0].ownerEmail, undefined);
  });

  it('names the folder most of an owner’s files came from, once at least two did', () => {
    const owner = { name: 'Ann', email: 'ann@example.com' };
    const [group] = groupNeedsAccessSources([
      needing('a', 'A', {
        owner,
        sourceLocation: folder('f1', 'Soprano parts'),
      }),
      needing('b', 'B', {
        owner,
        sourceLocation: folder('f1', 'Soprano parts'),
      }),
      needing('c', 'C', { owner, sourceLocation: folder('f2', 'Other') }),
    ]);

    assert.equal(group.folderHint?.name, 'Soprano parts');
    assert.equal(group.folderHint?.fileCount, 2);
    assert.equal(
      group.folderHint?.url,
      'https://drive.google.com/drive/folders/f1',
    );
    assert.equal(
      formatFolderHint(group.folderHint as never),
      'These 2 are in “Soprano parts” — you can ask for the folder once.',
    );
  });

  it('gives no folder hint for a single file', () => {
    const [group] = groupNeedsAccessSources([
      needing('a', 'A', {
        owner: { name: 'Ann' },
        sourceLocation: folder('f1', 'Parts'),
      }),
    ]);

    assert.equal(group.folderHint, undefined);
  });
});

describe('owner message and copied list', () => {
  const [group] = groupNeedsAccessSources([
    needing('a', 'Soprano 1.mp3', {
      owner: { name: 'Ann', email: 'ann@example.com' },
    }),
    needing('b', 'Soprano 2.mp3', {
      owner: { name: 'Ann', email: 'ann@example.com' },
    }),
  ]);

  it('addresses the owner and lists the file names and links', () => {
    const mailto = buildOwnerMailto(group, 'Dana') as string;
    const body = decodeURIComponent(mailto.split('&body=')[1]);

    assert.equal(mailto.startsWith('mailto:ann%40example.com?subject='), true);
    assert.match(
      body,
      /Soprano 1\.mp3\nhttps:\/\/drive\.google\.com\/file\/d\/a\/view/,
    );
    assert.match(body, /Soprano 2\.mp3/);
    assert.match(body, /Thanks, Dana/);
  });

  it('offers no message when no email is known', () => {
    const [noEmail] = groupNeedsAccessSources([
      needing('a', 'A', { owner: { name: 'Ann' } }),
    ]);

    assert.equal(buildOwnerMailto(noEmail), null);
  });

  it('copies names and links for every group', () => {
    const text = buildCopyList(
      groupNeedsAccessSources([
        needing('a', 'A', { owner: { name: 'Ann', email: 'a@x.com' } }),
        needing('b', 'B', { owner: { name: 'Bob', email: 'b@x.com' } }),
      ]),
    );

    assert.match(
      text,
      /Ann\n\nA\nhttps:\/\/drive\.google\.com\/file\/d\/a\/view/,
    );
    assert.match(text, /Bob/);
  });

  it('never claims a cause in its wording', () => {
    const wording = [formatAccessGuideTitle(2), getDriveFileOpenUrl('x')].join(
      ' ',
    );

    assert.equal(/permission|revoked|deleted/i.test(wording), false);
    assert.equal(formatAccessGuideTitle(1), '1 file needs access');
  });
});

describe('applyAccessCheck', () => {
  const sources = [needing('a', 'A'), needing('b', 'B'), needing('c', 'C')];

  it('makes recovered files available again and keeps the rest listed', () => {
    const outcome = applyAccessCheck(
      sources,
      new Map([
        ['a', 'accessible'],
        ['b', 'needs-access'],
        ['c', 'unknown'],
      ]),
    );

    assert.deepEqual(
      outcome.updatedSources.map((s) => [s.driveFileId, s.availability]),
      [['a', { status: 'available' }]],
    );
    assert.equal(outcome.recoveredCount, 1);
    assert.equal(outcome.stillNeedingCount, 2);
  });

  it('keeps loops and links valid by leaving ids untouched', () => {
    const [updated] = applyAccessCheck(
      sources,
      new Map([['a', 'accessible']]),
    ).updatedSources;

    assert.equal(updated.id, sources[0].id);
  });
});
