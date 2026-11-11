/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveKeyboardAvoidingBehavior,
  resolveModalSurfaceLayout,
  resolveModalSurfaceMaxHeight,
  resolveSideSheetSurfaceStyle,
  SIDE_SHEET_WIDTH,
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

  it('resolves the side sheet against the trailing edge, from the top', () => {
    assert.deepEqual(resolveModalSurfaceLayout('bottom', 'side-sheet'), {
      alignItems: 'flex-end',
      justifyContent: 'flex-start',
      padding: 0,
    });
  });

  it('lets a side sheet use the whole height, at a fixed width', () => {
    assert.equal(resolveModalSurfaceMaxHeight('bottom', 'side-sheet'), '100%');
    assert.deepEqual(resolveSideSheetSurfaceStyle(), {
      height: '100%',
      maxWidth: '100%',
      width: SIDE_SHEET_WIDTH,
    });
  });

  it('keeps the default presentation for the other placements', () => {
    assert.deepEqual(
      resolveModalSurfaceLayout('bottom', 'default'),
      resolveModalSurfaceLayout('bottom'),
    );
    assert.equal(resolveModalSurfaceMaxHeight('bottom', 'default'), '92%');
  });

  it('lifts a surface above the keyboard on iOS only', () => {
    assert.equal(resolveKeyboardAvoidingBehavior('ios'), 'padding');
    assert.equal(resolveKeyboardAvoidingBehavior('android'), undefined);
    assert.equal(resolveKeyboardAvoidingBehavior('web'), undefined);
  });
});
