import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSliderKey, resolveSliderStep } from './model';

describe('resolveSliderStep', () => {
  it('moves one step in the given direction', () => {
    assert.equal(
      resolveSliderStep({
        current: 1,
        direction: 1,
        maximum: 2,
        minimum: 0.25,
        step: 0.05,
      }),
      1.05,
    );
    assert.equal(
      resolveSliderStep({
        current: 1,
        direction: -1,
        maximum: 2,
        minimum: 0.25,
        step: 0.05,
      }),
      0.95,
    );
  });

  it('uses a twentieth of the range for a continuous slider', () => {
    assert.equal(
      resolveSliderStep({ current: 0.5, direction: 1, maximum: 1, minimum: 0 }),
      0.55,
    );
  });

  it('stays within the bounds and does not accumulate float noise', () => {
    assert.equal(
      resolveSliderStep({ current: 1, direction: 1, maximum: 1, minimum: 0 }),
      1,
    );
    assert.equal(
      resolveSliderStep({ current: 0, direction: -1, maximum: 1, minimum: 0 }),
      0,
    );
    assert.equal(
      resolveSliderStep({
        current: 0.7,
        direction: 1,
        maximum: 1,
        minimum: 0,
        step: 0.1,
      }),
      0.8,
    );
  });
});

describe('resolveSliderKey', () => {
  it('maps arrows to a direction and Home / End to the ends', () => {
    assert.equal(resolveSliderKey('ArrowRight'), 1);
    assert.equal(resolveSliderKey('ArrowUp'), 1);
    assert.equal(resolveSliderKey('ArrowLeft'), -1);
    assert.equal(resolveSliderKey('ArrowDown'), -1);
    assert.equal(resolveSliderKey('Home'), 'start');
    assert.equal(resolveSliderKey('End'), 'end');
  });

  it('ignores other keys so typing and tabbing still work', () => {
    assert.equal(resolveSliderKey('Tab'), null);
    assert.equal(resolveSliderKey('a'), null);
  });
});
