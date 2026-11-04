import {
  encodeWavParts,
  floatToInt16,
  type DecodedTrack,
} from '@org/audio-mixing';
import type { DriveResumableUploadResult } from '@org/google-drive';

import { buildRecordingFixture } from '../recording-fixtures';
import type { OriginalResolution } from '../recording-original';
import {
  createExportRun,
  reduceExportRun,
  type ExportRun,
  type ExportRunEvent,
} from './recording-export-model';
import {
  runRecordingExports,
  type ExportPlan,
  type ExportRunnerDependencies,
} from './recording-export-runner';

export const SAMPLE_RATE = 1000;
export const DURATION_MS = 1000;
export const FOLDER = { folderId: 'folder-1', folderName: 'Choir Recordings' };

// The app's `Blob` type is React Native's, which takes only strings and blobs;
// the specs run on Node's, which takes bytes too.
const NodeBlob = Blob as unknown as new (
  parts: unknown[],
  options?: { type?: string },
) => Blob;

export const toBlob = (parts: unknown[], type?: string): Blob =>
  new NodeBlob(parts, type ? { type } : undefined);

export const storedWav = (): Blob => {
  const samples = floatToInt16(new Float32Array(SAMPLE_RATE).fill(0.1));

  return toBlob(
    encodeWavParts([samples], { channels: 1, sampleRate: SAMPLE_RATE }),
  );
};

export const track: DecodedTrack = {
  channels: [new Float32Array(SAMPLE_RATE * 3).fill(0.2)],
  sampleRate: SAMPLE_RATE,
};

export const readyOriginal: OriginalResolution = {
  changed: false,
  load: async () => toBlob(['original']),
  origin: 'stored',
  status: 'ready',
};

export const recordingFor = (id: string) =>
  buildRecordingFixture({
    durationMs: DURATION_MS,
    id,
    name: `Recording ${id}`,
    sampleRate: SAMPLE_RATE,
    timeline: [
      {
        held: false,
        recordingEndMs: DURATION_MS,
        recordingStartMs: 0,
        trackStartMs: 0,
      },
    ],
  });

export const setUp = (
  overrides: Partial<ExportRunnerDependencies> = {},
  uploadResult: DriveResumableUploadResult = {
    file: { id: 'new-1', name: 'x.wav' },
    status: 'uploaded',
  },
) => {
  const saved: Array<{ fileName: string; size: number; blob: Blob }> = [];
  const uploads: Array<Record<string, unknown>> = [];
  const deps: ExportRunnerDependencies = {
    decodeTrack: async () => track,
    makeBlob: (parts, type) => toBlob(parts, type),
    readRecording: async () => storedWav(),
    resolveOriginal: async () => readyOriginal,
    saveToDevice: (fileName, blob) => {
      saved.push({ blob, fileName, size: blob.size });
    },
    upload: async (options) => {
      uploads.push(options as unknown as Record<string, unknown>);
      options.onSession?.('https://upload/session');
      options.onProgress?.(options.source.size, options.source.size);

      return uploadResult;
    },
    ...overrides,
  };

  return { deps, saved, uploads };
};

export const run = async (
  plan: ExportPlan,
  deps: ExportRunnerDependencies,
  signal = new AbortController().signal,
) => {
  const events: ExportRunEvent[] = [];
  let state: ExportRun = createExportRun(
    plan.items.map((item) => ({
      fileName: item.fileName,
      recordingId: item.recording.id,
    })),
  );

  await runRecordingExports(plan, deps, {
    dispatch: (event) => {
      events.push(event);
      state = reduceExportRun(state, event);
    },
    signal,
  });

  return { events, state };
};

export const plan = (
  overrides: Partial<ExportPlan> = {},
  ids = ['a'],
): ExportPlan => ({
  accessToken: 'token',
  balance: 50,
  destination: 'drive',
  folder: FOLDER,
  items: ids.map((id) => ({
    fileName: `${id}.wav`,
    recording: recordingFor(id),
  })),
  kind: 'recording',
  ...overrides,
});
