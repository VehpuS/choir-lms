import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeLyricsOwner,
  describeStemsWithoutLyrics,
  resolveCompositeLyrics,
} from './composite-lyrics-model';

const track = (id: string, name: string, lyrics?: string) =>
  ({ id, name, ...(lyrics ? { lyrics: { text: lyrics } } : {}) }) as never;
const composite = (lyricsStemId?: string) => ({
  id: 'c1',
  lyricsStemId,
  stems: [
    { id: 's1', trackId: 't1', name: 'Soprano', offsetMs: 0, mine: false },
    { id: 's2', trackId: 't2', name: 'Alto', offsetMs: 0, mine: false },
    { id: 's3', trackId: 't3', name: 'Tenor', offsetMs: 0, mine: false },
  ],
});

describe('resolveCompositeLyrics', () => {
  it('offers a picker of the stems with lyrics and says which have none', () => {
    const result = resolveCompositeLyrics(composite(), [
      track('t1', 'Sop.m4a', 'la la'),
      track('t2', 'Alto.m4a', 'da da'),
      track('t3', 'Ten.m4a'),
    ]);

    assert.equal(result.composite.showPicker, true);
    assert.deepEqual(
      result.composite.choices.map(({ name }) => name),
      ['Soprano', 'Alto'],
    );
    assert.deepEqual(result.composite.withoutLyricsNames, ['Tenor']);
    assert.equal(result.lyrics?.text, 'la la');
  });

  it('shows the remembered stem', () => {
    const result = resolveCompositeLyrics(composite('s2'), [
      track('t1', 'Sop.m4a', 'la la'),
      track('t2', 'Alto.m4a', 'da da'),
      track('t3', 'Ten.m4a'),
    ]);

    assert.equal(result.lyrics?.text, 'da da');
    assert.equal(result.owner?.id, 't2');
    assert.equal(result.composite.stemName, 'Alto');
  });

  it('shows no picker when one stem has lyrics', () => {
    const result = resolveCompositeLyrics(composite(), [
      track('t1', 'Sop.m4a', 'la la'),
      track('t2', 'Alto.m4a'),
      track('t3', 'Ten.m4a'),
    ]);

    assert.equal(result.composite.showPicker, false);
    assert.equal(result.lyrics?.text, 'la la');
  });

  it('lets the user choose a stem to add lyrics to when none has any', () => {
    const result = resolveCompositeLyrics(composite('s3'), [
      track('t1', 'Sop.m4a'),
      track('t2', 'Alto.m4a'),
      track('t3', 'Ten.m4a'),
    ]);

    assert.equal(result.composite.isChoosingWhereToAdd, true);
    assert.equal(result.composite.choices.length, 3);
    assert.equal(result.owner?.id, 't3');
    assert.equal(result.lyrics, undefined);
  });

  it('has no owner when every stem’s track is gone', () => {
    const result = resolveCompositeLyrics(composite(), []);

    assert.equal(result.owner, null);
    assert.equal(result.composite.showPicker, false);
  });
});

describe('lyrics wording', () => {
  it('names the stem and its track', () => {
    const result = resolveCompositeLyrics(composite(), [
      track('t1', 'Sop.m4a', 'la'),
      track('t2', 'Alto.m4a'),
      track('t3', 'Ten.m4a'),
    ]);

    assert.equal(
      describeLyricsOwner(result.owner?.name ?? '', result.composite.stemName),
      'Soprano (Sop.m4a)',
    );
    assert.equal(describeLyricsOwner('Sop.m4a'), 'Sop.m4a');
  });

  it('words the stems without lyrics', () => {
    assert.equal(describeStemsWithoutLyrics(['Bass']), 'Bass has none');
    assert.equal(
      describeStemsWithoutLyrics(['Alto', 'Tenor', 'Bass']),
      'Alto, Tenor and Bass have none',
    );
  });
});
