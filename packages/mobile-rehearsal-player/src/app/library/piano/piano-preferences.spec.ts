import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PIANO_PREFERENCES,
  parsePianoPreferences,
  persistPianoPreferences,
  pianoStorageKey,
  restorePianoPreferences,
} from './piano-preferences.js';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const values = { ...initial };

  return {
    getItem: async (key: string) => values[key] ?? null,
    setItem: async (key: string, value: string) => {
      values[key] = value;
    },
  };
};

describe('piano preferences', () => {
  it('defaults when nothing is stored', async () => {
    assert.deepEqual(
      await restorePianoPreferences(memoryStorage()),
      DEFAULT_PIANO_PREFERENCES,
    );
    assert.equal(DEFAULT_PIANO_PREFERENCES.volume, 0.7);
    assert.equal(DEFAULT_PIANO_PREFERENCES.sound, 'piano');
  });

  it('falls back to the piano for an unknown sound', () => {
    assert.equal(parsePianoPreferences({ sound: 'harp' }).sound, 'piano');
  });

  it('clamps volume and ignores garbage', () => {
    assert.equal(parsePianoPreferences({ volume: '3' }).volume, 1);
    assert.equal(parsePianoPreferences({ volume: '-1' }).volume, 0);
    assert.equal(parsePianoPreferences({ volume: 'loud' }).volume, 0.7);
  });

  it('ignores unknown height steps and negative scroll', () => {
    const parsed = parsePianoPreferences({
      heightStep: 'huge',
      scrollLeft: '-40',
    });

    assert.equal(parsed.heightStep, 'regular');
    assert.equal(parsed.scrollLeft, 0);
  });

  it('defaults the key width to 40 pt', () => {
    assert.equal(DEFAULT_PIANO_PREFERENCES.keyWidth, 40);
    assert.equal(parsePianoPreferences({}).keyWidth, 40);
  });

  it('clamps the key width into 40-100 pt and ignores garbage', () => {
    assert.equal(parsePianoPreferences({ keyWidth: '64' }).keyWidth, 64);
    assert.equal(parsePianoPreferences({ keyWidth: '12' }).keyWidth, 40);
    assert.equal(parsePianoPreferences({ keyWidth: '250' }).keyWidth, 100);
    assert.equal(parsePianoPreferences({ keyWidth: 'wide' }).keyWidth, 40);
    assert.equal(parsePianoPreferences({ keyWidth: 'NaN' }).keyWidth, 40);
  });

  it('round-trips changed preferences', async () => {
    const storage = memoryStorage();
    const changed = {
      sound: 'organ',
      volume: 0.25,
      accidentals: 'flats',
      showAllNoteNames: true,
      isOpen: true,
      heightStep: 'tall',
      keyWidth: 64,
      scrollLeft: 812,
    } as const;

    await persistPianoPreferences(changed, storage);

    assert.deepEqual(await restorePianoPreferences(storage), changed);
    assert.equal(pianoStorageKey('sound'), 'choirlms.piano.sound');
  });

  it('falls back to defaults when storage fails', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('storage unavailable');
      },
      setItem: async () => {
        throw new Error('storage unavailable');
      },
    };

    assert.deepEqual(
      await restorePianoPreferences(failing),
      DEFAULT_PIANO_PREFERENCES,
    );
    await assert.doesNotReject(persistPianoPreferences({ volume: 1 }, failing));
  });
});
