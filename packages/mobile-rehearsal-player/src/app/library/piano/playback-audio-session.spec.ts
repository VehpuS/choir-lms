import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaybackAudioSessionLease } from './playback-audio-session';

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

describe('createPlaybackAudioSessionLease', () => {
  it('asks for the playback session', () => {
    const { session } = createSession();
    const lease = createPlaybackAudioSessionLease(() => session);

    lease.request();

    assert.equal(session.type, 'playback');
  });

  it('gives the previous type back on release', () => {
    const { session } = createSession('ambient');
    const lease = createPlaybackAudioSessionLease(() => session);

    lease.request();
    lease.release();

    assert.equal(session.type, 'ambient');
  });

  it('is harmless to request twice and keeps the first previous type', () => {
    const { changes, session } = createSession('auto');
    const lease = createPlaybackAudioSessionLease(() => session);

    lease.request();
    lease.request();
    lease.release();

    assert.deepEqual(changes, ['playback', 'auto']);
  });

  it('does nothing on release without a request', () => {
    const { changes, session } = createSession();
    const lease = createPlaybackAudioSessionLease(() => session);

    lease.release();

    assert.deepEqual(changes, []);
  });

  it('does nothing where the browser has no audio session', () => {
    const lease = createPlaybackAudioSessionLease(() => undefined);

    assert.doesNotThrow(() => {
      lease.request();
      lease.release();
    });
  });

  it('carries on when the browser refuses the type', () => {
    const session = {
      get type() {
        return 'auto';
      },
      set type(_next: string) {
        throw new TypeError('unsupported');
      },
    };
    const lease = createPlaybackAudioSessionLease(() => session);

    assert.doesNotThrow(() => {
      lease.request();
      lease.release();
    });
  });
});
