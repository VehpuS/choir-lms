import { toPcmSourceError } from './microphone-errors';
import { createFrameAssembler } from './pcm-frame-assembler';
import {
  PcmSourceError,
  type PcmPermission,
  type PcmSource,
} from './pcm-source-types';
import {
  createSharedPcmSource,
  type OpenMicrophone,
  type PcmEmitter,
} from './shared-pcm-source';
import type {
  BrowserMicrophoneGlobals,
  MicAudioContextLike,
} from './web-microphone-types';

const PROCESSOR_NAME = 'choirlms-pcm-tap';
/**
 * Runs on the audio thread: copies each 128-sample block of the first input
 * channel to the main thread with the block's start time on the audio clock.
 */
const WORKLET_SOURCE = `
class PcmTap extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      const samples = new Float32Array(channel);
      this.port.postMessage({ samples, timeSec: currentTime }, [samples.buffer]);
    }
    return true;
  }
}
registerProcessor('${PROCESSOR_NAME}', PcmTap);
`;
const PERMISSION_STATES: readonly PcmPermission[] = [
  'prompt',
  'granted',
  'denied',
];
const browser = () => globalThis as unknown as BrowserMicrophoneGlobals;

const queryPermission = async (): Promise<PcmPermission> => {
  try {
    const status = await browser().navigator?.permissions?.query?.({
      name: 'microphone',
    });
    const state = status?.state as PcmPermission | undefined;

    return state && PERMISSION_STATES.includes(state) ? state : 'unknown';
  } catch {
    // Some browsers do not know the `microphone` permission name.
    return 'unknown';
  }
};

const loadWorklet = async (context: MicAudioContextLike) => {
  const { Blob: BlobCtor, URL: Urls } = browser();

  if (!BlobCtor || !Urls) {
    throw new PcmSourceError('unavailable');
  }

  const url = Urls.createObjectURL(
    new BlobCtor([WORKLET_SOURCE], { type: 'text/javascript' }),
  );

  try {
    await context.audioWorklet.addModule(url);
  } finally {
    Urls.revokeObjectURL(url);
  }
};

const openMicrophone = async (emitter: PcmEmitter): Promise<OpenMicrophone> => {
  const {
    navigator,
    AudioContext: ContextCtor,
    AudioWorkletNode: NodeCtor,
  } = browser();

  if (!navigator?.mediaDevices?.getUserMedia || !ContextCtor || !NodeCtor) {
    throw new PcmSourceError('unavailable');
  }

  // Echo cancellation, noise suppression and auto gain would mangle pitch
  // (and a faithful recording), so all three are off.
  const stream = await navigator.mediaDevices
    .getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    })
    .catch((error: unknown) => {
      throw toPcmSourceError(error);
    });
  const context = new ContextCtor();
  const tracks = stream.getTracks();

  const closeAll = () => {
    tracks.forEach((track) => track.stop());
    void context.close().catch(() => undefined);
  };

  try {
    await loadWorklet(context);
    await context.resume();
  } catch (error) {
    closeAll();
    throw toPcmSourceError(error);
  }

  const assembler = createFrameAssembler();
  const tap = new NodeCtor(context, PROCESSOR_NAME);
  // A node with no path to the destination may never be pulled, so route it
  // through a silent gain.
  const silent = context.createGain();
  const handleEnded = () => {
    closeAll();
    emitter.ended();
  };
  const handleMute = () => emitter.interrupted();
  const handleUnmute = () => emitter.recovered();

  silent.gain.value = 0;
  tap.port.onmessage = ({ data }) => {
    assembler
      .push(data.samples, data.timeSec, context.sampleRate)
      .forEach((frame) => emitter.frame(frame));
  };
  context.createMediaStreamSource(stream).connect(tap);
  tap.connect(silent);
  silent.connect(context.destination);

  tracks.forEach((track) => {
    track.addEventListener('ended', handleEnded);
    track.addEventListener('mute', handleMute);
    track.addEventListener('unmute', handleUnmute);
  });
  // Safari reports a phone call or Siri as an `interrupted` context state.
  context.onstatechange = () => {
    if (context.state === 'running') {
      emitter.recovered();
    } else if (context.state !== 'closed') {
      emitter.interrupted();
    }
  };

  return {
    close: () => {
      tracks.forEach((track) => {
        track.removeEventListener('ended', handleEnded);
        track.removeEventListener('mute', handleMute);
        track.removeEventListener('unmute', handleUnmute);
      });
      tap.port.onmessage = null;
      context.onstatechange = null;
      closeAll();
    },
  };
};

const webPcmSource: PcmSource = createSharedPcmSource({
  open: openMicrophone,
  queryPermission,
});

export const getPcmSource = (): PcmSource => webPcmSource;
