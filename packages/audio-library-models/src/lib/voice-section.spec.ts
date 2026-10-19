import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScorePart } from './score-parts.ts';
import {
  classifyVoiceSection,
  parseVoiceSection,
  partsForVoiceSection,
  type VoiceSection,
} from './voice-section.ts';

const part = (name: string, extra: Partial<ScorePart> = {}): ScorePart => ({
  id: name,
  index: 0,
  kind: 'vocal',
  name,
  ...extra,
});

describe('classifyVoiceSection', () => {
  const cases: ReadonlyArray<readonly [string, VoiceSection | undefined]> = [
    ['Soprano', 'soprano'],
    ['Soprano 1', 'soprano'],
    ['Sop.', 'soprano'],
    ['Alto', 'alto'],
    ['V7.0-Alto', 'alto'],
    ['Alto 2', 'alto'],
    ['Contralto', 'alto'],
    ['Tenor II', 'tenor'],
    ['Baritone', 'baritone'],
    ['Bari', 'baritone'],
    ['Bass', 'bass'],
    ['Basso', 'bass'],
    ['S', 'soprano'],
    ['A.', 'alto'],
    ['T 2', 'tenor'],
    ['B', 'bass'],
    ['Soprano/Alto', undefined],
    ['S/A', undefined],
    ['SATB', undefined],
    ['Voice', undefined],
    ['Track 1', undefined],
    ['Beatbox', undefined],
  ];

  for (const [name, expected] of cases) {
    it(`reads "${name}" as ${expected ?? 'no section'}`, () => {
      assert.equal(classifyVoiceSection(part(name)), expected);
    });
  }

  it('ignores an instrumental part even when its name has a voice word', () => {
    assert.equal(
      classifyVoiceSection(part('Alto Sax', { kind: 'instrumental' })),
      undefined,
    );
  });

  it('falls back to the instrument name when the part name is generic', () => {
    assert.equal(
      classifyVoiceSection(part('Part 2', { instrument: 'Tenor' })),
      'tenor',
    );
  });
});

describe('partsForVoiceSection', () => {
  it('returns the matching parts in score order', () => {
    const parts = [
      part('Soprano', { index: 0 }),
      part('Alto 1', { index: 1 }),
      part('Alto 2', { index: 2 }),
    ];

    assert.deepEqual(
      partsForVoiceSection(parts, 'alto').map(({ index }) => index),
      [1, 2],
    );
  });
});

describe('parseVoiceSection', () => {
  it('accepts a known section and rejects anything else', () => {
    assert.equal(parseVoiceSection('bass'), 'bass');
    assert.equal(parseVoiceSection('Bass'), undefined);
    assert.equal(parseVoiceSection(7), undefined);
  });
});
