import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeMix, CompositeTrack } from '@org/audio-library-models';
import { createDefaultMix } from '@org/audio-mixing';

import { buildMixPanelModel, formatVolumeLabel } from './mix-panel-model';
import { createSessionMixStore } from './session-mix-store';

const stems: CompositeTrack['stems'] = [
  { id: 's', trackId: 't-s', name: 'Soprano', offsetMs: 0, mine: false },
  { id: 'a', trackId: 't-a', name: 'Alto', offsetMs: 0, mine: false },
  { id: 'b', trackId: 't-b', name: 'Bass', offsetMs: 0, mine: true },
];
const composite = {
  id: 'c1',
  stems,
  presets: [],
  defaultMix: createDefaultMix(stems),
};
const available = { status: 'available' } as never;
const library = (ids: string[]) =>
  new Map(ids.map((id) => [id, { id, availability: available }]));
const everyTrack = library(['t-s', 't-a', 't-b']);

describe('buildMixPanelModel', () => {
  it('names the default mix and counts every stem as sounding', () => {
    const model = buildMixPanelModel({
      composite,
      mix: composite.defaultMix,
      library: everyTrack,
    });

    assert.equal(model.summary, 'All parts · 3 of 3 sounding');
    assert.equal(model.rows[2].isMine, true);
  });

  it('shows Custom mix and dims the stems a solo silences', () => {
    const mix: CompositeMix = {
      levels: {
        ...composite.defaultMix.levels,
        a: { volume: 100, muted: false, soloed: true },
      },
    };
    const model = buildMixPanelModel({ composite, mix, library: everyTrack });

    assert.equal(model.summary, 'Custom mix · 1 of 3 sounding');
    assert.deepEqual(
      model.rows.map((row) => row.isSilent),
      [true, false, true],
    );
  });

  it('flags a stem whose track is gone and does not count it as sounding', () => {
    const model = buildMixPanelModel({
      composite,
      mix: composite.defaultMix,
      library: library(['t-s', 't-b']),
    });

    assert.equal(model.rows[1].isMissing, true);
    assert.equal(model.summary, 'All parts · 2 of 3 sounding');
  });

  it('names a preset the mix matches', () => {
    const mix: CompositeMix = {
      levels: {
        ...composite.defaultMix.levels,
        b: { volume: 100, muted: true, soloed: false },
      },
    };

    assert.equal(
      buildMixPanelModel({ composite, mix, library: everyTrack }).presetName,
      'Without Bass',
    );
  });

  it('rounds and clamps the volume label', () => {
    assert.equal(formatVolumeLabel(149.6), '150%');
    assert.equal(formatVolumeLabel(400), '150%');
  });
});

describe('session mix store', () => {
  it('starts from the default, changes, resets, and starts over for another composite', () => {
    const store = createSessionMixStore();

    assert.equal(store.get(composite).mix.levels.s.volume, 100);

    store.dispatch(composite, { type: 'set-volume', stemId: 's', volume: 40 });
    assert.equal(store.get(composite).mix.levels.s.volume, 40);

    store.dispatch(composite, { type: 'reset' });
    assert.equal(store.get(composite).mix.levels.s.volume, 100);

    store.dispatch(composite, { type: 'toggle-mute', stemId: 'a' });
    const other = { ...composite, id: 'c2' };

    assert.equal(store.get(other).mix.levels.a.muted, false);
  });

  it('notifies subscribers on a change', () => {
    const store = createSessionMixStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });
    store.dispatch(composite, { type: 'toggle-solo', stemId: 's' });

    assert.equal(calls, 1);
  });
});
