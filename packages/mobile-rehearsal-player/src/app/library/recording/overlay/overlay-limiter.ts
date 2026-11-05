import {
  MIX_LIMITER_PROCESSOR_NAME,
  createCeilingCurve,
  getMixLimiterWorkletSource,
} from '@org/audio-mixing';

/**
 * The limiter on the recording's own output (rehearsal-recording design
 * Decision 21, task 14.19): the same peak limiter and ceiling the exported mix
 * ends in, run as an `AudioWorklet` so the sound while playing is what the
 * export contains. The browser's `DynamicsCompressorNode` was used before, but
 * it adds make-up gain that an offline render cannot match, which made the live
 * overlay about 0.9 dB louder for quiet recordings. Where a worklet is not
 * available (an insecure page, an old browser) only the ceiling curve is
 * applied: quiet audio is untouched and nothing reaches full scale, but peaks
 * are not eased down first. It covers the recording only; the track reaches
 * the browser's output through the media element, so the sum of the two is
 * limited only in an exported mix.
 */

type ConnectableNode = {
  connect: (destination: unknown) => unknown;
  disconnect: () => void;
};

/** The slice of the browser's `WaveShaperNode` the fallback sets. */
export type ShaperNode = ConnectableNode & {
  curve: Float32Array | null;
  oversample: string;
};

export type LimiterContext = {
  createWaveShaper: () => ShaperNode;
  /** Absent where worklets are not supported. */
  audioWorklet?: { addModule: (url: string) => Promise<void> };
};

/** What the limiter needs from the page, so it runs without a browser in specs. */
export type LimiterHost = {
  /** Makes the worklet node for a context that loaded the processor. */
  createLimiterNode: (context: LimiterContext, name: string) => ConnectableNode;
  /** A URL a worklet can load the source from. */
  createModuleUrl: (source: string) => string;
};

/** A limiter: connect into `input`, and `output` onward. */
export type Limiter = {
  input: ConnectableNode;
  output: ConnectableNode;
  disconnect: () => void;
};

type BrowserGlobals = {
  AudioWorkletNode?: new (context: unknown, name: string) => ConnectableNode;
  Blob?: new (parts: string[], options: { type: string }) => unknown;
  URL?: { createObjectURL: (blob: unknown) => string };
};

const browserHost = (): LimiterHost => {
  const scope = globalThis as unknown as BrowserGlobals;

  return {
    createLimiterNode: (context, name) => {
      if (!scope.AudioWorkletNode) {
        throw new Error('AudioWorkletNode is not available');
      }

      return new scope.AudioWorkletNode(context, name);
    },
    createModuleUrl: (source) => {
      if (!scope.Blob || !scope.URL) {
        throw new Error('Blob URLs are not available');
      }

      return scope.URL.createObjectURL(
        new scope.Blob([source], { type: 'text/javascript' }),
      );
    },
  };
};

// A context loads the processor once; later overlays reuse it.
const loadedContexts = new WeakSet<object>();

const loadProcessor = async (context: LimiterContext, host: LimiterHost) => {
  if (!context.audioWorklet) {
    return false;
  }

  if (loadedContexts.has(context)) {
    return true;
  }

  try {
    await context.audioWorklet.addModule(
      host.createModuleUrl(getMixLimiterWorkletSource()),
    );
    loadedContexts.add(context);

    return true;
  } catch {
    return false;
  }
};

const createCeiling = (context: LimiterContext): ShaperNode => {
  const ceiling = context.createWaveShaper();

  ceiling.curve = createCeilingCurve();
  ceiling.oversample = '2x';

  return ceiling;
};

export const createOverlayLimiter = async (
  context: LimiterContext,
  host: LimiterHost = browserHost(),
): Promise<Limiter> => {
  if (await loadProcessor(context, host)) {
    try {
      const node = host.createLimiterNode(context, MIX_LIMITER_PROCESSOR_NAME);

      return { disconnect: () => node.disconnect(), input: node, output: node };
    } catch {
      // Fall through to the ceiling alone.
    }
  }

  const ceiling = createCeiling(context);

  return {
    disconnect: () => ceiling.disconnect(),
    input: ceiling,
    output: ceiling,
  };
};
