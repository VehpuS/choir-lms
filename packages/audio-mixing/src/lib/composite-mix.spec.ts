import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ALL_PARTS_PRESET_ID,
  canResetSessionMix,
  createDefaultMix,
  describeMix,
  getBuiltInMixPresets,
  listMixPresets,
  MINE_LOUDER_PRESET_ID,
  pruneMixToStems,
  reduceSessionMix,
  startSessionMix,
  summarizeMix,
  WITHOUT_MINE_PRESET_ID,
} from './composite-mix.ts';
import { resolveStemGains } from './stem-gains.ts';

const stems = (mine?: string) =>
  ['Soprano', 'Alto', 'Tenor', 'Bass'].map((name) => ({
    id: name,
    name,
    mine: name === mine,
  }));

const mustFind = <T>(value: T | undefined): T => {
  assert.ok(value);

  return value;
};

describe('built-in presets', () => {
  it('offers only All parts without a stem marked as mine', () => {
    assert.deepEqual(
      getBuiltInMixPresets(stems()).map((preset) => preset.id),
      [ALL_PARTS_PRESET_ID],
    );
  });

  it('names the mine presets after the stem', () => {
    const presets = getBuiltInMixPresets(stems('Bass'));

    assert.deepEqual(
      presets.map((preset) => preset.name),
      ['All parts', 'Without Bass', 'Bass louder'],
    );
  });

  it('mutes mine in Without and boosts it in louder', () => {
    const presets = getBuiltInMixPresets(stems('Bass'));
    const without = mustFind(
      presets.find((p) => p.id === WITHOUT_MINE_PRESET_ID),
    );
    const louder = mustFind(
      presets.find((p) => p.id === MINE_LOUDER_PRESET_ID),
    );

    assert.equal(resolveStemGains(stems('Bass'), without.mix).Bass, 0);
    assert.equal(resolveStemGains(stems('Bass'), without.mix).Alto, 1);
    assert.equal(resolveStemGains(stems('Bass'), louder.mix).Bass, 1.5);
    assert.equal(resolveStemGains(stems('Bass'), louder.mix).Alto, 0.7);
  });

  it('lists saved presets after the built-in ones', () => {
    const listed = listMixPresets({
      stems: stems(),
      presets: [{ id: 'p1', name: 'Warm-up', mix: { levels: {} } }],
    });

    assert.deepEqual(
      listed.map((preset) => [preset.name, preset.builtIn]),
      [
        ['All parts', true],
        ['Warm-up', false],
      ],
    );
  });
});

describe('summarizeMix', () => {
  it('reads like Without Bass · 3 of 4 sounding', () => {
    const list = stems('Bass');
    const presets = getBuiltInMixPresets(list);
    const without = mustFind(
      presets.find((p) => p.id === WITHOUT_MINE_PRESET_ID),
    );

    assert.equal(
      summarizeMix(list, without.mix, presets),
      'Without Bass · 3 of 4 sounding',
    );
  });

  it('calls a mix that matches no preset Custom mix', () => {
    const list = stems();
    const presets = getBuiltInMixPresets(list);
    const mix = reduceSessionMix(
      startSessionMix({
        stems: list,
        defaultMix: createDefaultMix(list),
      }),
      {
        type: 'set-volume',
        stemId: 'Alto',
        volume: 40,
      },
    ).mix;

    assert.equal(describeMix(list, mix, presets), 'Custom mix');
  });

  it('counts solo as the only stems sounding', () => {
    const list = stems();
    const presets = getBuiltInMixPresets(list);
    const state = reduceSessionMix(
      startSessionMix({
        stems: list,
        defaultMix: createDefaultMix(list),
      }),
      { type: 'toggle-solo', stemId: 'Tenor' },
    );

    assert.equal(
      summarizeMix(list, state.mix, presets),
      'Custom mix · 1 of 4 sounding',
    );
  });
});

describe('session mix', () => {
  const composite = () => ({
    stems: stems('Bass'),
    defaultMix: {
      levels: {
        Alto: { volume: 60, muted: false, soloed: false },
        Gone: { volume: 10, muted: true, soloed: false },
      },
    },
  });

  it('starts from the default mix without levels of removed stems', () => {
    const state = startSessionMix(composite());

    assert.deepEqual(Object.keys(state.mix.levels), ['Alto']);
  });

  it('changes volume, mute and solo and clamps volume', () => {
    let state = startSessionMix(composite());

    state = reduceSessionMix(state, {
      type: 'set-volume',
      stemId: 'Bass',
      volume: 999,
    });
    state = reduceSessionMix(state, { type: 'toggle-mute', stemId: 'Tenor' });
    state = reduceSessionMix(state, { type: 'toggle-solo', stemId: 'Alto' });

    assert.equal(state.mix.levels.Bass.volume, 150);
    assert.equal(state.mix.levels.Tenor.muted, true);
    assert.equal(state.mix.levels.Alto.soloed, true);

    state = reduceSessionMix(state, { type: 'toggle-mute', stemId: 'Tenor' });
    assert.equal(state.mix.levels.Tenor.muted, false);
  });

  it('applies a preset and resets to the saved default', () => {
    const list = stems('Bass');
    let state = startSessionMix(composite());
    const without = getBuiltInMixPresets(list)[1];

    state = reduceSessionMix(state, { type: 'apply', mix: without.mix });
    assert.equal(canResetSessionMix(list, state), true);

    state = reduceSessionMix(state, { type: 'reset' });
    assert.equal(canResetSessionMix(list, state), false);
    assert.equal(state.mix.levels.Alto.volume, 60);
  });
});

describe('pruneMixToStems', () => {
  it('lets a preset that names a missing part apply to the stems left', () => {
    const list = stems().slice(0, 2);
    const pruned = pruneMixToStems(list, {
      levels: {
        Soprano: { volume: 80, muted: false, soloed: false },
        Bass: { volume: 0, muted: true, soloed: true },
      },
    });

    assert.deepEqual(resolveStemGains(list, pruned), { Soprano: 0.8, Alto: 1 });
  });
});
