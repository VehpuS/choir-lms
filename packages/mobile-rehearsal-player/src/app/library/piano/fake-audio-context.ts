import type {
  AudioBufferLike,
  AudioContextLike,
  AudioNodeLike,
  AudioParamLike,
  BufferSourceNodeLike,
  GainNodeLike,
  OscillatorNodeLike,
} from './web-audio-types';

/** A recorded scheduling call on a fake audio parameter. */
export type ParamEvent = {
  kind: 'set' | 'linear' | 'exponential' | 'cancel';
  value?: number;
  time: number;
};

const createParam = (initial = 0) => {
  const events: ParamEvent[] = [];
  const param: AudioParamLike & { events: ParamEvent[] } = {
    value: initial,
    events,
    setValueAtTime: (value, time) => events.push({ kind: 'set', value, time }),
    linearRampToValueAtTime: (value, time) =>
      events.push({ kind: 'linear', value, time }),
    exponentialRampToValueAtTime: (value, time) =>
      events.push({ kind: 'exponential', value, time }),
    cancelScheduledValues: (time) => events.push({ kind: 'cancel', time }),
  };

  return param;
};

const createNode = () => {
  const node: AudioNodeLike & {
    connections: AudioNodeLike[];
    disconnected: boolean;
  } = {
    connections: [],
    disconnected: false,
    connect: (destination) => node.connections.push(destination),
    disconnect: () => {
      node.disconnected = true;
    },
  };

  return node;
};

export type FakeGain = GainNodeLike &
  ReturnType<typeof createNode> & {
    gain: ReturnType<typeof createParam>;
  };
export type FakeOscillator = OscillatorNodeLike &
  ReturnType<typeof createNode> & {
    frequency: ReturnType<typeof createParam>;
    startedAt: number | null;
    stoppedAt: number | null;
  };
export type FakeBufferSource = BufferSourceNodeLike &
  ReturnType<typeof createNode> & {
    playbackRate: ReturnType<typeof createParam>;
    startedAt: number | null;
    stoppedAt: number | null;
  };

/** A recording stand-in for `AudioContext`, with a clock the test advances. */
export const createFakeAudioContext = () => {
  const gains: FakeGain[] = [];
  const oscillators: FakeOscillator[] = [];
  const sources: FakeBufferSource[] = [];
  const decoded: ArrayBuffer[] = [];
  const context = {
    currentTime: 0,
    state: 'suspended',
    destination: createNode(),
    gains,
    oscillators,
    sources,
    decoded,
    resumeCalls: 0,
    resume: async () => {
      context.resumeCalls += 1;
      context.state = 'running';
    },
    close: async () => {
      context.state = 'closed';
    },
    createGain: () => {
      const gain: FakeGain = Object.assign(createNode(), {
        gain: createParam(1),
      });

      gains.push(gain);

      return gain;
    },
    createOscillator: () => {
      const oscillator: FakeOscillator = Object.assign(createNode(), {
        frequency: createParam(),
        type: 'sine',
        startedAt: null,
        stoppedAt: null,
        onended: null,
        start: (time = 0) => {
          oscillator.startedAt = time;
        },
        stop: (time = 0) => {
          oscillator.stoppedAt = time;
        },
      });

      oscillators.push(oscillator);

      return oscillator;
    },
    createBufferSource: () => {
      const source: FakeBufferSource = Object.assign(createNode(), {
        buffer: null,
        playbackRate: createParam(1),
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        startedAt: null,
        stoppedAt: null,
        onended: null,
        start: (time = 0) => {
          source.startedAt = time;
        },
        stop: (time = 0) => {
          source.stoppedAt = time;
        },
      });

      sources.push(source);

      return source;
    },
    decodeAudioData: async (data: ArrayBuffer): Promise<AudioBufferLike> => {
      decoded.push(data);

      return { duration: 2 };
    },
  };

  return context satisfies AudioContextLike & Record<string, unknown>;
};
