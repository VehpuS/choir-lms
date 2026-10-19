import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_BULK_CHOICE_PREFERENCES } from '../../library/selection/bulk-choices.js';
import {
  SETTINGS_PREFERENCE_ROWS,
  buildPartPresetChips,
  hasStoredBulkChoiceDefault,
} from './model.js';

describe('settings model', () => {
  it('offers ask-each-time first, then the two answers, for each question', () => {
    for (const row of SETTINGS_PREFERENCE_ROWS) {
      assert.equal(row.options.length, 3);
      assert.equal(row.options[0]?.value, 'ask');
    }

    assert.deepEqual(
      SETTINGS_PREFERENCE_ROWS.map(({ key }) => key),
      ['playlistsInFolders', 'repeatedItems'],
    );
  });

  it('only offers a reset when a default is stored', () => {
    assert.equal(
      hasStoredBulkChoiceDefault(DEFAULT_BULK_CHOICE_PREFERENCES),
      false,
    );
    assert.equal(
      hasStoredBulkChoiceDefault({
        ...DEFAULT_BULK_CHOICE_PREFERENCES,
        repeatedItems: 'remove',
      }),
      true,
    );
  });
});

describe('buildPartPresetChips', () => {
  it('offers every preset while the list is empty', () => {
    assert.deepEqual(buildPartPresetChips([]), [
      'Soprano',
      'Mezzo-soprano',
      'Alto',
      'Tenor',
      'Baritone',
      'Bass',
      'Beatbox',
    ]);
  });

  it('leaves out presets already listed, however they were typed', () => {
    assert.deepEqual(buildPartPresetChips(['alto', 'Mezzo Soprano', 'Lead']), [
      'Soprano',
      'Tenor',
      'Baritone',
      'Bass',
      'Beatbox',
    ]);
  });
});
