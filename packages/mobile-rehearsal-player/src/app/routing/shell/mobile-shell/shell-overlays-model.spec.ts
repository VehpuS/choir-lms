import assert from 'node:assert/strict';
import test from 'node:test';

import { getOverlayBottomOffset } from './shell-overlays-model';

test('an overlay stops at the content area when no practice tool is open', () => {
  assert.equal(getOverlayBottomOffset(0), 0);
});

test('an overlay reaches down over the docked practice tools', () => {
  assert.equal(getOverlayBottomOffset(312), -312);
});
