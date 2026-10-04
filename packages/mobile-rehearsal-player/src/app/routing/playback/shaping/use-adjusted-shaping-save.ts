import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import {
  buildAdjustedSaveEntity,
  resolveAdjustedSaveAvailability,
  type AdjustedSaveKind,
} from './adjusted-save-model';
import type {
  PlaybackShapingControls,
  PlaybackShapingSaveControls,
  PlaybackShapingSaveFeedback,
} from './shaping-surface-model';

type ShapingAxes = PlaybackShapingControls['effective'];

type UseAdjustedShapingSaveOptions = {
  activeItem: PlayableItem | null;
  effective: ShapingAxes;
  isItemTransformActive: boolean;
  ownerId: string;
  savedSources: readonly DriveAudioSource[];
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  saveSource: (source: DriveAudioSource) => Promise<boolean>;
};

const SAVE_FAILURE_MESSAGE =
  'Could not save the adjusted version. Try again from the Library.';

const createSuccessFeedback = (name: string): PlaybackShapingSaveFeedback => {
  return { message: `Saved “${name}” to Library.`, tone: 'success' };
};

/** Persists the current shaping as an adjusted loop or track, with feedback. */
export const useAdjustedShapingSave = (
  options: UseAdjustedShapingSaveOptions,
): PlaybackShapingSaveControls | undefined => {
  const [feedback, setFeedback] = useState<PlaybackShapingSaveFeedback | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const { activeItem, effective } = options;

  // A confirmation belongs to the item and settings that were saved.
  useEffect(() => {
    setFeedback(null);
  }, [activeItem?.id, effective.pitchSemitones, effective.speedMultiplier]);

  if (!activeItem) {
    return undefined;
  }

  const savedSources = options.savedSources;
  const savedSource = savedSources.find(({ id }) => id === activeItem.sourceId);

  const onSave = async (kind: AdjustedSaveKind) => {
    if (!savedSource || isSaving) {
      return;
    }

    const entity = buildAdjustedSaveEntity({
      activeItem,
      effective,
      kind,
      ownerId: options.ownerId,
      savedSource,
    });

    if (!entity) {
      return;
    }

    setIsSaving(true);

    try {
      const didSave =
        entity.kind === 'loop'
          ? await options.saveLoop(entity.loop)
          : await options.saveSource(entity.source);

      setFeedback(
        didSave
          ? createSuccessFeedback(
              entity.kind === 'loop' ? entity.loop.name : entity.source.name,
            )
          : { message: SAVE_FAILURE_MESSAGE, tone: 'error' },
      );
    } catch {
      setFeedback({ message: SAVE_FAILURE_MESSAGE, tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    availability: resolveAdjustedSaveAvailability({
      activeItem,
      effective,
      isItemTransformActive: options.isItemTransformActive,
      savedSourceIds: new Set(savedSources.map(({ id }) => id)),
    }),
    feedback,
    isSaving,
    onSave: (kind) => {
      void onSave(kind);
    },
  };
};
