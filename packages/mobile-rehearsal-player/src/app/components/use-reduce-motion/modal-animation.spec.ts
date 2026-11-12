import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveModalAnimation } from './modal-animation';

describe('resolveModalAnimation', () => {
  it('keeps the transition when motion is not reduced', () => {
    assert.equal(resolveModalAnimation('slide', false), 'slide');
    assert.equal(resolveModalAnimation('fade', false), 'fade');
  });

  it('drops the transition when motion is reduced', () => {
    assert.equal(resolveModalAnimation('slide', true), 'none');
    assert.equal(resolveModalAnimation('fade', true), 'none');
  });

  it('leaves a modal with no transition as it is', () => {
    assert.equal(resolveModalAnimation('none', true), 'none');
    assert.equal(resolveModalAnimation(undefined, false), undefined);
  });
});
