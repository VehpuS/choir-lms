import {
  createAdjustedLoop,
  createAdjustedTrackSource,
  getAdjustedEntityDefaultName,
  hasSavableTransform,
  normalizePlaybackShaping,
  type DriveAudioSource,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';

type ShapingAxes = {
  pitchSemitones: number;
  speedMultiplier: number;
};

export type AdjustedSaveKind = 'loop' | 'track';

export type AdjustedSaveOption = {
  kind: AdjustedSaveKind;
  /** The button label, `Save as adjusted loop`. */
  label: string;
};

export type AdjustedSaveAvailability =
  | { status: 'ready'; options: AdjustedSaveOption[] }
  | { status: 'unavailable'; reason: string };

export const ADJUSTED_LOOP_LABEL = 'Save as adjusted loop';
export const ADJUSTED_TRACK_LABEL = 'Save as adjusted track';
export const NOTHING_TO_SAVE_REASON =
  'Change speed or pitch to save an adjusted version.';
export const ALREADY_ADJUSTED_REASON =
  'This item already plays with its own saved speed and pitch.';
export const SOURCE_NOT_SAVED_REASON =
  'Save this track to Library first to keep an adjusted version.';

const isSavableLoopItem = (item: PlayableItem) => {
  return item.kind === 'loop' && item.range.endMs !== null;
};

/**
 * What the shaping surface can save for the active item. A loop (or a range)
 * saves as an adjusted loop and also as an adjusted track of the whole source;
 * a full track saves as an adjusted track. The primary option comes first.
 */
export const resolveAdjustedSaveAvailability = (options: {
  activeItem: PlayableItem;
  effective: ShapingAxes;
  isItemTransformActive: boolean;
  savedSourceIds: ReadonlySet<string>;
}): AdjustedSaveAvailability => {
  if (options.isItemTransformActive) {
    return { status: 'unavailable', reason: ALREADY_ADJUSTED_REASON };
  }

  if (!hasSavableTransform(options.effective)) {
    return { status: 'unavailable', reason: NOTHING_TO_SAVE_REASON };
  }

  if (!options.savedSourceIds.has(options.activeItem.sourceId)) {
    return { status: 'unavailable', reason: SOURCE_NOT_SAVED_REASON };
  }

  const trackOption: AdjustedSaveOption = {
    kind: 'track',
    label: ADJUSTED_TRACK_LABEL,
  };

  return {
    status: 'ready',
    options: isSavableLoopItem(options.activeItem)
      ? [{ kind: 'loop', label: ADJUSTED_LOOP_LABEL }, trackOption]
      : [trackOption],
  };
};

export type AdjustedSaveEntity =
  | { kind: 'loop'; loop: NamedLoop }
  | { kind: 'track'; source: DriveAudioSource };

/** Builds the entity to persist, named with the item's name and its transform. */
export const buildAdjustedSaveEntity = (options: {
  activeItem: PlayableItem;
  effective: ShapingAxes;
  kind: AdjustedSaveKind;
  now?: string;
  ownerId: string;
  /** The saved, non-adjusted track the active item plays. */
  savedSource: DriveAudioSource;
}): AdjustedSaveEntity | null => {
  const createdAt = options.now ?? new Date().toISOString();
  const transform = normalizePlaybackShaping(options.effective);

  if (options.kind === 'track') {
    return {
      kind: 'track',
      source: createAdjustedTrackSource({
        createdAt,
        source: options.savedSource,
        transform,
      }),
    };
  }

  const { range } = options.activeItem;

  if (!isSavableLoopItem(options.activeItem) || range.endMs === null) {
    return null;
  }

  return {
    kind: 'loop',
    loop: createAdjustedLoop({
      createdAt,
      endMs: range.endMs,
      id: `loop:${options.savedSource.id}:${createdAt}`,
      name: getAdjustedEntityDefaultName(options.activeItem.title, transform),
      ownerId: options.ownerId,
      source: options.savedSource,
      startMs: range.startMs,
      transform,
    }),
  };
};
