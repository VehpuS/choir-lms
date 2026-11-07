import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  PcmWindowReader,
  SyncTimers,
  VoiceNode,
  WindowedVoice,
} from '@org/audio-mixing';

import {
  createCompositeEngine,
  ENGINE_START_LEAD_S,
  type EngineContext,
  type PitchStage,
} from './composite-engine.js';

type Call = { name: string; args: unknown[] };

const createReader = (durationMs: number): PcmWindowReader => ({
  sampleRate: 1000,
  sampleCount: durationMs,
  durationMs,
  read: async () => new Float32Array(0),
});

/** A voice that records what the engine asked of it, instead of making sound. */
const createFakeVoice = (name: string, log: Call[]): WindowedVoice => ({
  start: (...args) => log.push({ name: `${name}.start`, args }),
  stop: () => log.push({ name: `${name}.stop`, args: [] }),
  setRate: (...args) => log.push({ name: `${name}.setRate`, args }),
  getPositionMs: () => null,
  dispose: () => log.push({ name: `${name}.dispose`, args: [] }),
});

const createFakeContext = () => {
  const clock = { currentTime: 10 };
  const gains: Array<{ value: number; ramps: Array<[number, number]> }> = [];
  const node = (): VoiceNode => ({ connect: () => undefined });
  const context: EngineContext = {
    get currentTime() {
      return clock.currentTime;
    },
    destination: node(),
    resume: async () => undefined,
    createBuffer: () => ({ copyToChannel: () => undefined }),
    createBufferSource: () => {
      throw new Error('voices are faked');
    },
    createGain: () => {
      const record = { value: 1, ramps: [] as Array<[number, number]> };

      gains.push(record);

      return {
        connect: () => undefined,
        gain: {
          get value() {
            return record.value;
          },
          set value(next: number) {
            record.value = next;
          },
          setValueAtTime: () => undefined,
          linearRampToValueAtTime: (target: number, time: number) => {
            record.ramps.push([target, time]);
            record.value = target;
          },
        },
      };
    },
  };

  return { context, clock, gains };
};

const createManualTimers = () => {
  let callback: (() => void) | null = null;
  const timers: SyncTimers = {
    setInterval: (cb) => {
      callback = cb;

      return 1;
    },
    clearInterval: () => {
      callback = null;
    },
  };

  return { timers, tick: () => callback?.() };
};

const setup = (
  stems: Array<{ id: string; offsetMs: number; durationMs: number }>,
  extra: { pitchStage?: PitchStage } = {},
) => {
  const fake = createFakeContext();
  const log: Call[] = [];
  const manual = createManualTimers();
  const limiterNode: VoiceNode = { connect: () => undefined };
  const engine = createCompositeEngine({
    context: fake.context,
    stems: stems.map((stem) => ({
      id: stem.id,
      offsetMs: stem.offsetMs,
      reader: createReader(stem.durationMs),
    })),
    limiter: { input: limiterNode, output: limiterNode },
    timers: manual.timers,
    createVoice: (_output, reader) => {
      const stem = stems.find(
        (entry) => entry.durationMs === reader.durationMs,
      );

      return createFakeVoice(stem?.id ?? '?', log);
    },
    ...extra,
  });

  return { engine, fake, gains: fake.gains, log, manual };
};

const starts = (log: Call[]) =>
  log.filter((call) => call.name.endsWith('.start'));

describe('composite engine scheduling', () => {
  it('starts every stem at one context time from the same position', () => {
    const { engine, fake, log } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
      { id: 'a', offsetMs: 0, durationMs: 61_000 },
      { id: 'b', offsetMs: 0, durationMs: 62_000 },
    ]);

    engine.seek(5000);
    engine.play();

    const when = fake.clock.currentTime + ENGINE_START_LEAD_S;

    assert.deepEqual(
      starts(log).map((call) => call.args),
      [
        [5000, when],
        [5000, when],
        [5000, when],
      ],
    );
    assert.equal(engine.getState(), 'playing');
  });

  it('is as long as the longest stem counting offsets', () => {
    const { engine } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
      { id: 'a', offsetMs: 500, durationMs: 61_000 },
    ]);

    assert.equal(engine.durationMs, 61_500);
  });

  it('delays a stem with a positive offset and trims a negative one', () => {
    const { engine, fake, log } = setup([
      { id: 'late', offsetMs: 250, durationMs: 60_000 },
      { id: 'early', offsetMs: -100, durationMs: 61_000 },
    ]);

    engine.play();

    const when = fake.clock.currentTime + ENGINE_START_LEAD_S;
    const [late, early] = starts(log);

    // From composite time 0: the late stem is 250 ms before its own start...
    assert.equal(late.args[0], 0);
    assert.ok(Math.abs((late.args[1] as number) - (when + 0.25)) < 1e-9);
    // ...and the early stem plays from 100 ms into itself, right now.
    assert.deepEqual(early.args, [100, when]);
  });

  it('does not start a stem that has already ended at the position', () => {
    const { engine, log } = setup([
      { id: 'long', offsetMs: 0, durationMs: 60_000 },
      { id: 'short', offsetMs: 0, durationMs: 10_000 },
    ]);

    engine.seek(20_000);
    engine.play();

    assert.deepEqual(
      starts(log).map((call) => call.name),
      ['long.start'],
    );
  });

  it('reports the position from the context clock and holds it when paused', () => {
    const { engine, fake } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
    ]);

    engine.play();
    fake.clock.currentTime += ENGINE_START_LEAD_S + 2;

    assert.equal(Math.round(engine.getPositionMs()), 2000);

    engine.pause();
    fake.clock.currentTime += 5;

    assert.equal(Math.round(engine.getPositionMs()), 2000);
    assert.equal(engine.getState(), 'paused');
  });

  it('seeks while playing by restarting every voice, and while paused by moving the position', () => {
    const { engine, log } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
      { id: 'a', offsetMs: 0, durationMs: 61_000 },
    ]);

    engine.seek(3000);

    assert.equal(starts(log).length, 0);
    assert.equal(engine.getPositionMs(), 3000);

    engine.play();
    engine.seek(9000);

    assert.deepEqual(
      starts(log)
        .slice(2)
        .map((call) => call.args[0]),
      [9000, 9000],
    );
  });

  it('ends at the duration, notifies, and starts over on the next play', () => {
    const { engine, fake, manual, log } = setup([
      { id: 's', offsetMs: 0, durationMs: 2000 },
    ]);
    let notified = 0;

    engine.subscribe(() => (notified += 1));
    engine.play();
    fake.clock.currentTime += ENGINE_START_LEAD_S + 3;
    manual.tick();

    assert.equal(engine.getState(), 'ended');
    assert.equal(engine.getPositionMs(), 2000);
    assert.ok(notified >= 2);

    engine.play();

    assert.equal(starts(log).at(-1)?.args[0], 0);
  });
});

