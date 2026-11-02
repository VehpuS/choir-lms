import type { Recording } from '@org/audio-library-models';
import {
  createLoopAwareTransport,
  createSyncController,
  createWavWindowReader,
  createWindowedVoice,
  type VoiceContext,
  type VoiceGain,
  type VoiceNode,
} from '@org/audio-mixing';

import { getRecordingsStore } from '../recordings-store-instance';
import { getRecordingTransport } from '../recording-transport';
import {
  MISSING_RECORDING_AUDIO_MESSAGE,
  setRecordingOverlayStatus,
} from './recording-overlay-status';
import type {
  RecordingOverlayHandle,
  RecordingOverlayOptions,
} from './recording-overlay';

export type {
  RecordingOverlayHandle,
  RecordingOverlayOptions,
} from './recording-overlay';

/** The slice of the browser's `AudioContext` the overlay uses (this build has no DOM types). */
type OverlayAudioContext = Omit<VoiceContext, 'createGain'> & {
  destination: VoiceNode;
  resume: () => Promise<void>;
  createGain: () => VoiceGain & { disconnect: () => void };
};

let sharedContext: OverlayAudioContext | null = null;

/** One output context for every overlay, created on first use after a user action. */
const getOverlayContext = (): OverlayAudioContext | null => {
  const Ctor = (globalThis as { AudioContext?: new () => OverlayAudioContext })
    .AudioContext;

  if (!Ctor) {
    return null;
  }

  sharedContext = sharedContext ?? new Ctor();

  return sharedContext;
};

const reportMissing = () =>
  setRecordingOverlayStatus({
    kind: 'missing-audio',
    message: MISSING_RECORDING_AUDIO_MESSAGE,
  });

/**
 * Plays the recording over the playing track: the controller watches the
 * track's media element and keeps a windowed voice in step with it. Returns
 * `null` when there is nothing to attach to; says so when the recording's
 * audio cannot be read, and then only the track plays.
 */
export const startRecordingOverlay = async (
  recording: Recording,
  options: RecordingOverlayOptions = {},
): Promise<RecordingOverlayHandle | null> => {
  const transport = getRecordingTransport();
  const context = getOverlayContext();

  if (!transport || !context) {
    return null;
  }

  try {
    const blob = await getRecordingsStore().getWavBlob(recording.id);

    if (!blob) {
      reportMissing();

      return null;
    }

    const reader = await createWavWindowReader(blob);

    // A recording that says it has audio but has none stored is missing it.
    if (reader.sampleCount === 0) {
      reportMissing();

      return null;
    }

    // The user pressed play, so the context may resume; a suspended one is silent.
    await context.resume().catch(() => undefined);

    const output = context.createGain();

    output.connect(context.destination);

    const voice = createWindowedVoice({
      context,
      output,
      reader,
      onUnavailable: reportMissing,
    });
    // A loop repeating arrives as a seek; counting it as a pass is what lets
    // pass n of the recording play over pass n of the loop.
    const loopTransport = options.loopRange
      ? createLoopAwareTransport({ transport, range: options.loopRange })
      : null;
    const controller = createSyncController({
      transport: loopTransport ?? transport,
      voice,
      recording,
    });

    setRecordingOverlayStatus({ kind: 'sounding' });

    return {
      setLevel: (level) => {
        output.gain.value = level;
      },
      dispose: () => {
        controller.dispose();
        loopTransport?.dispose();
        voice.dispose();
        output.disconnect();
        setRecordingOverlayStatus({ kind: 'idle' });
      },
    };
  } catch {
    reportMissing();

    return null;
  }
};
