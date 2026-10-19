/**
 * The small slice of Web Audio the piano voices use. Voices depend on this
 * instead of the DOM types so a fake context can drive them in tests, and so
 * the voice files carry no browser globals.
 */
export type AudioParamLike = {
  value: number;
  setValueAtTime: (value: number, time: number) => unknown;
  linearRampToValueAtTime: (value: number, time: number) => unknown;
  exponentialRampToValueAtTime: (value: number, time: number) => unknown;
  cancelScheduledValues: (time: number) => unknown;
};

export type AudioNodeLike = {
  connect: (destination: AudioNodeLike) => unknown;
  disconnect: () => unknown;
};

export type GainNodeLike = AudioNodeLike & { gain: AudioParamLike };

export type OscillatorNodeLike = AudioNodeLike & {
  frequency: AudioParamLike;
  type: string;
  start: (time?: number) => unknown;
  stop: (time?: number) => unknown;
  onended: (() => void) | null;
};

export type AudioBufferLike = { duration: number };

export type BufferSourceNodeLike = AudioNodeLike & {
  buffer: AudioBufferLike | null;
  playbackRate: AudioParamLike;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  start: (time?: number, offset?: number) => unknown;
  stop: (time?: number) => unknown;
  onended: (() => void) | null;
};

export type AudioContextLike = {
  readonly currentTime: number;
  readonly destination: AudioNodeLike;
  readonly state: string;
  resume: () => Promise<unknown>;
  close: () => Promise<unknown>;
  createGain: () => GainNodeLike;
  createOscillator: () => OscillatorNodeLike;
  createBufferSource: () => BufferSourceNodeLike;
  decodeAudioData: (data: ArrayBuffer) => Promise<AudioBufferLike>;
};
