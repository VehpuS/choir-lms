import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_BULK_CHOICE_PREFERENCES } from '../../library/selection/bulk-choices.js';
import { DEFAULT_PIANO_PREFERENCES } from '../../library/piano/piano-preferences.js';
import {
  PIANO_PREFERENCE_ROWS,
  pianoPreferencePatch,
  pianoPreferenceValue,
  SETTINGS_PREFERENCE_ROWS,
  buildPartPresetChips,
  OFFLINE_CACHE_SIZE_OPTIONS,
  hasStoredBulkChoiceDefault,
  visibleSettingsCategories,
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

describe('piano settings rows', () => {
  it('offers sound, every note name, and black key names in order', () => {
    assert.deepEqual(
      PIANO_PREFERENCE_ROWS.map(({ title }) => title),
      ['Sound', 'Note names', 'Black keys'],
    );
    assert.deepEqual(
      PIANO_PREFERENCE_ROWS.map(({ options }) =>
        options.map(({ label }) => label),
      ),
      [
        ['Piano', 'Organ'],
        ['C only', 'All keys'],
        ['Sharps', 'Flats'],
      ],
    );
  });

  it('shows the stored value for each row', () => {
    const stored = {
      ...DEFAULT_PIANO_PREFERENCES,
      accidentals: 'flats',
      showAllNoteNames: true,
      sound: 'organ',
    } as const;

    assert.equal(pianoPreferenceValue(stored, 'sound'), 'organ');
    assert.equal(pianoPreferenceValue(stored, 'showAllNoteNames'), 'on');
    assert.equal(pianoPreferenceValue(stored, 'accidentals'), 'flats');
    assert.equal(
      pianoPreferenceValue(DEFAULT_PIANO_PREFERENCES, 'showAllNoteNames'),
      'off',
    );
  });

  it('changes only the chosen preference', () => {
    assert.deepEqual(pianoPreferencePatch('accidentals', 'flats'), {
      accidentals: 'flats',
    });
    assert.deepEqual(pianoPreferencePatch('showAllNoteNames', 'on'), {
      showAllNoteNames: true,
    });
    assert.deepEqual(pianoPreferencePatch('sound', 'organ'), {
      sound: 'organ',
    });
  });

  it('lists the categories in order and hides Piano where it cannot play', () => {
    assert.deepEqual(
      visibleSettingsCategories({
        canListenForPitch: true,
        canPlayPiano: true,
        canStoreOffline: true,
      }).map((category) => category.key),
      [
        'bulk-selections',
        'piano',
        'pitch',
        'my-parts',
        'search-sources',
        'offline-storage',
      ],
    );
    assert.deepEqual(
      visibleSettingsCategories({
        canListenForPitch: false,
        canPlayPiano: false,
        canStoreOffline: true,
      }).map((category) => category.key),
      ['bulk-selections', 'my-parts', 'search-sources', 'offline-storage'],
    );
  });

  it('hides Pitch detection where the microphone cannot be listened to', () => {
    assert.equal(
      visibleSettingsCategories({
        canListenForPitch: false,
        canPlayPiano: true,
        canStoreOffline: true,
      }).some((category) => category.key === 'pitch'),
      false,
    );
  });

  it('hides Offline storage where nothing can be stored', () => {
    assert.equal(
      visibleSettingsCategories({
        canListenForPitch: true,
        canPlayPiano: true,
        canStoreOffline: false,
      }).some((category) => category.key === 'offline-storage'),
      false,
    );
  });

  it('offers the cache size presets with whole-unit labels', () => {
    assert.deepEqual(
      OFFLINE_CACHE_SIZE_OPTIONS.map((option) => option.label),
      ['100 MB', '250 MB', '500 MB', '1 GB', '2 GB'],
    );
  });
});
