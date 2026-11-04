import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PunchState } from '@org/audio-mixing';

import type { RecordingSessionState } from './recording-session.js';
import {
  getRecordingStripModel,
  type RecordingStripModel,
} from './recording-strip-model.js';

const session = (
  overrides: Partial<RecordingSessionState> = {},
): RecordingSessionState => ({
  phase: 'idle',
  elapsedMs: 0,
  timeLeft: null,
  ...overrides,
});

const model = (
  sessionOverrides: Partial<RecordingSessionState> = {},
  options: {
    hasTrack?: boolean;
    markers?: Parameters<typeof getRecordingStripModel>[0]['markers'];
  } = {},
): RecordingStripModel =>
  getRecordingStripModel({
    hasTrack: options.hasTrack ?? true,
    session: session(sessionOverrides),
    markers: options.markers ?? {},
  });

describe('recording strip model', () => {
  it('waits for playback while armed, with a cancel control', () => {
    const armed = model({ phase: 'armed' });

    assert.ok(armed.kind === 'armed');
    assert.equal(armed.title, 'Waiting for playback.');
    assert.equal(armed.stop.action, 'stop');
  });

  it('says the take is paused with its track and stops the clock label', () => {
    const paused = model({ phase: 'recording', paused: true, elapsedMs: 5000 });

    assert.ok(paused.kind === 'recording');
    assert.equal(paused.status, 'Paused with track');
    assert.equal(paused.accessibilityLabel, 'Recording paused, 0:05');
    assert.equal(
      (model({ phase: 'recording', elapsedMs: 5000 }) as { status?: string })
        .status,
      undefined,
    );
  });

  it('asks for a track when none is loaded', () => {
    assert.equal(model({}, { hasTrack: false }).kind, 'no-track');
  });

  it('is ready with a Record action and no readout while there is plenty of space', () => {
    const ready = model();

    assert.equal(ready.kind, 'ready');
    assert.ok(ready.kind === 'ready');
    assert.equal(ready.primary.action, 'record');
    assert.equal(ready.timeLeft, null);
  });

  it('carries the time-left readout in the ready state when space is low', () => {
    const ready = model({
      timeLeft: { text: 'About 25 min left', tone: 'normal' },
    });

    assert.ok(ready.kind === 'ready');
    assert.equal(ready.timeLeft?.text, 'About 25 min left');
  });

  it('explains storage and headphones first, with Continue and Not now', () => {
    const explain = model({ phase: 'explain' });

    assert.ok(explain.kind === 'explain');
    assert.match(explain.body, /never removed automatically/);
    assert.match(explain.body, /headphones/);
    assert.deepEqual(
      [explain.primary.action, explain.secondary.action],
      ['continue', 'not-now'],
    );
  });

  it('says why the microphone is blocked, in words, with the way to retry', () => {
    const denied = model({ phase: 'blocked', blockedReason: 'denied' });
    const inUse = model({ phase: 'blocked', blockedReason: 'in-use' });
    const none = model({ phase: 'blocked', blockedReason: 'unavailable' });

    assert.ok(
      denied.kind === 'blocked' &&
        inUse.kind === 'blocked' &&
        none.kind === 'blocked',
    );
    assert.match(denied.title, /blocked/);
    assert.match(denied.body, /browser's settings/);
    assert.match(inUse.title, /in use/);
    assert.match(none.title, /No microphone/);
    assert.equal(denied.primary.action, 'record');
  });

  it('refuses on low storage and points to Settings', () => {
    const refused = model({ phase: 'refused' });

    assert.ok(refused.kind === 'refused');
    assert.match(refused.body, /“Settings”, then “Recordings”/);
    assert.equal(refused.primary.action, 'open-settings');
  });

  it('shows the indicator, clock, marker context, and Stop while recording', () => {
    const recording = model(
      { phase: 'recording', elapsedMs: 42_900 },
      {
        markers: {
          passed: { name: 'Verse 2', positionMs: 38_000 },
          next: { name: 'Chorus', positionMs: 65_000 },
        },
      },
    );

    assert.ok(recording.kind === 'recording');
    assert.equal(recording.clock, '0:42');
    assert.equal(recording.passed, 'Passed Verse 2 · 0:38');
    assert.equal(recording.next, 'Next Chorus · 1:05');
    assert.equal(recording.stop.action, 'stop');
    assert.equal(recording.accessibilityLabel, 'Recording, 0:42');
  });

  it('records without marker context and carries a warning readout', () => {
    const recording = model({
      phase: 'recording',
      timeLeft: { text: 'About 4 min left', tone: 'warning' },
    });

    assert.ok(recording.kind === 'recording');
    assert.equal(recording.passed, undefined);
    assert.equal(recording.next, undefined);
    assert.equal(recording.timeLeft?.tone, 'warning');
  });

  it('shows the stop message, as a problem when storage failed', () => {
    const stopped = model({
      phase: 'stopped',
      stopMessage: {
        message: 'Storage is full',
        isProblem: true,
        offerExport: true,
      },
    });

    assert.ok(stopped.kind === 'stopped');
    assert.equal(stopped.isProblem, true);
    assert.equal(stopped.primary.action, 'dismiss');
  });

  it('keeps showing the recording while it records even if the track is unloaded', () => {
    assert.equal(
      model({ phase: 'recording' }, { hasTrack: false }).kind,
      'recording',
    );
  });

  it('offers Record between… beside Record when ready', () => {
    const ready = model();

    assert.ok(ready.kind === 'ready');
    assert.equal(ready.between.action, 'record-between');
  });

  describe('with an armed punch range', () => {
    const range = {
      inMs: 110_000,
      keepPlayingAfterOut: false,
      outMs: 125_000,
      preRollMs: 3000,
    };
    const withPunch = (state: PunchState) =>
      getRecordingStripModel({
        hasTrack: true,
        markers: {},
        punch: { outLabel: 'Bridge', span: 'Chorus → Bridge', state },
        session: session(),
      });

    it('names the span and offers Play and Disarm while it waits', () => {
      const armed = withPunch({ phase: 'armed', range });

      assert.ok(armed.kind === 'punch-armed');
      assert.equal(armed.title, 'Armed · Chorus → Bridge');
      assert.match(armed.body, /3 s before/);
      assert.deepEqual(
        [armed.primary.action, armed.disarm.action],
        ['play-punch', 'disarm'],
      );
    });

    it('counts down to the in point and can still be disarmed', () => {
      const counting = withPunch({
        countdownSeconds: 2,
        phase: 'countdown',
        range,
      });

      assert.ok(counting.kind === 'punch-countdown');
      assert.equal(counting.title, 'Recording in 2…');
      assert.equal(counting.disarm.action, 'disarm');
    });

    it('shows the ordinary strip once the range is no longer waiting', () => {
      assert.equal(withPunch({ phase: 'idle' }).kind, 'ready');
      assert.equal(withPunch({ phase: 'recording', range }).kind, 'ready');
    });

    it('shows where a punch take stops and how long is left, in place of the markers', () => {
      const recording = getRecordingStripModel({
        hasTrack: true,
        markers: { next: { name: 'Coda', positionMs: 1000 } },
        punch: {
          outLabel: 'Bridge',
          span: 'Chorus → Bridge',
          state: { phase: 'recording', range, remainingMs: 37_000 },
        },
        session: session({ phase: 'recording', elapsedMs: 14_000 }),
      });

      assert.ok(recording.kind === 'recording');
      assert.equal(recording.punchStops, 'Stops at Bridge in 0:37');
      assert.equal(recording.punchRange, 'Range · Chorus → Bridge');
      assert.equal(recording.next, undefined);
    });

    it('never hides a take that is being captured', () => {
      const recording = getRecordingStripModel({
        hasTrack: true,
        markers: {},
        punch: {
          outLabel: 'x',
          span: 'x',
          state: { phase: 'armed', range },
        },
        session: session({ phase: 'recording', elapsedMs: 1000 }),
      });

      assert.equal(recording.kind, 'recording');
    });
  });
});
