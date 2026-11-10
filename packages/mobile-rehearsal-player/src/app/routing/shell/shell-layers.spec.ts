import assert from 'node:assert/strict';
import test from 'node:test';

import { styles } from './mobile-shell-styles';
import { SHELL_LAYERS } from './shell-layers';

// The in-flow practice dock has no zIndex, so it sits at the default layer 0.
const IN_FLOW_PRACTICE_DOCK_LAYER = 0;

test('content, and so the account menu, paints above the in-flow practice dock', () => {
  assert.ok(SHELL_LAYERS.contentViewport > IN_FLOW_PRACTICE_DOCK_LAYER);
  assert.equal(
    (styles.contentViewport as { zIndex?: number }).zIndex,
    SHELL_LAYERS.contentViewport,
  );
});

test('the bottom dock sits above the content so the practice-tools menu covers it', () => {
  assert.ok(SHELL_LAYERS.bottomDock > SHELL_LAYERS.contentViewport);
  assert.equal(
    (styles.bottomDock as { zIndex?: number }).zIndex,
    SHELL_LAYERS.bottomDock,
  );
});

test('the playback sheet covers the docks and the floating practice dock covers the sheet', () => {
  assert.ok(SHELL_LAYERS.playbackSheet > SHELL_LAYERS.bottomDock);
  assert.ok(SHELL_LAYERS.floatingPracticeDock > SHELL_LAYERS.playbackSheet);
});
