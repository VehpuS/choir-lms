import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createAudioSessionArbiter } from './audio-session-arbiter';

const createSession = (type = 'auto') => {
  const changes: string[] = [];
  const session = {
    get type() {
      return type;
    },
    set type(next: string) {
      type = next;
      changes.push(next);
    },
  };

  return { changes, session };
};

describe('createAudioSessionArbiter', () => {
  it('holds playback while the piano is in use and gives the type back after', () => {
    const { session } = createSession('auto');
    const lease = createAudioSessionArbiter(() => session).playbackLease();

    lease.request();
    assert.equal(session.type, 'playback');

    lease.release();
    assert.equal(session.type, 'auto');
  });

  it('is harmless to request or release twice', () => {
    const { changes, session } = createSession();
    const lease = createAudioSessionArbiter(() => session).playbackLease();

    lease.release();
    lease.request();
    lease.request();
    lease.release();
    lease.release();

    assert.deepEqual(changes, ['playback', 'auto']);
  });

  it('is play-and-record while the microphone is open, so playback and capture coexist', () => {
    const { session } = createSession('auto');
    const arbiter = createAudioSessionArbiter(() => session);
    const lease = arbiter.playbackLease();

    lease.request();
    const stopCapture = arbiter.holdCapture();

    // `playback` has no microphone input on iOS: it must not stay.
    assert.equal(session.type, 'play-and-record');

    stopCapture();
    // The piano is still open, so its request applies again.
    assert.equal(session.type, 'playback');
  });

  it('is play-and-record for the microphone alone, and gives the type back after', () => {
    const { session } = createSession('auto');
    const stopCapture = createAudioSessionArbiter(() => session).holdCapture();

    assert.equal(session.type, 'play-and-record');

    stopCapture();
    assert.equal(session.type, 'auto');
  });

  it('does not take playback while the microphone is already open', () => {
    const { session } = createSession('auto');
    const arbiter = createAudioSessionArbiter(() => session);
    const stopCapture = arbiter.holdCapture();

    arbiter.playbackLease().request();
    assert.equal(session.type, 'play-and-record');

    stopCapture();
    assert.equal(session.type, 'playback');
  });

  it('keeps the original type through overlapping uses, and restores it at the end', () => {
    const { session } = createSession('ambient');
    const arbiter = createAudioSessionArbiter(() => session);
    const lease = arbiter.playbackLease();

    lease.request();
    const stopCapture = arbiter.holdCapture();

    lease.release();
    assert.equal(session.type, 'play-and-record');

    stopCapture();
    assert.equal(session.type, 'ambient');
  });

  it('counts several captures, and releases each only once', () => {
    const { session } = createSession('auto');
    const arbiter = createAudioSessionArbiter(() => session);

    arbiter.playbackLease().request();

    const stopFirst = arbiter.holdCapture();
    const stopSecond = arbiter.holdCapture();

    stopFirst();
    stopFirst();
    assert.equal(session.type, 'play-and-record');

    stopSecond();
    assert.equal(session.type, 'playback');
  });

  it('does nothing where the browser has no audio session', () => {
    const arbiter = createAudioSessionArbiter(() => undefined);

    assert.doesNotThrow(() => {
      arbiter.playbackLease().request();
      arbiter.holdCapture()();
      arbiter.playbackLease().release();
    });
  });

  it('carries on when the browser refuses a type', () => {
    const session = {
      get type() {
        return 'auto';
      },
      set type(_next: string) {
        throw new TypeError('unsupported');
      },
    };
    const arbiter = createAudioSessionArbiter(() => session);

    assert.doesNotThrow(() => {
      arbiter.playbackLease().request();
      arbiter.holdCapture()();
    });
  });
});
