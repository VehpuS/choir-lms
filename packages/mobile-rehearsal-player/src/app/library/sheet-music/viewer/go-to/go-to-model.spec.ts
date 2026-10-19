import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScorePart } from '@org/audio-library-models';

import {
  GO_TO_EMPTY_MESSAGE,
  buildGoToMarkRows,
  buildGoToPartRows,
  resolveBarInput,
} from './go-to-model';

describe('resolveBarInput', () => {
  const labels = ['0', '1', '2', '4', '4'];

  it('finds the bar by the number printed on the score', () => {
    assert.deepEqual(resolveBarInput(' 2 ', labels), {
      barIndex: 3,
      status: 'ok',
    });
    assert.deepEqual(resolveBarInput('0', labels), {
      barIndex: 1,
      status: 'ok',
    });
  });

  it('takes the first bar when a number repeats and ignores case', () => {
    assert.deepEqual(resolveBarInput('4', labels), {
      barIndex: 4,
      status: 'ok',
    });
    assert.deepEqual(resolveBarInput('12A', ['12a']), {
      barIndex: 1,
      status: 'ok',
    });
  });

  it('says so when there is no such bar, naming what was typed', () => {
    assert.deepEqual(resolveBarInput('3', labels), {
      message: 'There is no bar 3 in this score.',
      status: 'not-found',
    });
  });

  it('asks for a number when nothing was typed', () => {
    assert.deepEqual(resolveBarInput('   ', labels), {
      message: GO_TO_EMPTY_MESSAGE,
      status: 'empty',
    });
  });
});

describe('buildGoToMarkRows', () => {
  it('shows each mark with the bar number printed where it sits', () => {
    assert.deepEqual(
      buildGoToMarkRows(
        [
          { barIndex: 2, text: 'A' },
          { barIndex: 5, text: 'Chorus' },
        ],
        ['0', '1', '2', '3', '4'],
      ),
      [
        { barIndex: 2, detail: 'Bar 1', key: '2:A', label: 'A' },
        { barIndex: 5, detail: 'Bar 4', key: '5:Chorus', label: 'Chorus' },
      ],
    );
  });

  it('falls back to the position when a bar has no printed number', () => {
    assert.equal(
      buildGoToMarkRows([{ barIndex: 7, text: 'B' }], [])[0]?.detail,
      'Bar 7',
    );
  });
});

describe('buildGoToPartRows', () => {
  const part = (index: number, name: string): ScorePart => ({
    id: `P${index}`,
    index,
    kind: 'vocal',
    name,
  });

  it('lists the shown parts in staff order with their place from the top', () => {
    assert.deepEqual(
      buildGoToPartRows([part(0, 'Soprano'), part(2, 'Tenor')]),
      [
        { key: '0:Soprano', name: 'Soprano', position: 1 },
        { key: '2:Tenor', name: 'Tenor', position: 2 },
      ],
    );
  });
});
