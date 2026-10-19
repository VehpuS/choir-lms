import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_PART_PREFERENCES,
  PRESET_PART_NAMES,
  addPartPreferenceFirst,
  addPartPreferenceLast,
  hasPartPreference,
  matchPreferredParts,
  normalizePartName,
  removePartPreference,
  sanitizePartPreferences,
} from './part-preferences.ts';
import type { ScorePart } from './score-parts.ts';

const part = (
  name: string,
  index: number,
  kind: ScorePart['kind'] = 'vocal',
): ScorePart => ({ id: `P${index}`, index, kind, name });

const names = (parts: readonly ScorePart[]) => parts.map(({ name }) => name);

describe('normalizePartName', () => {
  it('ignores case, punctuation, and spacing but keeps digits', () => {
    assert.equal(normalizePartName('  Alto-2 '), 'alto 2');
    assert.equal(normalizePartName('ALTO   2'), 'alto 2');
    assert.notEqual(normalizePartName('Alto 1'), normalizePartName('Alto 2'));
  });
});

describe('preset part names', () => {
  it('lists the sections the user chose, Mezzo-soprano and Beatbox included', () => {
    assert.deepEqual(PRESET_PART_NAMES, [
      'Soprano',
      'Mezzo-soprano',
      'Alto',
      'Tenor',
      'Baritone',
      'Bass',
      'Beatbox',
    ]);
  });
});

describe('matchPreferredParts', () => {
  const choir = [
    part('Soprano', 0),
    part('Alto 1', 1),
    part('Alto 2', 2),
    part('Tenor', 3),
    part('Piano', 4, 'instrumental'),
  ];

  it('matches a whole name exactly, digits included', () => {
    assert.deepEqual(names(matchPreferredParts(choir, ['Alto 2'])), ['Alto 2']);
  });

  it('tries every name exactly before any name softly', () => {
    // `Alto` would match both altos softly, but `Tenor` matches exactly.
    assert.deepEqual(names(matchPreferredParts(choir, ['Alto', 'Tenor'])), [
      'Tenor',
    ]);
  });

  it('goes down the list in order within a pass', () => {
    assert.deepEqual(
      names(matchPreferredParts(choir, ['Bass', 'Tenor', 'Soprano'])),
      ['Tenor'],
    );
  });

  it('falls back to a soft match by section when nothing is exact', () => {
    assert.deepEqual(names(matchPreferredParts(choir, ['Alto'])), [
      'Alto 1',
      'Alto 2',
    ]);
  });

  it('matches softly by shared words, ignoring numbers', () => {
    const parts = [part('V7.0-Alto', 0), part('Lead Vocal 1', 1)];

    assert.deepEqual(names(matchPreferredParts(parts, ['Alto'])), [
      'V7.0-Alto',
    ]);
    assert.deepEqual(names(matchPreferredParts(parts, ['Lead'])), [
      'Lead Vocal 1',
    ]);
  });

  it('matches by preset alias', () => {
    const parts = [part('S.', 0), part('A.', 1)];

    assert.deepEqual(names(matchPreferredParts(parts, ['Alto'])), ['A.']);
    assert.deepEqual(names(matchPreferredParts(parts, ['Soprano'])), ['S.']);
  });

  it('matches Mezzo-soprano without matching Soprano', () => {
    const parts = [part('Soprano', 0), part('Mezzo Soprano', 1)];

    assert.deepEqual(names(matchPreferredParts(parts, ['Mezzo-soprano'])), [
      'Mezzo Soprano',
    ]);
    assert.deepEqual(names(matchPreferredParts(parts, ['Soprano'])), [
      'Soprano',
    ]);
  });

  it('never suggests an instrumental part softly, but honors naming it exactly', () => {
    const parts = [part('Solo Violin', 0, 'instrumental')];

    assert.deepEqual(matchPreferredParts(parts, ['Solo']), []);
    assert.deepEqual(names(matchPreferredParts(parts, ['solo violin'])), [
      'Solo Violin',
    ]);
  });

  it('returns nothing when no name matches or the list is empty', () => {
    assert.deepEqual(matchPreferredParts(choir, ['Lead']), []);
    assert.deepEqual(matchPreferredParts(choir, []), []);
  });
});

describe('part preference list helpers', () => {
  it('sanitizes: trims, drops blanks, non-strings, and duplicates, and caps the list', () => {
    assert.deepEqual(
      sanitizePartPreferences([' Alto ', 'alto', '', 7, 'Lead']),
      ['Alto', 'Lead'],
    );
    assert.deepEqual(sanitizePartPreferences('Alto'), []);
    assert.equal(
      sanitizePartPreferences(
        Array.from({ length: 20 }, (_, index) => `Part ${index}`),
      ).length,
      MAX_PART_PREFERENCES,
    );
  });

  it('puts a name first, moving it when already listed', () => {
    assert.deepEqual(addPartPreferenceFirst(['Alto', 'Lead'], 'lead'), [
      'lead',
      'Alto',
    ]);
    assert.deepEqual(addPartPreferenceFirst([], 'Alto 2'), ['Alto 2']);
  });

  it('adds a name last without moving an existing entry', () => {
    assert.deepEqual(addPartPreferenceLast(['Alto'], 'Lead'), ['Alto', 'Lead']);
    assert.deepEqual(addPartPreferenceLast(['Alto', 'Lead'], 'ALTO'), [
      'Alto',
      'Lead',
    ]);
  });

  it('removes and finds a name by normalized match', () => {
    assert.equal(hasPartPreference(['Alto 2'], 'alto-2'), true);
    assert.deepEqual(removePartPreference(['Alto 2', 'Lead'], 'ALTO 2'), [
      'Lead',
    ]);
  });
});
