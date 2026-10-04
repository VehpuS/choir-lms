import { omit, round } from 'es-toolkit';

import {
  getPlaybackShapingLabelParts,
  isPlaybackShapingNeutral,
  normalizePlaybackShaping,
  type PlaybackShaping,
} from './playback-shaping.ts';
import type {
  DriveAudioSource,
  NamedLoop,
  SourceAdjustment,
} from './rehearsal-domain.ts';

/**
 * Adjusted tracks and loops (design Decision 5) store a source reference and
 * a transform, never rendered audio. An adjusted track is a saved track whose
 * `adjustment` is set; an adjusted loop is a saved loop whose `transform` is
 * set. Both keep flowing through the existing track and loop plumbing.
 */

const NAME_SEPARATOR = ' • ';
const SHAPING_LABEL_SEPARATOR = ' ';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

/** A transform that changes nothing is not an adjustment worth saving. */
export const hasSavableTransform = (
  transform: Pick<PlaybackShaping, 'pitchSemitones' | 'speedMultiplier'>,
) => {
  return !isPlaybackShapingNeutral(transform);
};

export const isAdjustedSource = (
  source: Pick<DriveAudioSource, 'adjustment'>,
): source is { adjustment: SourceAdjustment } => {
  return source.adjustment !== undefined;
};

export const isAdjustedLoop = (
  loop: Pick<NamedLoop, 'transform'>,
): loop is { transform: PlaybackShaping } => {
  return loop.transform !== undefined;
};

/**
 * Reads a stored `adjustment` from untrusted input. Returns `null` when the
 * source reference is missing or the transform is neutral, so a malformed
 * record is never treated as an adjusted track.
 */
export const parseSourceAdjustment = (
  value: unknown,
): SourceAdjustment | null => {
  if (
    !isRecord(value) ||
    typeof value.sourceRef !== 'string' ||
    value.sourceRef.trim().length === 0
  ) {
    return null;
  }

  const transform = normalizePlaybackShaping(value.transform);

  // A missing name is repaired from the saved track on read; until then the
  // reference stands in so the field is always a string.
  return hasSavableTransform(transform)
    ? {
        sourceRef: value.sourceRef,
        sourceName:
          typeof value.sourceName === 'string' &&
          value.sourceName.trim().length > 0
            ? value.sourceName
            : value.sourceRef,
        transform,
      }
    : null;
};

/**
 * Reads a stored loop `transform`. A missing, malformed, or neutral value
 * means an ordinary loop, which is also how libraries saved before adjusted
 * loops existed read.
 */
export const parseLoopTransform = (value: unknown): PlaybackShaping | null => {
  if (!isRecord(value)) {
    return null;
  }

  const transform = normalizePlaybackShaping(value);

  return hasSavableTransform(transform) ? transform : null;
};

/** The duration an adjusted entity plays for: source duration over speed. */
export const getAdjustedDurationMs = (
  durationMs: number,
  speedMultiplier: number,
) => {
  return round(
    durationMs / normalizePlaybackShaping({ speedMultiplier }).speedMultiplier,
  );
};

/**
 * The running time a row shows for a saved track: an adjusted track plays for
 * its source's duration over its speed, an ordinary track for its duration.
 */
export const getSourceDisplayDurationMs = (
  source: Pick<DriveAudioSource, 'adjustment' | 'durationMs'>,
) => {
  if (source.durationMs === undefined || !source.adjustment) {
    return source.durationMs;
  }

  return getAdjustedDurationMs(
    source.durationMs,
    source.adjustment.transform.speedMultiplier,
  );
};

/** The running time a row shows for a loop, scaled by its transform's speed. */
export const getLoopDisplayDurationMs = (
  loop: Pick<NamedLoop, 'endMs' | 'startMs' | 'transform'>,
) => {
  const durationMs = loop.endMs - loop.startMs;

  return loop.transform
    ? getAdjustedDurationMs(durationMs, loop.transform.speedMultiplier)
    : durationMs;
};

/** `0.80× −2 st`: the shaped parts of a transform, as shown in names and meta. */
export const formatTransformLabel = (
  transform: Pick<PlaybackShaping, 'pitchSemitones' | 'speedMultiplier'>,
) => {
  return getPlaybackShapingLabelParts(transform).join(SHAPING_LABEL_SEPARATOR);
};

/** The smart default name: `<base> • 0.80× −2 st`, matching loop naming's bullet. */
export const getAdjustedEntityDefaultName = (
  baseName: string,
  transform: Pick<PlaybackShaping, 'pitchSemitones' | 'speedMultiplier'>,
) => {
  const label = formatTransformLabel(transform);

  return label ? `${baseName}${NAME_SEPARATOR}${label}` : baseName;
};

export const createAdjustedTrackSource = (options: {
  createdAt?: string;
  name?: string;
  source: DriveAudioSource;
  transform: PlaybackShaping;
}): DriveAudioSource => {
  const { source } = options;

  if (isAdjustedSource(source)) {
    throw new Error('An adjusted track must be created from a saved track.');
  }

  if (!hasSavableTransform(options.transform)) {
    throw new Error(
      'Adjust the speed or pitch before saving an adjusted track.',
    );
  }

  const createdAt = options.createdAt ?? new Date().toISOString();
  // Drive provenance (location, tags) stays with the source; the adjusted
  // track resolves "original location" actions through `sourceRef`.
  const inheritedSource = omit(source, [
    'sourceLocation',
    'tags',
    'tagAddedAt',
  ]);

  return {
    ...inheritedSource,
    id: `adjusted:${source.id}:${createdAt}`,
    name:
      options.name ??
      getAdjustedEntityDefaultName(source.name, options.transform),
    adjustment: {
      sourceRef: source.id,
      sourceName: source.name,
      transform: normalizePlaybackShaping(options.transform),
    },
    createdAt,
  };
};

export const createAdjustedLoop = (options: {
  createdAt?: string;
  endMs: number;
  id: string;
  name: string;
  ownerId: string;
  source: Pick<DriveAudioSource, 'id' | 'name'>;
  startMs: number;
  transform: PlaybackShaping;
}): NamedLoop => {
  if (!hasSavableTransform(options.transform)) {
    throw new Error(
      'Adjust the speed or pitch before saving an adjusted loop.',
    );
  }

  const createdAt = options.createdAt ?? new Date().toISOString();

  return {
    id: options.id,
    name: options.name,
    sourceId: options.source.id,
    sourceName: options.source.name,
    startMs: options.startMs,
    endMs: options.endMs,
    transform: normalizePlaybackShaping(options.transform),
    ownerId: options.ownerId,
    createdAt,
    updatedAt: createdAt,
  };
};
