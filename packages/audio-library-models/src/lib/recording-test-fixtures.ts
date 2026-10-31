import type { Recording } from './recording.ts';

const SAMPLE_RATE = 44100;

/** A recording of one plain stretch of a 4 minute track, overridden per scenario. */
export const buildRecording = (
  overrides: Partial<Recording> = {},
): Recording => ({
  id: 'rec-1',
  name: 'Recording 1',
  createdAt: '2026-01-01T00:00:00.000Z',
  durationMs: 10_000,
  sampleRate: SAMPLE_RATE,
  sizeBytes: 882_000,
  appliedLatencyMs: 30,
  nudgeMs: 0,
  source: { driveFileId: 'drive-1', name: 'Song.mp3', durationMs: 240_000 },
  lineage: {
    track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song.mp3' },
  },
  shaping: { rate: 1, pitchSemitones: 0 },
  balance: 50,
  engineVersion: 1,
  markers: [],
  timeline: [
    {
      recordingStartMs: 0,
      recordingEndMs: 10_000,
      trackStartMs: 30_000,
      held: false,
    },
  ],
  ...overrides,
});
