import type {
  CompositeMix,
  CompositeTrack,
  DriveAudioSource,
  LibraryBundleComposite,
  LibraryBundleLoop,
  LibraryBundleOwner,
  LibraryBundleRecording,
  LibraryBundleSource,
  NamedLoop,
  Recording,
} from '@org/audio-library-models';

/** Re-keys one library entity into its bundle form; ids come from the builder. */

const rekeyMix = (
  mix: CompositeMix,
  stemIds: ReadonlyMap<string, string>,
): CompositeMix => ({
  levels: Object.fromEntries(
    Object.entries(mix.levels).flatMap(([stemId, level]) => {
      const bundleStemId = stemIds.get(stemId);

      return bundleStemId === undefined ? [] : [[bundleStemId, level]];
    }),
  ),
});

export const buildSource = (
  source: DriveAudioSource,
  id: string,
  sourceIds: ReadonlyMap<string, string>,
  owner: LibraryBundleOwner | undefined,
): LibraryBundleSource => ({
  id,
  driveFileId: source.driveFileId,
  name: source.name,
  mimeType: source.mimeType,
  ...(source.extension !== undefined ? { extension: source.extension } : {}),
  ...(source.durationMs !== undefined ? { durationMs: source.durationMs } : {}),
  ...(source.sizeBytes !== undefined ? { sizeBytes: source.sizeBytes } : {}),
  ...(source.modifiedTime !== undefined
    ? { modifiedTime: source.modifiedTime }
    : {}),
  ...(source.tags !== undefined ? { tags: source.tags } : {}),
  ...(source.tagAddedAt !== undefined ? { tagAddedAt: source.tagAddedAt } : {}),
  ...(source.lyrics !== undefined ? { lyrics: source.lyrics } : {}),
  ...(source.sheetMusic !== undefined ? { sheetMusic: source.sheetMusic } : {}),
  ...(source.markers !== undefined ? { markers: source.markers } : {}),
  ...(source.sourceLocation !== undefined
    ? { sourceLocation: source.sourceLocation }
    : {}),
  ...(source.adjustment !== undefined
    ? {
        adjustment: {
          ...source.adjustment,
          sourceRef: sourceIds.get(source.adjustment.sourceRef) ?? '',
        },
      }
    : {}),
  ...(owner !== undefined ? { owner } : {}),
  createdAt: source.createdAt,
});

export const buildLoop = (
  loop: NamedLoop,
  id: string,
  sourceId: string,
): LibraryBundleLoop => ({
  id,
  name: loop.name,
  sourceId,
  sourceName: loop.sourceName,
  ...(loop.tags !== undefined ? { tags: loop.tags } : {}),
  ...(loop.tagAddedAt !== undefined ? { tagAddedAt: loop.tagAddedAt } : {}),
  startMs: loop.startMs,
  endMs: loop.endMs,
  ...(loop.transform !== undefined ? { transform: loop.transform } : {}),
  createdAt: loop.createdAt,
  updatedAt: loop.updatedAt,
});

export const buildComposite = (
  composite: CompositeTrack,
  id: string,
  sourceIds: ReadonlyMap<string, string>,
): LibraryBundleComposite => {
  // Stem and preset ids are re-keyed too, so no device-made id is kept.
  const stemIds = new Map(
    composite.stems.map((stem, index) => [stem.id, `${id}-st${index + 1}`]),
  );

  const { lyricsStemId, ...rest } = composite;

  return {
    ...rest,
    id,
    stems: composite.stems.map((stem) => ({
      ...stem,
      id: stemIds.get(stem.id) ?? stem.id,
      trackId: sourceIds.get(stem.trackId) ?? '',
    })),
    defaultMix: rekeyMix(composite.defaultMix, stemIds),
    presets: composite.presets.map((preset, index) => ({
      ...preset,
      id: `${id}-pr${index + 1}`,
      mix: rekeyMix(preset.mix, stemIds),
    })),
    ...(lyricsStemId !== undefined && stemIds.has(lyricsStemId)
      ? { lyricsStemId: stemIds.get(lyricsStemId) }
      : {}),
  };
};

export const buildRecording = (
  recording: Recording,
  id: string,
  ids: {
    sources: ReadonlyMap<string, string>;
    loops: ReadonlyMap<string, string>;
  },
): LibraryBundleRecording | null => {
  const { adjusted, loop, track } = recording.lineage;
  const trackId = ids.sources.get(track.id);
  const adjustedId = adjusted ? ids.sources.get(adjusted.id) : undefined;
  const loopId = loop ? ids.loops.get(loop.id) : undefined;

  // A recording whose track, adjusted track or loop is not in the bundle has
  // nothing to attach to.
  if (
    trackId === undefined ||
    (adjusted && adjustedId === undefined) ||
    (loop && loopId === undefined)
  ) {
    return null;
  }

  const copy = recording.exports?.done.find(
    (entry) => entry.kind === 'recording',
  );

  return {
    id,
    name: recording.name,
    createdAt: recording.createdAt,
    durationMs: recording.durationMs,
    sampleRate: recording.sampleRate,
    sizeBytes: recording.sizeBytes,
    appliedLatencyMs: recording.appliedLatencyMs,
    nudgeMs: recording.nudgeMs,
    source: recording.source,
    lineage: {
      trackId,
      ...(adjustedId !== undefined ? { adjustedId } : {}),
      ...(loopId !== undefined ? { loopId } : {}),
    },
    shaping: recording.shaping,
    balance: recording.balance,
    ...(recording.levelDb !== undefined ? { levelDb: recording.levelDb } : {}),
    engineVersion: recording.engineVersion,
    markers: recording.markers,
    ...(recording.punch !== undefined ? { punch: recording.punch } : {}),
    timeline: recording.timeline,
    audio: copy
      ? {
          kind: 'drive',
          driveFileId: copy.driveFileId,
          fileName: copy.fileName,
        }
      : { kind: 'not-uploaded' },
  };
};
