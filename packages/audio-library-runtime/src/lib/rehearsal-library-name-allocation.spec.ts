import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRehearsalLibraryAvailableNodeName } from './rehearsal-playback.js';

describe('resolveRehearsalLibraryAvailableNodeName', () => {
  it('keeps the requested name when it is available', () => {
    assert.equal(
      resolveRehearsalLibraryAvailableNodeName({
        reservedNames: ['Other folder'],
        sourceName: 'Warmups',
      }),
      'Warmups',
    );
  });

  it('allocates the next case-insensitively available Copy suffix', () => {
    assert.equal(
      resolveRehearsalLibraryAvailableNodeName({
        reservedNames: ['WARMUPS', 'Warmups Copy', 'warmups copy 2'],
        sourceName: 'Warmups',
      }),
      'Warmups Copy 3',
    );
  });

  it('continues an existing Copy suffix sequence', () => {
    assert.equal(
      resolveRehearsalLibraryAvailableNodeName({
        reservedNames: ['Warmups Copy', 'Warmups Copy 2'],
        sourceName: 'Warmups Copy',
      }),
      'Warmups Copy 3',
    );
  });
});
