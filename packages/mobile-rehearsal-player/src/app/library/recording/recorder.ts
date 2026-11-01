import { floatToInt16Into } from '@org/audio-mixing';
import { MIN_RECORDING_DURATION_MS } from '@org/audio-library-models';

import {
  PcmSourceError,
  type PcmBlock,
  type PcmSource,
} from '../pitch/pcm-source-types';
import type { VisibilitySource } from '../pitch/app-visibility';
import type {
  RecorderProgress,
  RecorderResult,
  RecordingChunkWriter,
  RecordingStopReason,
} from './recorder-types';
import {
  canStartRecording,
  readRecordingTimeLeft,
  type StorageEstimateSource,
} from './recording-storage-limit';

/**
 * Captures microphone blocks into ten-second chunks and hands each finished
 * chunk to a writer (rehearsal-recording design Decisions 4, 8 and 20). Memory
 * never holds more than the chunk being filled and any chunks still waiting
 * for storage. The recorder does not know about tracks: the timeline and the
 * metadata are layered on top by the session that owns it.
 */

export const RECORDING_CHUNK_MS = 10_000;
/** Used for the pre-start storage check, before the real sample rate is known. */
const PRECHECK_SAMPLE_RATE = 48_000;
const BYTES_PER_SAMPLE = 2;
const WAV_HEADER_BYTES = 44;
const WAV_MAX_BYTES = 0xffff_ffff;
const MAX_DATA_BYTES = WAV_MAX_BYTES - WAV_HEADER_BYTES;
const MS_PER_SECOND = 1000;
const PROGRESS_INTERVAL_MS = 250;
/** Waits between attempts to write one chunk; a chunk is tried once plus once per delay. */
export const CHUNK_RETRY_DELAYS_MS: readonly number[] = [250, 500, 1000];

export type StartRecordingResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'denied' | 'unavailable' | 'in-use' | 'storage-low';
      timeLeftMs?: number;
    };

export type Recorder = {
  start: () => Promise<StartRecordingResult>;
  /** Stops once; later calls return the first stop's result. */
  stop: (reason?: RecordingStopReason) => Promise<RecorderResult>;
  isRecording: () => boolean;
};

export type RecorderOptions = {
  source: PcmSource;
  writer: RecordingChunkWriter;
  estimate: StorageEstimateSource;
  visibility?: VisibilitySource;
  onProgress?: (progress: RecorderProgress) => void;
  /** Called once when the recording ends, for whatever reason, including ones the recorder saw itself. */
  onStopped?: (result: RecorderResult) => void;
  chunkMs?: number;
  retryDelaysMs?: readonly number[];
  /** Waits between retries; replaced in specs so they do not sleep. */
  sleep?: (ms: number) => Promise<void>;
};

