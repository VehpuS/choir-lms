import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ListeningNoRoomError } from './create-listening-engine-loader';
import {
  classifyListeningFallback,
  createListeningFallbackStore,
  getListeningFallbackLabel,
  LISTENING_FALLBACK_NOTICE_MS,
} from './listening-fallback-state';

/** Timers the spec fires by hand. */
const setup = (isOffline = false) => {
  const timers: Array<{ callback: () => void; ms: number; cleared: boolean }> =
    [];
  const store = createListeningFallbackStore(
    {
      setTimer: (callback, ms) => {
        const timer = { callback, ms, cleared: false };

        timers.push(timer);

        return timer;
      },
      clearTimer: (handle) => {
        (handle as { cleared: boolean }).cleared = true;
      },
    },
    () => isOffline,
  );

  return { store, timers };
};

describe('classifyListeningFallback', () => {
  it('tells no room from offline from anything else', () => {
    assert.equal(
      classifyListeningFallback(new ListeningNoRoomError(), false),
      'no-room',
    );
    assert.equal(
      classifyListeningFallback(new Error('fetch'), true),
      'offline',
    );
    assert.equal(
      classifyListeningFallback(new Error('decode'), false),
      'failed',
    );
    // No room is the reason even when offline: freeing space is what helps.
    assert.equal(
      classifyListeningFallback(new ListeningNoRoomError(), true),
      'no-room',
    );
  });
});

describe('listening fallback store', () => {
  it('remembers the track and shows its message, then only remembers', () => {
    const { store, timers } = setup();

    store.report('t1', new ListeningNoRoomError());

    assert.equal(store.has('t1'), true);
    assert.equal(
      getListeningFallbackLabel(store.get(), 't1'),
      'May sound thin on Bluetooth · no room to prepare this track',
    );
    assert.equal(timers[0].ms, LISTENING_FALLBACK_NOTICE_MS);

    timers[0].callback();

    assert.equal(getListeningFallbackLabel(store.get(), 't1'), null);
    assert.equal(store.has('t1'), true);
  });

  it('says nothing for another track than the one playing', () => {
    const { store } = setup();

    store.report('t1', new Error('decode'));

    assert.equal(getListeningFallbackLabel(store.get(), 't2'), null);
    assert.equal(getListeningFallbackLabel(store.get(), null), null);
  });

  it('gives the offline and the general reason their own words', () => {
    const offline = setup(true);
    const online = setup(false);

    offline.store.report('t1', new Error('fetch'));
    online.store.report('t1', new Error('decode'));

    assert.match(
      getListeningFallbackLabel(offline.store.get(), 't1') ?? '',
      /offline, track not prepared$/,
    );
    assert.match(
      getListeningFallbackLabel(online.store.get(), 't1') ?? '',
      /track could not be prepared$/,
    );
  });

  it('forgets on clear, cancels the pending hide and tells subscribers once', () => {
    const { store, timers } = setup();
    let changes = 0;

    store.subscribe(() => (changes += 1));
    store.clear();
    store.report('t1', new Error('decode'));
    store.clear();
    store.clear();

    assert.equal(store.has('t1'), false);
    assert.equal(store.get(), null);
    assert.equal(timers[0].cleared, true);
    assert.equal(changes, 2);
  });

  it('restarts the message for a new report', () => {
    const { store, timers } = setup();

    store.report('t1', new Error('decode'));
    store.report('t2', new Error('decode'));

    assert.equal(timers[0].cleared, true);
    assert.equal(store.has('t2'), true);
    assert.equal(store.has('t1'), false);
  });
});
