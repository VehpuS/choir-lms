import type { Recording } from '@org/audio-library-models';

/** A recording of one plain stretch of a track, overridden per scenario (specs only). */
export const buildRecordingFixture = (
  overrides: Partial<Recording> = {},
): Recording => ({
  id: 'rec-1',
  name: 'Recording 1',
  createdAt: '2026-01-02T10:00:00.000Z',
  durationMs: 42_000,
  sampleRate: 44_100,
  sizeBytes: 3_774_874,
  appliedLatencyMs: 0,
  nudgeMs: 0,
  source: {
    driveFileId: 'drive-1',
    name: 'Song.mp3',
    contentVersion: 'v1',
    durationMs: 240_000,
  },
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
      recordingEndMs: 42_000,
      trackStartMs: 38_000,
      held: false,
    },
  ],
  ...overrides,
});
