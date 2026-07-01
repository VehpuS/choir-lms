/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveModalSurfaceLayout } from './model.js';

describe('modal surface base model', () => {
  it('resolves centered modal layout', () => {
    assert.deepEqual(resolveModalSurfaceLayout('center'), {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    });
  });

  it('resolves bottom sheet layout', () => {
    assert.deepEqual(resolveModalSurfaceLayout('bottom'), {
      alignItems: 'stretch',
      justifyContent: 'flex-end',
      padding: 0,
    });
  });
});
