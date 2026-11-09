import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeTrack } from '@org/audio-library-models';
import {
  createDefaultMix,
  getBuiltInMixPresets,
  reduceSessionMix,
  startSessionMix,
} from '@org/audio-mixing';

import { buildPresetMenuModel, resolveSavePresetModel } from './preset-model';

const stem = (id: string, name: string, mine = false) => ({
  id,
  trackId: `t-${id}`,
  name,
  offsetMs: 0,
  mine,
});
const withMine: CompositeTrack['stems'] = [
  stem('a', 'Alto'),
  stem('b', 'Bass', true),
];
const noMine: CompositeTrack['stems'] = [stem('a', 'Alto'), stem('b', 'Bass')];
const compositeOf = (stems: CompositeTrack['stems']) => ({
  stems,
  presets: [],
  defaultMix: createDefaultMix(stems),
});

describe('buildPresetMenuModel', () => {
  it('lists the built-in presets with the current one checked and the default marked', () => {
    const composite = compositeOf(withMine);
    const menu = buildPresetMenuModel(composite, startSessionMix(composite));

    assert.deepEqual(
      menu.builtIn.map((row) => [row.name, row.isCurrent, row.isDefault]),
      [
        ['All parts', true, true],
        ['Without Bass', false, false],
        ['Bass louder', false, false],
      ],
    );
    assert.equal(menu.canReset, false);
  });

  it('hides the part presets when no stem is marked', () => {
    const composite = compositeOf(noMine);
    const menu = buildPresetMenuModel(composite, startSessionMix(composite));

    assert.deepEqual(
      menu.builtIn.map((row) => row.name),
      ['All parts'],
    );
  });

  it('offers reset and make-default once the mix differs, and lists saved presets', () => {
    const base = compositeOf(withMine);
    const soft = getBuiltInMixPresets(withMine)[2].mix;
    const composite = {
      ...base,
      presets: [{ id: 'p', name: 'Soft', mix: soft }],
    };
    const session = reduceSessionMix(startSessionMix(composite), {
      type: 'apply',
      mix: soft,
    });
    const menu = buildPresetMenuModel(composite, session);

    assert.equal(menu.canReset, true);
    assert.equal(menu.canMakeDefault, true);
    assert.equal(menu.saved[0].name, 'Soft');
    assert.equal(menu.saved[0].isCurrent, true);
  });
});

describe('resolveSavePresetModel', () => {
  it('cleans the name and needs one', () => {
    assert.equal(
      resolveSavePresetModel('  Bass   softer ', []).name,
      'Bass softer',
    );
    assert.equal(resolveSavePresetModel('   ', []).canSave, false);
  });

  it('says when saving replaces a preset of the same name', () => {
    const model = resolveSavePresetModel('soft', [{ name: 'Soft' }]);

    assert.equal(model.replacesNote, 'Replaces the saved preset “Soft”.');
    assert.equal(model.canSave, true);
  });
});
