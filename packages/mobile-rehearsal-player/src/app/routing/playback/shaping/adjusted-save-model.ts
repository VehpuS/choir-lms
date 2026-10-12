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
}): AdjustedSaveAvailability => {
  if (options.isItemTransformActive) {
    return { status: 'unavailable', reason: ALREADY_ADJUSTED_REASON };
  }

  if (!hasSavableTransform(options.effective)) {
    return { status: 'unavailable', reason: NOTHING_TO_SAVE_REASON };
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

/** The name an entity is saved under. */
export const getAdjustedSaveEntityName = (entity: AdjustedSaveEntity) => {
  return entity.kind === 'loop' ? entity.loop.name : entity.source.name;
};

/** The same entity under a new name, or null when the name is empty. */
export const renameAdjustedSaveEntity = (
  entity: AdjustedSaveEntity,
  name: string,
): AdjustedSaveEntity | null => {
  const trimmedName = name.trim();

  if (trimmedName === '') {
    return null;
  }

  return entity.kind === 'loop'
    ? { kind: 'loop', loop: { ...entity.loop, name: trimmedName } }
    : { kind: 'track', source: { ...entity.source, name: trimmedName } };
};

/**
 * The confirmation line. Saving an adjusted version of a track that is not in
 * the library adds that track too (task 8.57), and the line says so.
 */
export const formatAdjustedSaveSuccess = (options: {
  addedSourceName: string | null;
  name: string;
}) => {
  return options.addedSourceName === null
    ? `Saved “${options.name}” to library.`
    : `Saved “${options.name}” and added “${options.addedSourceName}” to library.`;
};

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
