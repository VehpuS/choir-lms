import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPracticeToolsModel,
  type PracticeToolsInput,
} from './practice-tools-model.js';

const input = (overrides: Partial<PracticeToolsInput>): PracticeToolsInput => {
  return {
    piano: null,
    pitch: null,
    ...overrides,
  };
};

const rowIds = (overrides: Partial<PracticeToolsInput>) => {
  return getPracticeToolsModel(input(overrides)).rows.map((row) => row.id);
};

describe('practice tools model', () => {
  it('is absent when no tool is available', () => {
    const model = getPracticeToolsModel(input({}));

    assert.equal(model.isVisible, false);
    assert.deepEqual(model.rows, []);
  });

  it('lists a row per available tool, piano first', () => {
    assert.deepEqual(
      rowIds({ piano: { checked: false }, pitch: { checked: false } }),
      ['piano', 'pitch'],
    );
    assert.deepEqual(rowIds({ pitch: { checked: false } }), ['pitch']);
    assert.deepEqual(rowIds({ piano: { checked: false } }), ['piano']);
  });

  it('names each tool and its state for assistive technology', () => {
    const model = getPracticeToolsModel(
      input({ piano: { checked: true }, pitch: { checked: false } }),
    );

    assert.deepEqual(
      model.rows.map((row) => row.accessibilityLabel),
      ['Piano, on', 'Pitch detection, off'],
    );
    assert.equal(model.triggerLabel, 'Practice tools');
  });

  it('is active while any tool is on and idle otherwise', () => {
    const off = { piano: { checked: false }, pitch: { checked: false } };

    assert.equal(getPracticeToolsModel(input(off)).isActive, false);
    assert.equal(
      getPracticeToolsModel(input({ ...off, pitch: { checked: true } }))
        .isActive,
      true,
    );
  });

  it('never lists a setting as a row, whatever surface is open', () => {
    assert.deepEqual(
      rowIds({ piano: { checked: false }, pitch: { checked: false } }),
      ['piano', 'pitch'],
    );
  });
});
