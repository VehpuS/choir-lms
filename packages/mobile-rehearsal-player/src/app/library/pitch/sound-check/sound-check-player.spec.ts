import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PcmSubscriber } from '../pcm-source-types';
import {
  createSoundCheck,
  type SoundCheckDependencies,
  type SoundContextLike,
} from './sound-check-player';

/** A context that records what is played through it. */
const createContext = (sampleRate = 48_000) => {
  const events: string[] = [];
  const context: SoundContextLike = {
    state: 'suspended',
    sampleRate,
    destination: 'destination',
    resume: async () => {
      context.state = 'running';
      events.push('resume');
    },
    close: async () => {
      context.state = 'closed';
      events.push('close');
    },
    createBuffer: (channels, length) => {
      events.push(`buffer:${channels}x${length}`);
      const data = [new Float32Array(length), new Float32Array(length)];

      return { getChannelData: (channel) => data[channel] };
    },
    createBufferSource: () => ({
      buffer: null,
      loop: false,
      connect: () => events.push('connect'),
      start: () => events.push('start'),
      stop: () => events.push('stop'),
    }),
  };

  return { context, events };
};

const setup = (overrides: Partial<SoundCheckDependencies> = {}) => {
  const created: Array<ReturnType<typeof createContext>> = [];
  const app = createContext(44_100);
  const element = { loop: false, paused: true, played: 0, released: 0 };
  const sessions: string[] = [];
  const microphone = {
    subscribers: [] as PcmSubscriber[],
    unsubscribed: 0,
  };
  let isCapturing = false;
  let appCreated = false;
  const check = createSoundCheck({
    createContext: () => {
      const next = createContext();

      created.push(next);

      return next.context;
    },
    getAppContext: () => (appCreated ? app.context : null),
    ensureAppContext: () => {
      appCreated = true;

      return app.context;
    },
    createElement: () => ({
      element: {
        get loop() {
          return element.loop;
        },
        set loop(value: boolean) {
          element.loop = value;
        },
        get paused() {
          return element.paused;
        },
        play: async () => {
          element.paused = false;
          element.played += 1;
        },
        pause: () => {
          element.paused = true;
        },
      },
      release: () => {
        element.released += 1;
      },
    }),
    getSessionType: () => 'auto',
    setSessionType: (type) => sessions.push(type),
    isCapturing: () => isCapturing,
    getTrackPlayer: () => 'media-element',
    getRule: () => ({
      isMicrophoneOpen: isCapturing,
      isRecordingToolOpen: false,
      isAppHidden: false,
      isEngineOffForTest: false,
    }),
    getTrackFallback: () => null,
    microphone: {
      subscribe: async (subscriber) => {
        microphone.subscribers.push(subscriber);
        isCapturing = true;

        return () => {
          microphone.unsubscribed += 1;
          isCapturing = false;
        };
      },
    },
    ...overrides,
  });

  return { app, check, created, element, microphone, sessions };
};