describe('composite engine shaping', () => {
  const createPitchStage = () => {
    const updates: Array<{ rate: number; pitchSemitones: number }> = [];
    const node: VoiceNode = { connect: () => undefined };
    const stage: PitchStage = {
      input: node,
      output: node,
      update: (shape) => updates.push(shape),
      dispose: () => undefined,
    };

    return { stage, updates };
  };

  it('re-anchors playing voices at the current position when the rate changes', () => {
    const { engine, fake, log } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
    ]);

    engine.play();
    fake.clock.currentTime += ENGINE_START_LEAD_S + 10;
    engine.setRate(0.7);

    const restart = starts(log).at(-1);

    assert.equal(Math.round(restart?.args[0] as number), 10_000);
    assert.deepEqual(
      log
        .filter((call) => call.name === 's.setRate')
        .map((call) => call.args[0]),
      [1, 0.7],
    );

    fake.clock.currentTime += ENGINE_START_LEAD_S + 10;

    // 10 s of context time at 0.7 is 7 s of media.
    assert.equal(Math.round(engine.getPositionMs()), 17_000);
  });

  it('sends the rate and pitch to the pitch stage and routes the sum through it only when shaped', () => {
    const { stage, updates } = createPitchStage();
    const { engine, fake, gains } = setup(
      [{ id: 's', offsetMs: 0, durationMs: 60_000 }],
      { pitchStage: stage },
    );

    engine.play();
    engine.setPitchSemitones(2);
    engine.setRate(1.3);

    assert.deepEqual(updates.at(-1), { rate: 1.3, pitchSemitones: 2 });

    // gains: [sum, dry, wet, master, stem]; the wet path is on, the dry off.
    const [, dry, wet] = gains;

    assert.equal(dry.value, 0);
    assert.equal(wet.value, 1);

    engine.setPitchSemitones(0);
    engine.setRate(1);

    assert.equal(dry.value, 1);
    assert.equal(wet.value, 0);
    assert.ok(fake.clock.currentTime > 0);
  });

  it('shapes through the pitch stage for a speed change alone', () => {
    const { stage, updates } = createPitchStage();
    const { engine, gains } = setup(
      [{ id: 's', offsetMs: 0, durationMs: 60_000 }],
      {
        pitchStage: stage,
      },
    );

    engine.setRate(0.7);

    assert.deepEqual(updates.at(-1), { rate: 0.7, pitchSemitones: 0 });
    // The shaped path carries the sum even before playing starts.
    assert.equal(gains[1].value, 0);
    assert.equal(gains[2].value, 1);
  });

  it('says it cannot compensate pitch without a pitch stage', () => {
    const { engine } = setup([{ id: 's', offsetMs: 0, durationMs: 60_000 }]);

    assert.equal(engine.canCompensatePitch, false);
  });
});

describe('composite engine gains', () => {
  it('ramps a stem to its new gain and leaves unnamed stems alone', () => {
    const { engine, gains } = setup([
      { id: 's', offsetMs: 0, durationMs: 60_000 },
      { id: 'a', offsetMs: 0, durationMs: 61_000 },
    ]);

    engine.setStemGains({ a: 0 });

    // The stem gains come after sum, dry, wet and master.
    const [stemS, stemA] = gains.slice(4);

    assert.equal(stemS.ramps.length, 0);
    assert.deepEqual(stemA.ramps[0]?.[0], 0);
  });

  it('starts at the initial gains', () => {
    const fake = createFakeContext();
    const node: VoiceNode = { connect: () => undefined };

    createCompositeEngine({
      context: fake.context,
      stems: [{ id: 's', offsetMs: 0, reader: createReader(1000) }],
      limiter: { input: node, output: node },
      initialGains: { s: 0.5 },
      timers: createManualTimers().timers,
      createVoice: () => createFakeVoice('s', []),
    });

    assert.equal(fake.gains.at(-1)?.value, 0.5);
  });
});
