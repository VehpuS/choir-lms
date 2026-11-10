import {
  normalizeLibraryEntityTags,
  resolveTagAddedAt,
  type CompositeStem,
  type CompositeTrack,
  type DriveAudioSource,
  type NamedLoop,
  type Playlist,
  type PlaylistEntry,
  type Recording,
  type SourceLyrics,
  type TrackMarker,
} from '@org/audio-library-models';

import {
  MOCK_LIBRARY_OWNER_ID,
  MOCK_TIMESTAMP,
  slugify,
} from './mock-library-fixtures';

// Builders for the pieces a scenario seeds into the library beyond plain
// tracks: loops, playlist entries, tags, markers, lyrics, composites and
// recordings. Each fills only what the real parsers need and takes overrides,
// so a scenario names just the fields it cares about.
const DEFAULT_LOOP_START_MS = 10_000;
const DEFAULT_LOOP_END_MS = 20_000;
const DEFAULT_STEM_VOLUME = 100;
const DEFAULT_RECORDING_MS = 10_000;
const DEFAULT_SAMPLE_RATE = 44_100;
const BYTES_PER_SAMPLE = 2;
const MS_PER_SECOND = 1000;

/** A named loop over `source`, from 10 s to 20 s unless told otherwise. */
export const buildMockLoop = (
  source: DriveAudioSource,
  name: string,
  overrides: Partial<NamedLoop> = {},
): NamedLoop => ({
  id: `mock-loop-${slugify(name)}`,
  name,
  sourceId: source.id,
  sourceName: source.name,
  startMs: DEFAULT_LOOP_START_MS,
  endMs: DEFAULT_LOOP_END_MS,
  ownerId: MOCK_LIBRARY_OWNER_ID,
  createdAt: MOCK_TIMESTAMP,
  updatedAt: MOCK_TIMESTAMP,
  ...overrides,
});

/** A playlist entry that plays a track, or a loop of it when `loop` is given. */
export const buildMockPlaylistEntry = (
  playlist: Pick<Playlist, 'id'>,
  source: DriveAudioSource,
  options: { loop?: NamedLoop; sortIndex?: number; title?: string } = {},
): PlaylistEntry => ({
  id: `mock-entry-${playlist.id}-${options.sortIndex ?? 0}`,
  playlistId: playlist.id,
  sortIndex: options.sortIndex ?? 0,
  kind: options.loop ? 'loop' : 'track',
  sourceId: source.id,
  ...(options.loop ? { loopId: options.loop.id } : {}),
  title: options.title ?? options.loop?.name ?? source.name,
  createdAt: MOCK_TIMESTAMP,
});

/** `playlist` with entries for the given tracks (or loops), in order. */
export const withMockPlaylistItems = (
  playlist: Playlist,
  items: { loop?: NamedLoop; source: DriveAudioSource }[],
): Playlist => ({
  ...playlist,
  items: items.map(({ loop, source }, sortIndex) =>
    buildMockPlaylistEntry(playlist, source, { loop, sortIndex }),
  ),
});

/** A track, loop or playlist with these tags, stamped as the app stamps them. */
export const withMockTags = <
  Entity extends { tagAddedAt?: Record<string, string>; tags?: string[] },
>(
  entity: Entity,
  tags: string[],
): Entity => {
  const normalized = normalizeLibraryEntityTags(tags);

  return {
    ...entity,
    tags: normalized,
    tagAddedAt: resolveTagAddedAt(normalized, undefined, MOCK_TIMESTAMP),
  };
};

export const buildMockMarker = (
  name: string,
  positionMs: number,
): TrackMarker => ({
  id: `mock-marker-${slugify(name)}`,
  name,
  positionMs,
  createdAt: MOCK_TIMESTAMP,
});

export const buildMockLyrics = (
  text: string,
  origin: SourceLyrics['origin'] = 'typed',
): SourceLyrics => ({ origin, text, updatedAt: MOCK_TIMESTAMP });

/** A composite whose stems play the given tracks; every stem at the default level. */
export const buildMockComposite = (
  name: string,
  stems: {
    mine?: boolean;
    name?: string;
    offsetMs?: number;
    source: DriveAudioSource;
  }[],
  overrides: Partial<CompositeTrack> = {},
): CompositeTrack => {
  const compositeStems: CompositeStem[] = stems.map((stem, index) => ({
    id: `mock-stem-${slugify(name)}-${index}`,
    trackId: stem.source.id,
    name: stem.name ?? stem.source.name,
    offsetMs: stem.offsetMs ?? 0,
    mine: stem.mine ?? false,
  }));

  return {
    id: `mock-composite-${slugify(name)}`,
    name,
    stems: compositeStems,
    defaultMix: {
      levels: Object.fromEntries(
        compositeStems.map((stem) => [
          stem.id,
          { volume: DEFAULT_STEM_VOLUME, muted: false, soloed: false },
        ]),
      ),
    },
    presets: [],
    createdAt: MOCK_TIMESTAMP,
    ...overrides,
  };
};

/** What the recordings store keeps for a finished recording (no audio chunks). */
export type MockStoredRecording = Recording & {
  chunkCount: number;
  sampleCount: number;
  status: 'complete';
};

/** A finished 10 s recording of `source`, made over its first stretch. */
export const buildMockRecording = (
  source: DriveAudioSource,
  overrides: Partial<Recording> = {},
): MockStoredRecording => {
  const durationMs = overrides.durationMs ?? DEFAULT_RECORDING_MS;
  const sampleCount = Math.round(
    (durationMs / MS_PER_SECOND) * DEFAULT_SAMPLE_RATE,
  );

  return {
    id: `mock-recording-${slugify(source.name)}`,
    name: 'Recording 1',
    createdAt: MOCK_TIMESTAMP,
    durationMs,
    sampleRate: DEFAULT_SAMPLE_RATE,
    sizeBytes: sampleCount * BYTES_PER_SAMPLE,
    appliedLatencyMs: 0,
    nudgeMs: 0,
    source: {
      driveFileId: source.driveFileId,
      name: source.name,
      durationMs: source.durationMs,
    },
    lineage: {
      track: {
        id: source.id,
        driveFileId: source.driveFileId,
        name: source.name,
      },
    },
    shaping: { rate: 1, pitchSemitones: 0 },
    balance: 50,
    engineVersion: 1,
    markers: [],
    timeline: [
      {
        recordingStartMs: 0,
        recordingEndMs: durationMs,
        trackStartMs: 0,
        held: false,
      },
    ],
    status: 'complete',
    chunkCount: 0,
    sampleCount,
    ...overrides,
  };
};
