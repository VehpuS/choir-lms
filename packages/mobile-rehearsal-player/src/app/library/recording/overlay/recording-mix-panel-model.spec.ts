import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MIX_PANEL_STORAGE_KEY,
  getMixSummary,
  parseMixPanelOpen,
  serializeMixPanelOpen,
} from './recording-mix-panel-model.js';
import {
  readMixPanelOpen,
  saveMixPanelOpen,
  type MixPanelStorage,
} from './recording-mix-panel-storage.js';

describe('getMixSummary', () => {
  it('joins balance, level and sync in one line', () => {
    assert.equal(
      getMixSummary({ balance: 50, levelDb: 4.5, nudgeMs: 12 }),
      'Even · +4.5 dB · +12 ms',
    );
  });

  it('names the two ends of the balance and shows other values out of 100', () => {
    assert.match(
      getMixSummary({ balance: 0, levelDb: 0, nudgeMs: 0 }),
      /^Track only · 0 dB · 0 ms$/,
    );
    assert.match(
      getMixSummary({ balance: 100, levelDb: -3, nudgeMs: -8 }),
      /^Recording only · −3 dB · −8 ms$/,
    );
    assert.match(
      getMixSummary({ balance: 70, levelDb: 0, nudgeMs: 0 }),
      /^70 \/ 100/,
    );
  });
});

describe('the remembered open state', () => {
  it('is open unless it was last closed', () => {
    assert.equal(parseMixPanelOpen(null), true);
    assert.equal(parseMixPanelOpen('open'), true);
    assert.equal(parseMixPanelOpen('something else'), true);
    assert.equal(parseMixPanelOpen('closed'), false);
    assert.equal(parseMixPanelOpen(serializeMixPanelOpen(false)), false);
  });

  const fakeStorage = (): MixPanelStorage & {
    values: Record<string, string>;
  } => {
    const values: Record<string, string> = {};

    return {
      getItem: async (key) => values[key] ?? null,
      setItem: async (key, value) => {
        values[key] = value;
      },
      values,
    };
  };

  it('reads open on a fresh device, and what was saved afterwards', async () => {
    const storage = fakeStorage();

    assert.equal(await readMixPanelOpen(storage), true);

    await saveMixPanelOpen(false, storage);

    assert.equal(storage.values[MIX_PANEL_STORAGE_KEY], 'closed');
    assert.equal(await readMixPanelOpen(storage), false);

    await saveMixPanelOpen(true, storage);

    assert.equal(await readMixPanelOpen(storage), true);
  });

  it('falls back to open, and does not throw, when storage fails', async () => {
    const broken: MixPanelStorage = {
      getItem: async () => {
        throw new Error('blocked');
      },
      setItem: async () => {
        throw new Error('blocked');
      },
    };

    assert.equal(await readMixPanelOpen(broken), true);
    await saveMixPanelOpen(false, broken);
  });
});
