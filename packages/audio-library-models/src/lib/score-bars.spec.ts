import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractScoreBars } from './score-bars.ts';

const measure = (number: string, inner = '', attributes = '') =>
  `<measure number="${number}"${attributes}>${inner}<note/></measure>`;

const rehearsal = (text: string) =>
  `<direction><direction-type><rehearsal>${text}</rehearsal></direction-type></direction>`;

const score = (...parts: string[]) =>
  `<score-partwise>${parts.map((part, index) => `<part id="P${index + 1}">${part}</part>`).join('')}</score-partwise>`;

describe('extractScoreBars', () => {
  it('counts the bars of the first part and keeps each printed number', () => {
    const bars = extractScoreBars(
      score(measure('1') + measure('2') + measure('3'), measure('1')),
    );

    assert.equal(bars.barCount, 3);
    assert.deepEqual(bars.barLabels, ['1', '2', '3']);
  });

  it('keeps a pickup numbered 0 and numbers the score skips', () => {
    const bars = extractScoreBars(
      score(measure('0', '', ' implicit="yes"') + measure('1') + measure('3')),
    );

    assert.deepEqual(bars.barLabels, ['0', '1', '3']);
    assert.equal(bars.barCount, 3);
  });

  it('falls back to the position when a bar has no number', () => {
    const bars = extractScoreBars(
      score('<measure><note/></measure><measure><note/></measure>'),
    );

    assert.deepEqual(bars.barLabels, ['1', '2']);
  });

  it('finds rehearsal marks and the bar each one sits on', () => {
    const bars = extractScoreBars(
      score(
        measure('1', rehearsal('A')) +
          measure('2') +
          measure('3', rehearsal('Chorus')),
      ),
    );

    assert.deepEqual(bars.rehearsalMarks, [
      { barIndex: 1, text: 'A' },
      { barIndex: 3, text: 'Chorus' },
    ]);
  });

  it('gathers marks from every part once, in bar order', () => {
    const bars = extractScoreBars(
      score(
        measure('1', rehearsal('A')) + measure('2'),
        measure('1', rehearsal('A')) + measure('2', rehearsal('B')),
      ),
    );

    assert.deepEqual(bars.rehearsalMarks, [
      { barIndex: 1, text: 'A' },
      { barIndex: 2, text: 'B' },
    ]);
  });

  it('decodes entities, trims text, and skips empty marks', () => {
    const bars = extractScoreBars(
      score(
        measure('1', rehearsal('  Verse &amp; Chorus ')) +
          measure('2', rehearsal('  ')),
      ),
    );

    assert.deepEqual(bars.rehearsalMarks, [
      { barIndex: 1, text: 'Verse & Chorus' },
    ]);
  });

  it('reads text with no parts as no bars and never throws', () => {
    assert.deepEqual(extractScoreBars('<score-timewise/>'), {
      barCount: 0,
      barLabels: [],
      rehearsalMarks: [],
    });
    assert.equal(extractScoreBars('not xml at all').barCount, 0);
  });
});
