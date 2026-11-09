import {
  normalizeLibraryEntityTags,
  type DriveAudioSource,
  type ImportedFrom,
  type LibraryBundleSource,
} from '@org/audio-library-models';

export const NEEDS_ACCESS_MESSAGE =
  'Can’t open this file. Ask the owner to share it with you.';

const isMissingList = (value: readonly unknown[] | undefined) =>
  value === undefined || value.length === 0;

/** The id a plain imported track gets: the same one a Drive import would give it. */
export const createImportedSourceId = (driveFileId: string) =>
  `drive:${driveFileId}`;

/** A track the library does not have yet, from the bundle's snapshot of it. */
export const createSourceFromBundle = (options: {
  bundleSource: LibraryBundleSource;
  id: string;
  importedFrom: ImportedFrom;
  needsAccess: boolean;
  adjustment?: DriveAudioSource['adjustment'];
}): DriveAudioSource => {
  const { bundleSource, importedFrom } = options;

  return {
    id: options.id,
    provider: 'google-drive',
    driveFileId: bundleSource.driveFileId,
    name: bundleSource.name,
    mimeType: bundleSource.mimeType,
    ...(bundleSource.extension ? { extension: bundleSource.extension } : {}),
    ...(bundleSource.durationMs !== undefined
      ? { durationMs: bundleSource.durationMs }
      : {}),
    ...(bundleSource.sizeBytes !== undefined
      ? { sizeBytes: bundleSource.sizeBytes }
      : {}),
    ...(bundleSource.modifiedTime
      ? { modifiedTime: bundleSource.modifiedTime }
      : {}),
    ...(bundleSource.tags
      ? {
          tags: bundleSource.tags,
          tagAddedAt: tagTimes(bundleSource.tags, importedFrom.importedAt),
        }
      : {}),
    ...(bundleSource.lyrics ? { lyrics: bundleSource.lyrics } : {}),
    ...(bundleSource.sheetMusic ? { sheetMusic: bundleSource.sheetMusic } : {}),
    ...(bundleSource.markers ? { markers: bundleSource.markers } : {}),
    ...(bundleSource.sourceLocation
      ? { sourceLocation: bundleSource.sourceLocation }
      : {}),
    ...(options.adjustment ? { adjustment: options.adjustment } : {}),
    importedFrom,
    createdAt: importedFrom.importedAt,
    availability: options.needsAccess
      ? {
          status: 'unavailable',
          reason: 'needs-access',
          message: NEEDS_ACCESS_MESSAGE,
        }
      : { status: 'available' },
  };
};

const tagTimes = (tags: readonly string[], importedAt: string) =>
  Object.fromEntries(tags.map((tag) => [tag, importedAt]));

/**
 * What a matching library track gains from the bundle: tags are merged and
 * lyrics, sheet music and markers fill only where the track has none, so
 * nothing the user made is overwritten. Returns `null` when nothing changes.
 * The track's own provenance is never touched.
 */
export const mergeBundleIntoExistingSource = (
  existing: DriveAudioSource,
  bundleSource: LibraryBundleSource,
  importedAt: string,
): DriveAudioSource | null => {
  const mergedTags = normalizeLibraryEntityTags([
    ...(existing.tags ?? []),
    ...(bundleSource.tags ?? []),
  ]);
  const addedTags = mergedTags.filter(
    (tag) => !(existing.tags ?? []).includes(tag),
  );
  const fillLyrics = !existing.lyrics && bundleSource.lyrics;
  const fillSheetMusic =
    isMissingList(existing.sheetMusic) &&
    !isMissingList(bundleSource.sheetMusic);
  const fillMarkers =
    isMissingList(existing.markers) && !isMissingList(bundleSource.markers);

  if (
    addedTags.length === 0 &&
    !fillLyrics &&
    !fillSheetMusic &&
    !fillMarkers
  ) {
    return null;
  }

  return {
    ...existing,
    ...(addedTags.length > 0
      ? {
          tags: mergedTags,
          tagAddedAt: {
            ...existing.tagAddedAt,
            ...tagTimes(addedTags, importedAt),
          },
        }
      : {}),
    ...(fillLyrics ? { lyrics: bundleSource.lyrics } : {}),
    ...(fillSheetMusic ? { sheetMusic: bundleSource.sheetMusic } : {}),
    ...(fillMarkers ? { markers: bundleSource.markers } : {}),
  };
};

/**
 * Decides, for every bundle track, whether the library already has it (same
 * Drive file: reuse and merge) or it is created, and gives adjusted tracks
 * their imported original. Originals come first in `newSources`.
 */
export const planImportedSources = (options: {
  bundleSources: readonly LibraryBundleSource[];
  existingSources: readonly DriveAudioSource[];
  importedFrom: ImportedFrom;
  importKey: string;
  needsAccessDriveFileIds?: ReadonlySet<string>;
}) => {
  const { importedFrom, importKey } = options;
  const existingByDriveFileId = new Map(
    options.existingSources
      .filter((source) => !source.adjustment)
      .map((source) => [source.driveFileId, source]),
  );
  const needsAccessFor = (driveFileId: string) =>
    options.needsAccessDriveFileIds?.has(driveFileId) ?? false;
  const sourceIds = new Map<string, string>();
  const newSources: DriveAudioSource[] = [];
  const updatedByLibraryId = new Map<string, DriveAudioSource>();
  let reusedTracks = 0;
  let needsAccessTracks = 0;

  for (const bundleSource of options.bundleSources) {
    if (bundleSource.adjustment) {
      continue;
    }

    const existing = existingByDriveFileId.get(bundleSource.driveFileId);
    const id = createImportedSourceId(bundleSource.driveFileId);

    if (existing) {
      sourceIds.set(bundleSource.id, existing.id);
      reusedTracks += 1;

      const merged = mergeBundleIntoExistingSource(
        updatedByLibraryId.get(existing.id) ?? existing,
        bundleSource,
        importedFrom.importedAt,
      );

      if (merged) {
        updatedByLibraryId.set(existing.id, merged);
      }
    } else if (newSources.some((source) => source.id === id)) {
      // Two bundle entries for one Drive file become one track.
      sourceIds.set(bundleSource.id, id);
    } else {
      const needsAccess = needsAccessFor(bundleSource.driveFileId);

      needsAccessTracks += needsAccess ? 1 : 0;
      sourceIds.set(bundleSource.id, id);
      newSources.push(
        createSourceFromBundle({ bundleSource, id, importedFrom, needsAccess }),
      );
    }
  }

  for (const bundleSource of options.bundleSources) {
    const id = `adjusted:${importKey}:${bundleSource.id}`;
    const sourceRef = sourceIds.get(bundleSource.adjustment?.sourceRef ?? '');

    if (!bundleSource.adjustment) {
      continue;
    }

    sourceIds.set(bundleSource.id, id);

    if (sourceRef !== undefined) {
      newSources.push(
        createSourceFromBundle({
          bundleSource,
          id,
          importedFrom,
          needsAccess: needsAccessFor(bundleSource.driveFileId),
          adjustment: { ...bundleSource.adjustment, sourceRef },
        }),
      );
    }
  }

  return {
    sourceIds,
    newSources,
    updatedSources: [...updatedByLibraryId.values()],
    reusedTracks,
    needsAccessTracks,
  };
};
