import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPageControls,
  formatPageIndicator,
  stepPage,
} from './pdf-page-controls-model.js';

describe('formatPageIndicator', () => {
  it('counts pages from 1', () => {
    assert.equal(
      formatPageIndicator({ page: 2, pageCount: 81 }),
      'Page 3 of 81',
    );
    assert.equal(formatPageIndicator({ page: 0, pageCount: 1 }), 'Page 1 of 1');
  });
});

describe('stepPage', () => {
  it('moves one page and stops at either end', () => {
    assert.equal(stepPage({ page: 4, pageCount: 10 }, 1), 5);
    assert.equal(stepPage({ page: 4, pageCount: 10 }, -1), 3);
    assert.equal(stepPage({ page: 9, pageCount: 10 }, 1), 9);
    assert.equal(stepPage({ page: 0, pageCount: 10 }, -1), 0);
  });

  it('stays on the first page of an empty document', () => {
    assert.equal(stepPage({ page: 0, pageCount: 0 }, 1), 0);
  });
});

describe('buildPageControls', () => {
  it('shows nothing until the document has pages', () => {
    assert.deepEqual(buildPageControls(undefined, 'pages'), {
      canGoNext: false,
      canGoPrevious: false,
      indicator: undefined,
      showSteps: false,
    });
    assert.equal(
      buildPageControls({ page: 0, pageCount: 0 }, 'scroll').indicator,
      undefined,
    );
  });

  it('shows the indicator in every layout but the step buttons only in pages', () => {
    const state = { page: 2, pageCount: 81 };

    for (const layout of ['scroll', 'pages', 'strip'] as const) {
      assert.equal(buildPageControls(state, layout).indicator, 'Page 3 of 81');
    }

    assert.equal(buildPageControls(state, 'pages').showSteps, true);
    assert.equal(buildPageControls(state, 'scroll').showSteps, false);
    assert.equal(buildPageControls(state, 'strip').showSteps, false);
  });

  it('disables Previous on the first page and Next on the last', () => {
    const first = buildPageControls({ page: 0, pageCount: 5 }, 'pages');
    const middle = buildPageControls({ page: 2, pageCount: 5 }, 'pages');
    const last = buildPageControls({ page: 4, pageCount: 5 }, 'pages');

    assert.deepEqual([first.canGoPrevious, first.canGoNext], [false, true]);
    assert.deepEqual([middle.canGoPrevious, middle.canGoNext], [true, true]);
    assert.deepEqual([last.canGoPrevious, last.canGoNext], [true, false]);
  });

  it('disables both steps for a one-page document', () => {
    const controls = buildPageControls({ page: 0, pageCount: 1 }, 'pages');

    assert.deepEqual(
      [controls.showSteps, controls.canGoPrevious, controls.canGoNext],
      [true, false, false],
    );
  });
});
