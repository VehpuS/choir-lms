import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isPianoViewerOpen, registerPianoViewer } from './piano-host-store.js';

describe('piano host store', () => {
  it('reports the viewer open while any registration is live', () => {
    assert.equal(isPianoViewerOpen(), false);

    const first = registerPianoViewer();
    const second = registerPianoViewer();

    first();
    assert.equal(isPianoViewerOpen(), true);

    second();
    assert.equal(isPianoViewerOpen(), false);
  });
});
