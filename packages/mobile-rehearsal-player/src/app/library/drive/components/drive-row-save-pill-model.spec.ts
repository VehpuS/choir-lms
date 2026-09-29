/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDriveRowSavePillAppearance } from './drive-row-save-pill-model.js';

describe('Drive row Save pill', () => {
  it('draws Save and Saving… as the accent outline without a check', () => {
    assert.deepEqual(getDriveRowSavePillAppearance({ label: 'Save' }), {
      showsCheck: false,
      tone: 'accent',
    });
    assert.deepEqual(getDriveRowSavePillAppearance({ label: 'Saving…' }), {
      showsCheck: false,
      tone: 'accent',
    });
  });

  it('draws the saved toggle neutral with a check, dropping the check while removing', () => {
    assert.deepEqual(
      getDriveRowSavePillAppearance({ kind: 'saved-toggle', label: 'Saved' }),
      { showsCheck: true, tone: 'neutral' },
    );
    assert.deepEqual(
      getDriveRowSavePillAppearance({
        kind: 'saved-toggle',
        label: 'Removing…',
      }),
      { showsCheck: false, tone: 'neutral' },
    );
  });
});
