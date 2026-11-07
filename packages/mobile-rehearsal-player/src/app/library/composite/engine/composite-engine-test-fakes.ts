import type {
  PcmWindowReader,
  SyncTimers,
  VoiceNode,
  WindowedVoice,
} from '@org/audio-mixing';

import {
  createCompositeEngine,
  type EngineContext,
  type PitchStage,
} from './composite-engine';

export type Call = { name: string; args: unknown[] };

export const createReader = (durationMs: number): PcmWindowReader => ({
  sampleRate: 1000,
  sampleCount: durationMs,
  durationMs,
  read: async () => new Float32Array(0),
});

/** A voice that records what the engine asked of it, instead of making sound. */
export const createFakeVoice = (name: string, log: Call[]): WindowedVoice => ({
  start: (...args) => log.push({ name: `${name}.start`, args }),
  stop: () => log.push({ name: `${name}.stop`, args: [] }),
  setRate: (...args) => log.push({ name: `${name}.setRate`, args }),
  getPositionMs: () => null,
  dispose: () => log.push({ name: `${name}.dispose`, args: [] }),
});

export const createFakeContext = () => {
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

export const createManualTimers = () => {
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

export const setup = (
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

export const starts = (log: Call[]) =>
  log.filter((call) => call.name.endsWith('.start'));
