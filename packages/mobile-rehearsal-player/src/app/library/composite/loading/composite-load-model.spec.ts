import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createCompositeLoadStore } from './composite-load-state';
import {
  buildCompositeLoadingModel,
  LOADING_HINT,
  PREPARING_HINT,
} from './composite-load-model';
import type { StemLoadProgress } from './composite-stem-loader';

const names = new Map([
  ['s', 'Soprano'],
  ['a', 'Alto'],
  ['t', 'Tenor'],
]);
const progress = (
  stemId: string,
  status: StemLoadProgress['status'],
  fraction: number,
): StemLoadProgress => ({ stemId, status, fraction });

describe('buildCompositeLoadingModel', () => {
  const stems = [
    progress('s', 'ready', 1),
    progress('a', 'loading', 0.5),
    progress('t', 'waiting', 0),
  ];

  it('says how many stems are ready, with a row and status for each', () => {
    const model = buildCompositeLoadingModel({
      phase: 'loading',
      stems,
      names,
    });

    assert.equal(model.subtitle, 'Loading stems · 1 of 3 ready');
    assert.deepEqual(
      model.rows.map((row) => [row.name, row.statusLabel]),
      [
        ['Soprano', 'ready'],
        ['Alto', 'loading…'],
        ['Tenor', 'waiting'],
      ],
    );
    assert.equal(model.hint, LOADING_HINT);
    assert.equal(model.currentLabel, null);
    assert.equal(model.progressFraction, 0.5);
  });

  it('explains the first play while preparing, naming the stem in progress', () => {
    const model = buildCompositeLoadingModel({
      phase: 'preparing',
      stems,
      names,
    });

    assert.equal(model.subtitle, 'Preparing stems · 1 of 3 · first time only');
    assert.equal(model.currentLabel, 'Preparing Alto…');
    assert.equal(model.hint, PREPARING_HINT);
  });

  it('counts a failed stem as done for preparing and leaves a stem the record lost out of the rows', () => {
    const model = buildCompositeLoadingModel({
      phase: 'preparing',
      stems: [progress('s', 'failed', 0), progress('gone', 'ready', 1)],
      names,
    });

    assert.equal(model.counter, '2 of 2');
    assert.equal(model.rows.length, 1);
    assert.equal(model.rows[0].statusLabel, 'could not load');
  });
});

describe('composite load store', () => {
  it('starts waiting, follows updates and clears at the end', () => {
    const store = createCompositeLoadStore();
    const handle = store.begin('c1', ['s', 'a'], 'preparing');

    assert.deepEqual(
      store.get()?.stems.map((entry) => entry.status),
      ['waiting', 'waiting'],
    );

    handle.update([progress('s', 'ready', 1), progress('a', 'loading', 0.2)]);
    assert.equal(store.get()?.stems[0].status, 'ready');

    handle.end();
    assert.equal(store.get(), null);
  });

  it('lets a superseded load neither update nor clear the newer one', () => {
    const store = createCompositeLoadStore();
    const first = store.begin('c1', ['s'], 'loading');
    const second = store.begin('c2', ['t'], 'loading');

    first.update([progress('s', 'ready', 1)]);
    first.end();

    assert.equal(store.get()?.compositeId, 'c2');
    assert.equal(store.get()?.stems[0].status, 'waiting');

    second.end();
    assert.equal(store.get(), null);
  });

  it('notifies subscribers', () => {
    const store = createCompositeLoadStore();
    let calls = 0;

    store.subscribe(() => {
      calls += 1;
    });
    store.begin('c1', ['s'], 'loading').end();

    assert.equal(calls, 2);
  });
});