describe('Sound check test sounds', () => {
  it('plays a looping stereo buffer in a new context and closes that context on stop', async () => {
    const t = setup();

    await t.check.toggleTone('web-audio-new');

    assert.equal(t.check.getState().tones['web-audio-new'], true);
    assert.deepEqual(t.created[0].events.slice(0, 2), [
      'resume',
      'buffer:2x192000',
    ]);
    assert.ok(t.created[0].events.includes('start'));
    assert.equal(t.check.readReadout().testContext?.state, 'running');

    await t.check.toggleTone('web-audio-new');

    assert.equal(t.check.getState().tones['web-audio-new'], false);
    assert.ok(t.created[0].events.includes('stop'));
    assert.ok(t.created[0].events.includes('close'));
    assert.equal(t.check.readReadout().testContext, null);
  });

  it("plays through the app's own context without closing it", async () => {
    const t = setup();

    assert.equal(t.check.readReadout().appContext, null);
    await t.check.toggleTone('web-audio-app');
    await t.check.toggleTone('web-audio-app');

    assert.equal(t.created.length, 0);
    assert.ok(t.app.events.includes('start'));
    assert.ok(t.app.events.includes('stop'));
    assert.equal(t.app.events.includes('close'), false);
    assert.equal(t.check.readReadout().appContext?.sampleRate, 44_100);
  });

  it('plays a looping media element and releases it on stop', async () => {
    const t = setup();

    await t.check.toggleTone('media-element');

    assert.equal(t.element.loop, true);
    assert.equal(t.element.paused, false);
    assert.equal(t.check.readReadout().isMediaElementPlaying, true);

    await t.check.toggleTone('media-element');

    assert.equal(t.element.paused, true);
    assert.equal(t.element.released, 1);
  });

  it('stays off when the browser cannot make the sound', async () => {
    const t = setup({ createContext: () => null, createElement: () => null });

    await t.check.toggleTone('web-audio-new');
    await t.check.toggleTone('media-element');

    assert.deepEqual(t.check.getState().tones, {
      'web-audio-new': false,
      'web-audio-app': false,
      'media-element': false,
    });
  });

  it('can play every kind at once', async () => {
    const t = setup();

    await t.check.toggleTone('web-audio-new');
    await t.check.toggleTone('web-audio-app');
    await t.check.toggleTone('media-element');

    assert.deepEqual(Object.values(t.check.getState().tones), [
      true,
      true,
      true,
    ]);
  });
});

describe('Sound check microphone', () => {
  it('opens through the shared capture, reports its rate and level, and closes', async () => {
    const t = setup();

    await t.check.toggleMicrophone();

    assert.equal(t.check.getState().microphone, 'open');
    assert.equal(t.check.readReadout().isCapturing, true);
    assert.equal(t.check.readReadout().microphone, null);

    t.microphone.subscribers[0].onFrame?.({
      samples: Float32Array.of(0.5, -0.5),
      sampleRate: 48_000,
      captureTimeSec: 0,
    });

    assert.deepEqual(t.check.readReadout().microphone, {
      sampleRate: 48_000,
      levelDb: -6,
    });

    await t.check.toggleMicrophone();

    assert.equal(t.check.getState().microphone, 'off');
    assert.equal(t.microphone.unsubscribed, 1);
    assert.equal(t.check.readReadout().isCapturing, false);
  });

  it('says so when the microphone cannot be opened', async () => {
    const t = setup({
      microphone: {
        subscribe: async () => {
          throw new Error('denied');
        },
      },
    });

    await t.check.toggleMicrophone();

    assert.equal(t.check.getState().microphone, 'failed');
  });

  it('closes a microphone that opened after it was switched off again', async () => {
    let finish: (stop: () => void) => void = () => undefined;
    const t = setup({
      microphone: {
        subscribe: () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      },
    });
    let stopped = 0;
    const opening = t.check.toggleMicrophone();

    await t.check.toggleMicrophone();
    finish(() => (stopped += 1));
    await opening;

    assert.equal(stopped, 1);
    assert.equal(t.check.getState().microphone, 'off');
  });

  it('follows the platform ending the capture', async () => {
    const t = setup();

    await t.check.toggleMicrophone();
    t.microphone.subscribers[0].onEnded?.();

    assert.equal(t.check.getState().microphone, 'off');
  });
});

describe('Sound check in general', () => {
  it('hands the session type on as it was asked', () => {
    const t = setup();

    t.check.setSessionType('playback');

    assert.deepEqual(t.sessions, ['playback']);
  });

  it('stops everything with stopAll, and tells subscribers', async () => {
    const t = setup();
    let changes = 0;

    t.check.subscribe(() => (changes += 1));
    await t.check.toggleTone('web-audio-new');
    await t.check.toggleTone('media-element');
    await t.check.toggleMicrophone();
    changes = 0;
    t.check.stopAll();

    assert.equal(t.element.paused, true);
    assert.equal(t.microphone.unsubscribed, 1);
    assert.deepEqual(Object.values(t.check.getState().tones), [
      false,
      false,
      false,
    ]);
    assert.equal(t.check.getState().microphone, 'off');
    assert.ok(changes > 0);
  });
});
