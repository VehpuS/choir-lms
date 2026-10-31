import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { RecordingTimelineSegment } from '@org/audio-library-models';

import {
  createFakeTimers,
  createFakeTransport,
  createFakeVoice,
} from './mixing-test-fakes.ts';
import { createSyncController, type SyncRecording } from './sync-controller.ts';

const segment = (
  n: number,
  trackStartMs: number,
): RecordingTimelineSegment => ({
  recordingStartMs: n * 5000,
  recordingEndMs: (n + 1) * 5000,
  trackStartMs,
  held: false,
});

const plain: SyncRecording = {
  nudgeMs: 0,
  shaping: { rate: 1, pitchSemitones: 0 },
  timeline: [segment(0, 30_000)],
};

const setup = (
  recording: SyncRecording,
  transportState: { positionMs: number; playing: boolean },
) => {
  const fakeTransport = createFakeTransport(transportState);
  const fakeVoice = createFakeVoice();
  const fakeTimers = createFakeTimers();
  const controller = createSyncController({
    transport: fakeTransport.transport,
    voice: fakeVoice.voice,
    recording,
    timers: fakeTimers.timers,
  });

  return { ...fakeTransport, ...fakeVoice, ...fakeTimers, controller };
};

describe('createSyncController', () => {
  it('starts part-way in when the track is already inside the recording', () => {
    const { calls } = setup(plain, { positionMs: 32_000, playing: true });

    assert.deepEqual(calls, [{ kind: 'start', recordingMs: 2000 }]);
  });

  it('stays silent while the track is paused or outside the recording', () => {
    const paused = setup(plain, { positionMs: 32_000, playing: false });
    const outside = setup(plain, { positionMs: 5000, playing: true });

    assert.deepEqual(paused.calls, []);
    assert.deepEqual(outside.calls, []);
  });

  it('stops on pause and restarts at the looked-up position on play', () => {
    const t = setup(plain, { positionMs: 31_000, playing: true });

    t.emit('pause', { playing: false });
    t.emit('play', { playing: true, positionMs: 33_000 });

    assert.deepEqual(t.calls, [
      { kind: 'start', recordingMs: 1000 },
      { kind: 'stop' },
      { kind: 'start', recordingMs: 3000 },
    ]);
  });

  it('reschedules after a seek and goes silent when the seek leaves the recording', () => {
    const t = setup(plain, { positionMs: 31_000, playing: true });

    t.emit('seek', { positionMs: 34_000 });
    t.emit('seek', { positionMs: 90_000 });

    assert.deepEqual(t.calls.slice(1), [
      { kind: 'start', recordingMs: 4000 },
      { kind: 'stop' },
    ]);
  });

  it('applies a positive nudge by playing the recording later', () => {
    const t = setup(
      { ...plain, nudgeMs: 40 },
      { positionMs: 32_000, playing: true },
    );

    assert.deepEqual(t.calls, [{ kind: 'start', recordingMs: 1960 }]);

    t.controller.setNudgeMs(-10);

    assert.deepEqual(t.calls.at(-1), { kind: 'start', recordingMs: 2010 });
  });

  it('corrects drift beyond the tolerance and leaves small drift alone', () => {
    const t = setup(plain, { positionMs: 32_000, playing: true });

    t.setPosition(2015);
    t.tick();
    assert.equal(t.calls.length, 1);

    t.setPosition(2100);
    t.tick();
    assert.deepEqual(t.calls.at(-1), { kind: 'start', recordingMs: 2000 });
  });

  it('starts when the track enters the recorded range during playback', () => {
    const t = setup(plain, { positionMs: 29_000, playing: true });

    t.move(30_500);
    t.tick();

    assert.deepEqual(t.calls, [{ kind: 'start', recordingMs: 500 }]);
  });

  describe('loop recordings', () => {
    const threePasses: SyncRecording = {
      ...plain,
      timeline: [segment(0, 20_000), segment(1, 20_000), segment(2, 20_000)],
    };

    it('plays pass n over pass n and goes silent after the last pass', () => {
      const t = setup(threePasses, { positionMs: 22_000, playing: true });

      t.emit('loop', { positionMs: 20_000 });
      t.emit('loop', { positionMs: 20_000 });
      t.emit('loop', { positionMs: 20_000 });

      assert.deepEqual(t.calls, [
        { kind: 'start', recordingMs: 2000 },
        { kind: 'start', recordingMs: 5000 },
        { kind: 'start', recordingMs: 10_000 },
        { kind: 'stop' },
      ]);
    });

    it('starts over at the first pass after a seek', () => {
      const t = setup(threePasses, { positionMs: 22_000, playing: true });

      t.emit('loop', { positionMs: 20_000 });
      t.emit('seek', { positionMs: 21_000 });

      assert.deepEqual(t.calls.at(-1), { kind: 'start', recordingMs: 1000 });
    });
  });

  it('stops listening and silences the voice on dispose', () => {
    const t = setup(plain, { positionMs: 32_000, playing: true });

    t.controller.dispose();

    assert.equal(t.listenerCount(), 0);
    assert.equal(t.isActive(), false);
    assert.deepEqual(t.calls.at(-1), { kind: 'stop' });
  });
});
