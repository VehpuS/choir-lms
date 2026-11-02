import {
  encodeWavParts,
  floatToInt16,
  type DecodedTrack,
} from '@org/audio-mixing';
import type { Recording } from '@org/audio-library-models';
import type { DriveResumableUploadResult } from '@org/google-drive';

import { buildRecordingFixture } from '../recording-fixtures';
import type { OriginalResolution } from '../recording-original';
import { createAutoExportQueue, type Connectivity } from './auto-export-queue';
import type { AutoExportSettings, ConnectionType } from './auto-export-model';
import type { ExportRunnerDependencies } from './recording-export-runner';

const SAMPLE_RATE = 1000;
const START = new Date('2026-11-02T10:00:00.000Z').getTime();

const NodeBlob = Blob as unknown as new (
  parts: unknown[],
  options?: { type?: string },
) => Blob;
export const toBlob = (parts: unknown[], type?: string): Blob =>
  new NodeBlob(parts, type ? { type } : undefined);

export const wav = () =>
  toBlob(
    encodeWavParts([floatToInt16(new Float32Array(SAMPLE_RATE).fill(0.1))], {
      channels: 1,
      sampleRate: SAMPLE_RATE,
    }),
  );
const track: DecodedTrack = {
  channels: [new Float32Array(SAMPLE_RATE * 3).fill(0.2)],
  sampleRate: SAMPLE_RATE,
};
const readyOriginal: OriginalResolution = {
  changed: false,
  load: async () => toBlob(['original']),
  origin: 'stored',
  status: 'ready',
};

export const recording = (
  id: string,
  createdAt = '2026-11-02T09:00:00.000Z',
  extra: Partial<Recording> = {},
) =>
  buildRecordingFixture({
    createdAt,
    durationMs: 1000,
    id,
    name: `Recording ${id}`,
    sampleRate: SAMPLE_RATE,
    timeline: [
      {
        held: false,
        recordingEndMs: 1000,
        recordingStartMs: 0,
        trackStartMs: 0,
      },
    ],
    ...extra,
  });

export const fakeStore = (initial: Recording[]) => {
  let recordings = initial;

  return {
    read: (id: string) => recordings.find((entry) => entry.id === id),
    store: {
      list: async () => recordings.map((entry) => ({ ...entry })),
      modify: async (
        id: string,
        patchFrom: (r: Recording) => Partial<Recording>,
      ) => {
        recordings = recordings.map((entry) =>
          entry.id === id ? { ...entry, ...patchFrom(entry) } : entry,
        );
      },
    },
  };
};

export const fakeConnectivity = (
  online = true,
  type: ConnectionType = 'unknown',
) => {
  const state = { online, type };
  const listeners = new Set<() => void>();
  const connectivity: Connectivity = {
    connectionType: () => state.type,
    isOnline: () => state.online,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };

  return {
    connectivity,
    change: (next: Partial<typeof state>) => {
      Object.assign(state, next);
      listeners.forEach((listener) => listener());
    },
  };
};

export const fakeClock = () => {
  let time = START;
  const timers: Array<{ at: number; callback: () => void; id: number }> = [];
  let nextId = 1;

  return {
    advance: async (ms: number) => {
      time += ms;
      for (const timer of timers.filter((entry) => entry.at <= time)) {
        timers.splice(timers.indexOf(timer), 1);
        timer.callback();
      }
      await settleMicrotasks();
    },
    clearTimer: (handle: unknown) => {
      const index = timers.findIndex((entry) => entry.id === handle);

      if (index >= 0) timers.splice(index, 1);
    },
    now: () => new Date(time),
    pending: () => timers.length,
    setTimer: (callback: () => void, delayMs: number) => {
      const id = nextId++;

      timers.push({ at: time + delayMs, callback, id });

      return id;
    },
  };
};

export const settleMicrotasks = async () => {
  for (let i = 0; i < 50; i += 1)
    await new Promise((resolve) => setImmediate(resolve));
};

export const SETTINGS: AutoExportSettings = {
  eligibleFrom: null,
  enabled: true,
  folder: { folderId: 'folder-1', folderName: 'Choir Recordings' },
  uploadOver: 'wifi',
  what: 'both',
};

export type Upload = { name: string; resumeUri?: string };

export const setUp = (
  recordings: Recording[],
  options: {
    settings?: Partial<AutoExportSettings>;
    results?: DriveResumableUploadResult[];
    original?: OriginalResolution;
    online?: boolean;
    type?: ConnectionType;
    session?: { accessToken: string | undefined; hasWriteAccess: boolean };
  } = {},
) => {
  const memory = fakeStore(recordings);
  const net = fakeConnectivity(
    options.online ?? true,
    options.type ?? 'unknown',
  );
  const clock = fakeClock();
  const uploads: Upload[] = [];
  const results = [...(options.results ?? [])];
  let active = 0;
  let maxActive = 0;
  const settings = { ...SETTINGS, ...options.settings };
  const dependencies: ExportRunnerDependencies = {
    decodeTrack: async () => track,
    makeBlob: (parts, type) => toBlob(parts, type),
    readRecording: async () => wav(),
    resolveOriginal: async () => options.original ?? readyOriginal,
    saveToDevice: () => undefined,
    upload: async (uploadOptions) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      uploads.push({
        name: uploadOptions.name,
        resumeUri: uploadOptions.resumeUri,
      });
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;

      return (
        results.shift() ?? {
          file: { id: `file-${uploads.length}`, name: uploadOptions.name },
          status: 'uploaded',
        }
      );
    },
  };
  const queue = createAutoExportQueue({
    clearTimer: clock.clearTimer,
    connectivity: net.connectivity,
    dependencies,
    getSession: () =>
      options.session ?? { accessToken: 'token', hasWriteAccess: true },
    getSettings: () => settings,
    now: clock.now,
    setTimer: clock.setTimer,
    store: memory.store,
  });

  return {
    clock,
    maxActive: () => maxActive,
    memory,
    net,
    queue,
    settings,
    uploads,
  };
};

/** Waits until a condition holds, so a spec never depends on how many turns the event loop takes. */
export const waitUntil = async (condition: () => boolean, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;

  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for the queue.');
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};
