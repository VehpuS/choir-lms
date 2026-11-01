import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFakeTimers, createFakeTransport } from './mixing-test-fakes.ts';
import { createTransportTracker } from './transport-tracker.ts';

const SAMPLE_STEP_MS = 100;

const setup = (
  options: { rate?: number; latencyMs?: number; playing?: boolean } = {},
) => {
  const rate = options.rate ?? 1;
  const fake = createFakeTransport({
    positionMs: 30_000,
    playing: options.playing ?? true,
  });
  const fakeTimers = createFakeTimers();
  let now = 5_000;
  const tracker = createTransportTracker({
    transport: fake.transport,
    rate,
    latencyMs: options.latencyMs ?? 0,
    nowMs: () => now,
    timers: fakeTimers.timers,
  });
  let playing = options.playing ?? true;
  let position = 30_000;

  return {
    ...fake,
    tracker,
    /** Runs the player and the sampler forward in 100 ms steps. */
    advance: (ms: number) => {
      for (let done = 0; done < ms; done += SAMPLE_STEP_MS) {
        now += SAMPLE_STEP_MS;
        position += playing ? rate * SAMPLE_STEP_MS : 0;
        fake.move(position);
        fakeTimers.tick();
      }
    },
    seek: (to: number) => {
      position = to;
      fake.emit('seek', { positionMs: to });
    },
    pause: () => {
      playing = false;
      fake.emit('pause', { playing: false });
    },
    play: () => {
      playing = true;
      fake.emit('play', { playing: true });
    },
    /** Moves the track without telling anyone, like an unannounced loop wrap. */
    jump: (to: number) => {
      position = to;
    },
    wrap: (to: number) => {
      position = to;
      fake.emit('loop', { positionMs: to });
    },
    isSampling: fakeTimers.isActive,
  };
};

describe('createTransportTracker', () => {
  it('records one segment from where the track was when recording began', () => {
    const run = setup();

    run.advance(10_000);

    assert.deepEqual(run.tracker.getTimeline(10_000), [
      {
        recordingStartMs: 0,
        recordingEndMs: 10_000,
        trackStartMs: 30_000,
        held: false,
      },
    ]);
  });

  it('covers only seven seconds of track in ten seconds at 0.7×', () => {
    const run = setup({ rate: 0.7 });

    run.advance(10_000);
    run.seek(40_000);
    run.advance(1_000);

    const [first, second] = run.tracker.getTimeline(11_000);

    assert.equal(first?.recordingEndMs, 10_000);
    assert.equal(second?.trackStartMs, 40_000);
  });

  it('starts a new segment at the new position after a seek', () => {
    const run = setup();

    run.advance(2_000);
    run.seek(90_000);
    run.advance(3_000);

    const timeline = run.tracker.getTimeline(5_000);

    assert.equal(timeline.length, 2);
    assert.equal(timeline[1]?.recordingStartMs, 2_000);
    assert.equal(timeline[1]?.trackStartMs, 90_000);
  });

  it('leaves paused time out of the take and continues from where it paused', () => {
    const run = setup();

    run.advance(2_000);
    run.pause();
    run.advance(3_000);
    run.play();
    run.advance(1_000);

    // Six seconds passed, but the recorder kept three: two before the pause, one after.
    const timeline = run.tracker.getTimeline(3_000);

    assert.deepEqual(
      timeline.map((segment) => [
        segment.recordingStartMs,
        segment.recordingEndMs,
        segment.trackStartMs,
        segment.held,
      ]),
      [
        [0, 2_000, 30_000, false],
        [2_000, 3_000, 32_000, false],
      ],
    );
  });

  it('records one segment per pass over a loop', () => {
    const run = setup();

    run.advance(4_000);
    run.wrap(30_000);
    run.advance(4_000);
    run.wrap(30_000);
    run.advance(4_000);

    const timeline = run.tracker.getTimeline(12_000);

    assert.equal(timeline.length, 3);
    assert.deepEqual(
      timeline.map((segment) => segment.trackStartMs),
      [30_000, 30_000, 30_000],
    );
  });

  it('notices a jump the player never announced', () => {
    const run = setup();

    run.advance(2_000);
    run.jump(10_000);
    run.advance(1_000);

    assert.equal(run.tracker.getTimeline(3_000).length, 2);
  });

  it('shifts changes later by the latency and extends the first segment back', () => {
    const run = setup({ latencyMs: 100 });

    run.advance(2_000);
    run.seek(90_000);
    run.advance(2_000);

    const [first, second] = run.tracker.getTimeline(4_000);

    assert.equal(first?.trackStartMs, 29_900);
    assert.equal(second?.recordingStartMs, 2_100);
  });

  it('starts the recording at the origin when the first sample came later', () => {
    const run = setup();

    run.advance(1_000);
    run.tracker.setOriginWallMs(5_500);
    run.advance(1_000);

    const [first] = run.tracker.getTimeline(1_500);

    assert.equal(first?.recordingStartMs, 0);
    assert.equal(first?.trackStartMs, 30_500);
  });

  it('drops a stretch that ended before the first sample', () => {
    const run = setup();

    run.seek(10_000);
    run.advance(500);
    run.tracker.setOriginWallMs(5_400);
    run.advance(1_000);

    const timeline = run.tracker.getTimeline(1_100);

    assert.equal(timeline.length, 1);
    assert.equal(timeline[0]?.trackStartMs, 10_400);
  });

  it('stops listening and sampling on dispose', () => {
    const run = setup();

    run.tracker.dispose();

    assert.equal(run.listenerCount(), 0);
    assert.equal(run.isSampling(), false);
  });
});
