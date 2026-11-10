import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchesDriveQuery, type DriveQueryFile } from './drive-query';

const ME = 'me@example.test';
const FOLDER = 'application/vnd.google-apps.folder';

const file = (overrides: Partial<DriveQueryFile> = {}): DriveQueryFile => ({
  mimeType: 'audio/mpeg',
  name: 'Alto Part.mp3',
  ownerEmails: [ME],
  parents: ['root'],
  ...overrides,
});

const matches = (query: string, target: DriveQueryFile = file()) =>
  matchesDriveQuery(query, target, ME);

describe('matchesDriveQuery', () => {
  it('matches the browse query the Add tab sends', () => {
    const query =
      "trashed = false and 'root' in parents and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'audio/')";

    assert.equal(matches(query), true);
    assert.equal(matches(query, file({ parents: ['other'] })), false);
    assert.equal(matches(query, file({ mimeType: FOLDER })), true);
    assert.equal(matches(query, file({ mimeType: 'image/png' })), false);
    assert.equal(matches(query, file({ trashed: true })), false);
  });

  it('matches names exactly and by substring, ignoring case in contains', () => {
    assert.equal(matches("name = 'Alto Part.mp3'"), true);
    assert.equal(matches("name = 'alto part.mp3'"), false);
    assert.equal(matches("name contains 'ALTO'"), true);
    assert.equal(matches("name contains 'bass'"), false);
  });

  it('unescapes quotes in a string', () => {
    assert.equal(
      matches("name = 'Mum\\'s Song'", file({ name: "Mum's Song" })),
      true,
    );
  });

  it('matches ownership and sharing', () => {
    assert.equal(matches("'me' in owners"), true);
    assert.equal(
      matches("'me' in owners", file({ ownerEmails: ['x@y.test'] })),
      false,
    );
    assert.equal(matches('sharedWithMe'), false);
    assert.equal(matches('sharedWithMe', file({ sharedWithMe: true })), true);
  });

  it('matches the property the bundles are marked with', () => {
    const query =
      "appProperties has { key='choirlmsBundle' and value='v1' } or (name contains 'choir-lms-' and mimeType = 'application/json')";

    assert.equal(
      matches(query, file({ appProperties: { choirlmsBundle: 'v1' } })),
      true,
    );
    assert.equal(
      matches(
        query,
        file({ mimeType: 'application/json', name: 'choir-lms-backup.json' }),
      ),
      true,
    );
    assert.equal(matches(query, file()), false);
  });

  it('reads and, or and parentheses with the usual precedence', () => {
    assert.equal(
      matches("name = 'x' or name = 'Alto Part.mp3' and 'root' in parents"),
      true,
    );
    assert.equal(
      matches("(name = 'x' or name = 'Alto Part.mp3') and 'nope' in parents"),
      false,
    );
  });

  it('throws on a query it does not understand', () => {
    assert.throws(
      () => matches("fullText contains 'x'"),
      /does not understand/,
    );
    assert.throws(() => matches("name = 'x' and"), /does not understand/);
  });
});
