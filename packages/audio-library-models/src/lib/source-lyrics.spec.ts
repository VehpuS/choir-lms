import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_LYRICS_LENGTH,
  createSourceLyrics,
  isLyricsTextWithinLimit,
  normalizeLyricsText,
  parseSourceLyrics,
  resolveLyricsOwner,
} from './source-lyrics.ts';

const UPDATED_AT = '2026-01-01T00:00:00.000Z';

describe('normalizeLyricsText', () => {
  it('unifies line endings and trims trailing whitespace', () => {
    assert.equal(
      normalizeLyricsText('Line one  \r\nLine two\t\rLine three\n'),
      'Line one\nLine two\nLine three',
    );
  });

  it('collapses runs of blank lines to a single blank line', () => {
    assert.equal(normalizeLyricsText('A\n\n\n\n\nB\n\nC'), 'A\n\nB\n\nC');
  });
});

describe('isLyricsTextWithinLimit', () => {
  it('accepts text at the limit and refuses text beyond it', () => {
    assert.equal(isLyricsTextWithinLimit('a'.repeat(MAX_LYRICS_LENGTH)), true);
    assert.equal(
      isLyricsTextWithinLimit('a'.repeat(MAX_LYRICS_LENGTH + 1)),
      false,
    );
  });
});

describe('createSourceLyrics', () => {
  it('stores normalized text with its origin and timestamp', () => {
    assert.deepEqual(
      createSourceLyrics({
        origin: 'typed',
        text: 'Hello  \r\nWorld',
        updatedAt: UPDATED_AT,
      }),
      { text: 'Hello\nWorld', origin: 'typed', updatedAt: UPDATED_AT },
    );
  });

  it('returns undefined for an empty body so the field is removed', () => {
    assert.equal(
      createSourceLyrics({
        origin: 'typed',
        text: ' \n\n ',
        updatedAt: UPDATED_AT,
      }),
      undefined,
    );
  });
});

describe('parseSourceLyrics', () => {
  it('reads a well-formed value', () => {
    assert.deepEqual(
      parseSourceLyrics({
        text: 'Words',
        updatedAt: UPDATED_AT,
        origin: 'looked-up',
      }),
      { text: 'Words', updatedAt: UPDATED_AT, origin: 'looked-up' },
    );
  });

  it('drops malformed values instead of throwing', () => {
    for (const value of [
      null,
      'text',
      42,
      { text: 1, updatedAt: UPDATED_AT, origin: 'typed' },
      { text: 'x', updatedAt: 3, origin: 'typed' },
      { text: 'x', updatedAt: UPDATED_AT, origin: 'pasted' },
      { text: '   ', updatedAt: UPDATED_AT, origin: 'typed' },
    ]) {
      assert.equal(parseSourceLyrics(value), undefined);
    }
  });

  it('truncates a body over the limit defensively', () => {
    const parsed = parseSourceLyrics({
      text: 'a'.repeat(MAX_LYRICS_LENGTH + 50),
      updatedAt: UPDATED_AT,
      origin: 'typed',
    });

    assert.equal(parsed?.text.length, MAX_LYRICS_LENGTH);
  });
});

describe('resolveLyricsOwner', () => {
  const track = { id: 'track' };
  const adjusted = { id: 'adjusted', adjustment: { sourceRef: 'track' } };
  const orphan = { id: 'orphan', adjustment: { sourceRef: 'gone' } };
  const sources = [track, adjusted, orphan];

  it('resolves a track to itself', () => {
    assert.equal(resolveLyricsOwner({ id: 'track' }, sources), track);
  });

  it('resolves an adjusted track to its source', () => {
    assert.equal(resolveLyricsOwner(adjusted, sources), track);
  });

  it('resolves a loop through its track', () => {
    assert.equal(
      resolveLyricsOwner({ id: 'loop', sourceId: 'track' }, sources),
      track,
    );
  });

  it('resolves a loop of an adjusted track to the adjusted track source', () => {
    assert.equal(
      resolveLyricsOwner({ id: 'loop', sourceId: 'adjusted' }, sources),
      track,
    );
  });

  it('returns null when the owner was deleted', () => {
    assert.equal(resolveLyricsOwner(orphan, sources), null);
    assert.equal(
      resolveLyricsOwner({ id: 'loop', sourceId: 'missing' }, sources),
      null,
    );
    assert.equal(
      resolveLyricsOwner({ id: 'loop', sourceId: 'orphan' }, sources),
      null,
    );
  });
});
