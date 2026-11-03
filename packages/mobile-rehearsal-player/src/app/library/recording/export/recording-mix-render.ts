import type { Recording } from '@org/audio-library-models';
import {
  createSoundTouchStretcher,
  createWavWindowReader,
  encodeWavParts,
  renderMix,
  type BlobLike,
  type DecodedTrack,
  type PcmWindowReader,
} from '@org/audio-mixing';

/**
 * Renders a recording's mix for export (rehearsal-recording design
 * Decision 12): the stored recording, the original track and the recording's
 * own metadata in, 16-bit WAV parts out. Everything the render reads is passed
 * in, so it depends on no live session.
 */

export type RecordingMixRenderDependencies = {
  /** The stored recording as a WAV blob. */
  readRecording: (id: string) => Promise<BlobLike | null>;
  /** The original track's audio, from `resolveRecordingOriginal(...).load`. */
  loadOriginal: () => Promise<Blob>;
  decodeTrack: (audio: Blob) => Promise<DecodedTrack>;
};

export type RecordingMixRenderOptions = {
  /** 0 is all track, 100 all recording. */
  balance: number;
  /** Linear gain from the recording's level. */
  levelGain?: number;
  signal?: AbortSignal;
  onProgress?: (fraction: number) => void;
};

export type RecordingMixRenderResult =
  | {
      status: 'done';
      /** Pass to `new Blob([...])`. */
      parts: Uint8Array[];
      engineVersion: number;
    }
  | { status: 'aborted' }
  | { status: 'failed'; reason: 'recording-missing' | 'original' | 'render' };

export const renderRecordingMix = async (
  recording: Recording,
  options: RecordingMixRenderOptions,
  deps: RecordingMixRenderDependencies,
): Promise<RecordingMixRenderResult> => {
  let reader: PcmWindowReader;

  try {
    const blob = await deps.readRecording(recording.id);

    if (!blob) {
      return { reason: 'recording-missing', status: 'failed' };
    }

    reader = await createWavWindowReader(blob);

    if (reader.sampleCount === 0) {
      return { reason: 'recording-missing', status: 'failed' };
    }
  } catch {
    // A stored file that is not a readable WAV is as good as missing.
    return { reason: 'recording-missing', status: 'failed' };
  }

  let track: DecodedTrack;

  try {
    track = await deps.decodeTrack(await deps.loadOriginal());
  } catch {
    return { reason: 'original', status: 'failed' };
  }

  if (options.signal?.aborted) {
    return { status: 'aborted' };
  }

  const blocks: Int16Array[] = [];
  const result = await renderMix({
    balance: options.balance,
    levelGain: options.levelGain,
    onProgress: (done, total) => options.onProgress?.(done / total),
    reader,
    recording,
    signal: options.signal,
    stretcher: createSoundTouchStretcher(track),
    write: (samples) => {
      blocks.push(samples);
    },
  });

  if (result.status === 'aborted') {
    return { status: 'aborted' };
  }

  if (result.status === 'failed') {
    return { reason: 'render', status: 'failed' };
  }

  return {
    engineVersion: result.engineVersion,
    parts: encodeWavParts(blocks, {
      channels: result.channels,
      sampleRate: result.sampleRate,
    }),
    status: 'done',
  };
};
