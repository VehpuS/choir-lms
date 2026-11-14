/**
 * The slice of the browser's microphone and Web Audio APIs the web source
 * uses. The app compiles without the DOM lib, so these stand in for it (the
 * piano does the same in `piano/web-audio-types.ts`).
 */
export type MediaStreamTrackLike = {
  stop: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export type MediaStreamLike = { getTracks: () => MediaStreamTrackLike[] };

export type MicrophoneConstraints = {
  audio:
    | true
    | {
        echoCancellation: boolean;
        noiseSuppression: boolean;
        autoGainControl: boolean;
        channelCount: number;
        /** `ideal`, so an input that has been unplugged falls back to the default. */
        deviceId?: { ideal: string };
      };
};

export type MediaDeviceInfoLike = {
  deviceId: string;
  kind: string;
  label: string;
};

export type WorkletMessageEvent = {
  data: { samples: Float32Array; timeSec: number };
};

export type MicAudioNodeLike = {
  connect: (destination: MicAudioNodeLike) => unknown;
  disconnect: () => unknown;
};

export type WorkletNodeLike = MicAudioNodeLike & {
  port: { onmessage: ((event: WorkletMessageEvent) => void) | null };
};

export type MicAudioContextLike = {
  sampleRate: number;
  state: string;
  destination: MicAudioNodeLike;
  audioWorklet: { addModule: (url: string) => Promise<void> };
  createMediaStreamSource: (stream: MediaStreamLike) => MicAudioNodeLike;
  createGain: () => MicAudioNodeLike & { gain: { value: number } };
  /** Pairs a context time with a `performance.now()` time; absent in older browsers. */
  getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number };
  resume: () => Promise<void>;
  close: () => Promise<void>;
  onstatechange: (() => void) | null;
};

export type BrowserMicrophoneGlobals = {
  navigator?: {
    mediaDevices?: {
      enumerateDevices?: () => Promise<MediaDeviceInfoLike[]>;
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
      getUserMedia?: (
        constraints: MicrophoneConstraints,
      ) => Promise<MediaStreamLike>;
    };
    permissions?: {
      query?: (descriptor: { name: string }) => Promise<{ state: string }>;
    };
  };
  AudioContext?: new () => MicAudioContextLike;
  AudioWorkletNode?: new (
    context: MicAudioContextLike,
    name: string,
  ) => WorkletNodeLike;
  Blob?: new (parts: string[], options: { type: string }) => unknown;
  URL?: {
    createObjectURL: (blob: unknown) => string;
    revokeObjectURL: (url: string) => void;
  };
};
