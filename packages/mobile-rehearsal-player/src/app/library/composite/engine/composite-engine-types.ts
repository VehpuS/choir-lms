import type {
  PcmWindowReader,
  SyncTimers,
  VoiceContext,
  VoiceNode,
  WindowedVoice,
} from '@org/audio-mixing';

export type EngineContext = VoiceContext & {
  destination: VoiceNode;
  resume: () => Promise<void>;
};

/**
 * Shapes the summed signal. The source voices already play at `rate`, so the
 * stage is told the same rate and the semitones and compensates the pitch change
 * that the speed causes, itself (spike 1.2).
 */
export type PitchStage = {
  input: VoiceNode;
  output: VoiceNode;
  update: (shape: { rate: number; pitchSemitones: number }) => void;
  dispose: () => void;
};

export type EngineStem = {
  id: string;
  /** Later when positive, earlier (start trimmed) when negative. */
  offsetMs: number;
  reader: PcmWindowReader;
};

export type CompositeEngineState = 'paused' | 'playing' | 'ended';

export type CompositeEngineOptions = {
  context: EngineContext;
  stems: readonly EngineStem[];
  /** Connect into `input`, and `output` onward; the same ceiling the export ends in. */
  limiter: { input: VoiceNode; output: VoiceNode };
  /** Absent where audio worklets are not available; the speed then also moves the pitch. */
  pitchStage?: PitchStage | null;
  /** The gain of each stem when the engine is built (the session mix, already resolved). */
  initialGains?: Readonly<Record<string, number>>;
  timers?: SyncTimers;
  createVoice?: (
    output: VoiceNode,
    reader: PcmWindowReader,
    onUnavailable: (error: unknown) => void,
  ) => WindowedVoice;
  /** A stem whose audio cannot be read; the rest keep playing. */
  onStemUnavailable?: (stemId: string, error: unknown) => void;
};

export type EngineLoop = { startMs: number; endMs: number };

export type CompositeEngine = {
  readonly durationMs: number;
  /** False without a pitch stage: a speed other than 1 then changes the pitch too. */
  readonly canCompensatePitch: boolean;
  getState: () => CompositeEngineState;
  getPositionMs: () => number;
  getRate: () => number;
  /** The master level, 0 to 1. */
  getVolume: () => number;
  subscribe: (listener: () => void) => () => void;
  play: () => void;
  pause: () => void;
  seek: (positionMs: number) => void;
  /**
   * Plays the range over and over: the wrap is scheduled ahead on the context
   * clock so the stems start over without a gap. Null stops looping.
   */
  setLoop: (loop: EngineLoop | null) => void;
  getLoop: () => EngineLoop | null;
  setStemGains: (gains: Readonly<Record<string, number>>) => void;
  setRate: (rate: number) => void;
  setPitchSemitones: (semitones: number) => void;
  setVolume: (volume: number) => void;
  dispose: () => void;
};
