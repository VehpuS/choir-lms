import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePartSelection } from '@org/audio-library-models';
import { extractScoreParts } from '@org/audio-library-models';

import { resolveVisibilityFlags } from './part-visibility.js';

const PIANO_VOCAL = `<score-partwise><part-list>
<score-part id="P1"><part-name>Soprano</part-name></score-part>
<score-part id="P2"><part-name>Piano</part-name></score-part>
<score-part id="P3"><part-name>Alto</part-name></score-part>
</part-list></score-partwise>`;

describe('resolveVisibilityFlags', () => {
  const parts = extractScoreParts(PIANO_VOCAL);

  it('hides instrumental parts for the default vocal selection', () => {
    assert.deepEqual(
      resolveVisibilityFlags(parts, resolvePartSelection(parts, undefined)),
      [true, false, true],
    );
  });

  it('shows everything for all, and only the chosen parts for a saved list', () => {
    assert.deepEqual(
      resolveVisibilityFlags(parts, resolvePartSelection(parts, 'all')),
      [true, true, true],
    );
    assert.deepEqual(
      resolveVisibilityFlags(
        parts,
        resolvePartSelection(parts, { include: ['1:Piano'] }),
      ),
      [false, true, false],
    );
  });
});
