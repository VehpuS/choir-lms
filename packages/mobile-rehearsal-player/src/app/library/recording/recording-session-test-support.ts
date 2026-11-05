import type { Transport, TransportEvent } from '@org/audio-mixing';
import {
  DEFAULT_PLAYBACK_SHAPING,
  type DriveAudioSource,
} from '@org/audio-library-models';

import {
  createFakePcmSource,
  createFakeVisibility,
} from '../pitch/pitch-test-support';
import { captureRecordingStart } from './recording-metadata';
import {
  RECORDING_EXPLAINED_KEY,
  createRecordingSession,
  type RecordingFlagStorage,
  type RecordingStartRequest,
} from './recording-session';
import { createRecordingsStore } from './recordings-store';
import { createMemoryRecordingsBackend } from './recordings-test-support';

export const track = {
  id: 'track-1',
  provider: 'google-drive',
  driveFileId: 'drive-1',
  name: 'Song.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 60_000,
  modifiedTime: 'v1',
  createdAt: 'x',
  availability: { status: 'available' },
} as DriveAudioSource;

export const request = (): RecordingStartRequest => ({
  draft: captureRecordingStart({
    id: 'rec-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    playing: track,
    parent: track,
    shaping: DEFAULT_PLAYBACK_SHAPING,
    markers: [],
    existingNames: [],
    appliedLatencyMs: 0,
  }),
  getTimeline: (elapsedMs) => [
    {
      recordingStartMs: 0,
      recordingEndMs: elapsedMs,
      trackStartMs: 0,
      held: false,
    },
  ],
});

export const flags = (initial: Record<string, string> = {}) => {
  const values = { ...initial };
  const storage: RecordingFlagStorage = {
    getItem: async (key) => values[key] ?? null,
    setItem: async (key, value) => {
      values[key] = value;
    },
  };

  return { storage, values };
};

export const setup = (
  options: {
    explained?: boolean;
    estimate?: { quota: number; usage: number } | null;
  } = {},
) => {
  const memory = createMemoryRecordingsBackend();
  const store = createRecordingsStore(memory.backend);
  const source = createFakePcmSource('granted');
  const visibility = createFakeVisibility();
  const f = flags(
    options.explained === false ? {} : { [RECORDING_EXPLAINED_KEY]: 'true' },
  );
  const session = createRecordingSession({
    source,
    store,
    visibility,
    storage: f.storage,
    estimate: async () =>
      options.estimate === undefined
        ? { quota: 100e9, usage: 0 }
        : options.estimate,
  });
  const feed = (blocks: number) => {
    for (let i = 0; i < blocks; i += 1) {
      source.emitBlock({
        samples: new Float32Array(4800).fill(0.25),
        sampleRate: 48_000,
        startTimeSec: 1 + i * 0.1,
      });
    }
  };

  return { session, source, visibility, store, flags: f, feed };
};

/** A track transport the spec plays and pauses by hand. */
export const createHandTransport = (playing: boolean) => {
  const listeners = new Set<(event: TransportEvent) => void>();
  let isPlaying = playing;
  let hasEnded = false;

  return {
    transport: {
      getPositionMs: () => 0,
      isPlaying: () => isPlaying,
      hasEnded: () => hasEnded,
      subscribe: (listener: (event: TransportEvent) => void) => {
        listeners.add(listener);

        return () => listeners.delete(listener);
      },
    } satisfies Transport,
    set: (next: boolean) => {
      isPlaying = next;
      listeners.forEach((listener) => listener(next ? 'play' : 'pause'));
    },
    /** The track plays out to its end, which the element reports as a pause. */
    end: () => {
      isPlaying = false;
      hasEnded = true;
      listeners.forEach((listener) => listener('pause'));
    },
    listenerCount: () => listeners.size,
  };
};
