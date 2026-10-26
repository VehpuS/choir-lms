import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPageSteps } from './page-steps.js';
import { buildPageControls } from './pdf-page-controls-model.js';

const TURN = { next: () => undefined, previous: () => undefined };

describe('buildPageSteps', () => {
  it('gives no steps where whole pages are not turned', () => {
    const controls = buildPageControls({ page: 2, pageCount: 81 }, 'scroll');

    assert.equal(buildPageSteps(controls, TURN), undefined);
  });

  it('follows the controls at the ends of the document', () => {
    const first = buildPageSteps(
      buildPageControls({ page: 0, pageCount: 5 }, 'pages'),
      TURN,
    );
    const last = buildPageSteps(
      buildPageControls({ page: 4, pageCount: 5 }, 'pages'),
      TURN,
    );

    assert.deepEqual([first?.canGoPrevious, first?.canGoNext], [false, true]);
    assert.deepEqual([last?.canGoPrevious, last?.canGoNext], [true, false]);
  });

  it('hands the turn functions through', () => {
    const turns: string[] = [];
    const steps = buildPageSteps(
      buildPageControls({ page: 2, pageCount: 5 }, 'pages'),
      {
        next: () => turns.push('next'),
        previous: () => turns.push('previous'),
      },
    );

    steps?.onNext();
    steps?.onPrevious();

    assert.deepEqual(turns, ['next', 'previous']);
  });
});