export const createRecorder = (options: RecorderOptions): Recorder => {
  const { source, writer, estimate, visibility, onProgress } = options;
  const chunkMs = options.chunkMs ?? RECORDING_CHUNK_MS;
  const retryDelaysMs = options.retryDelaysMs ?? CHUNK_RETRY_DELAYS_MS;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  let recording = false;
  let stopping: Promise<RecorderResult> | null = null;
  let unsubscribe: (() => void) | null = null;
  let unwatchVisibility: (() => void) | null = null;
  let sampleRate = 0;
  let chunkSamples = 0;
  let chunk = new Int16Array(0);
  let filled = 0;
  let capturedSamples = 0;
  let writtenSamples = 0;
  let captureStartSec = 0;
  let nextProgressAt = 0;
  let failed = false;
  let begun = false;
  let queue: Promise<void> = Promise.resolve();
  let firstStopReason: RecordingStopReason | null = null;

  const publish = (progress: Partial<RecorderProgress>) => {
    onProgress?.({
      elapsedMs: (capturedSamples / sampleRate) * MS_PER_SECOND,
      storageState: 'unknown',
      ...progress,
    });
  };

  const enqueue = (task: () => Promise<void>) => {
    queue = queue.then(task);
  };

  const fail = (reason: RecordingStopReason) => {
    failed = true;
    void stop(reason);
  };

  const refreshStorage = async () => {
    const left = await readRecordingTimeLeft(estimate, sampleRate);

    publish(
      left.state === 'unknown'
        ? {}
        : { timeLeftMs: left.timeLeftMs, storageState: left.state },
    );

    if (left.state === 'full') {
      void stop('storage-full');
    }
  };

  const appendWithRetry = async (samples: Int16Array): Promise<boolean> => {
    const progress = {
      elapsedMs:
        ((writtenSamples + samples.length) / sampleRate) * MS_PER_SECOND,
    };

    for (let attempt = 0; ; attempt += 1) {
      try {
        await writer.append(samples, progress);
        return true;
      } catch {
        const delay = retryDelaysMs[attempt];

        if (delay === undefined) {
          return false;
        }

        await sleep(delay);
      }
    }
  };

  const writeChunk = (samples: Int16Array) => {
    enqueue(async () => {
      if (failed) {
        return;
      }

      // Capture goes on while a chunk is retried, so a brief storage hiccup
      // costs nothing; only a failure that outlasts every retry stops it.
      const written = await appendWithRetry(samples);

      if (!written) {
        fail('storage-failed');
        return;
      }

      writtenSamples += samples.length;

      await refreshStorage();
    });
  };

  const begin = (block: PcmBlock) => {
    sampleRate = block.sampleRate;
    captureStartSec = block.startTimeSec;
    chunkSamples = Math.round((sampleRate * chunkMs) / MS_PER_SECOND);
    chunk = new Int16Array(chunkSamples);
    enqueue(async () => {
      try {
        await writer.begin({ sampleRate });
        begun = true;
      } catch {
        fail('storage-failed');
      }
    });
    void refreshStorageAfter();
  };

  // Shown straight away so the readout does not wait ten seconds for a chunk.
  const refreshStorageAfter = async () => {
    await refreshStorage();
  };

  const accept = (block: PcmBlock) => {
    if (stopping) {
      return;
    }

    if (sampleRate === 0) {
      begin(block);
    }

    if (
      (capturedSamples + block.samples.length) * BYTES_PER_SAMPLE >
      MAX_DATA_BYTES
    ) {
      void stop('too-long');
      return;
    }

    let offset = 0;

    while (offset < block.samples.length) {
      const room = chunkSamples - filled;
      const take = Math.min(room, block.samples.length - offset);

      floatToInt16Into(
        block.samples.subarray(offset, offset + take),
        chunk,
        filled,
      );
      filled += take;
      offset += take;

      if (filled === chunkSamples) {
        writeChunk(chunk);
        chunk = new Int16Array(chunkSamples);
        filled = 0;
      }
    }

    capturedSamples += block.samples.length;

    if ((capturedSamples / sampleRate) * MS_PER_SECOND >= nextProgressAt) {
      nextProgressAt += PROGRESS_INTERVAL_MS;
      publish({});
    }
  };

  const finish = async (
    reason: RecordingStopReason,
  ): Promise<RecorderResult> => {
    unsubscribe?.();
    unwatchVisibility?.();
    recording = false;

    if (!failed && filled > 0) {
      writeChunk(chunk.slice(0, filled));
    }

    await queue;

    const durationMs =
      (writtenSamples / Math.max(sampleRate, 1)) * MS_PER_SECOND;

    if (durationMs < MIN_RECORDING_DURATION_MS) {
      if (begun) {
        await writer.discard().catch(() => undefined);
      }

      return { status: 'discarded', reason, durationMs };
    }

    const sizeBytes = writtenSamples * BYTES_PER_SAMPLE;

    try {
      await writer.finalize({
        durationMs,
        sampleCount: writtenSamples,
        sizeBytes,
      });
    } catch {
      // The chunks are already stored; report why the record could not close.
      reason = 'storage-failed';
    }

    return {
      status: 'saved',
      reason,
      durationMs,
      sampleRate,
      sampleCount: writtenSamples,
      sizeBytes,
      captureStartSec,
    };
  };

  const stop = (
    reason: RecordingStopReason = 'user',
  ): Promise<RecorderResult> => {
    firstStopReason ??= reason;
    stopping ??= finish(firstStopReason).then((result) => {
      options.onStopped?.(result);

      return result;
    });

    return stopping;
  };

  return {
    isRecording: () => recording,
    stop,
    start: async () => {
      const left = await readRecordingTimeLeft(estimate, PRECHECK_SAMPLE_RATE);

      if (!canStartRecording(left)) {
        return {
          ok: false,
          reason: 'storage-low',
          timeLeftMs: left.state === 'unknown' ? undefined : left.timeLeftMs,
        };
      }

      try {
        unsubscribe = await source.subscribe({
          onBlock: accept,
          onInterrupted: () => void stop('interrupted'),
          onEnded: () => void stop('microphone-ended'),
        });
      } catch (error) {
        return {
          ok: false,
          reason:
            error instanceof PcmSourceError ? error.reason : 'unavailable',
        };
      }

      recording = true;
      unwatchVisibility =
        visibility?.subscribe((visible) => {
          if (!visible) {
            void stop('hidden');
          }
        }) ?? null;

      return { ok: true };
    },
  };
};
