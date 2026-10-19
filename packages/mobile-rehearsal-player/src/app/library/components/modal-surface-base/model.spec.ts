/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveKeyboardAvoidingBehavior,
  resolveModalSurfaceLayout,
  resolveModalSurfaceMaxHeight,
} from './model.js';

describe('modal surface base model', () => {
  it('resolves centered modal layout', () => {
    assert.deepEqual(resolveModalSurfaceLayout('center'), {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    });
  });

  it('resolves bottom sheet layout', () => {
    assert.deepEqual(resolveModalSurfaceLayout('bottom'), {
      alignItems: 'stretch',
      justifyContent: 'flex-end',
      padding: 0,
    });
  });

  it('caps every surface below the screen height so its scroll area can shrink', () => {
    assert.equal(resolveModalSurfaceMaxHeight('bottom'), '92%');
    assert.equal(resolveModalSurfaceMaxHeight('center'), '88%');
  });

  it('lifts a surface above the keyboard on iOS only', () => {
    assert.equal(resolveKeyboardAvoidingBehavior('ios'), 'padding');
    assert.equal(resolveKeyboardAvoidingBehavior('android'), undefined);
    assert.equal(resolveKeyboardAvoidingBehavior('web'), undefined);
  });
});
