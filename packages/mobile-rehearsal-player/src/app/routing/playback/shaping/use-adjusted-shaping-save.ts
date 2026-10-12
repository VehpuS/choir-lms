import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';

import {
  buildAdjustedSaveEntity,
  formatAdjustedSaveSuccess,
  getAdjustedSaveEntityName,
  renameAdjustedSaveEntity,
  resolveAdjustedSaveAvailability,
  type AdjustedSaveEntity,
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
  'Could not save the adjusted version. Try again from the library.';
const RENAME_FAILURE_MESSAGE = 'Could not rename it. Try again.';

type SavedAdjustedEntity = {
  /** Set when the saved track was not in the library and was added with it. */
  addedSourceName: string | null;
  entity: AdjustedSaveEntity;
};

/**
 * Persists the current shaping as an adjusted loop or track, at once, with a
 * confirmation that offers a rename (tasks 8.56, 8.57). A track that is not in
 * the library yet is added to it first, since an adjusted entity references a
 * saved source.
 */
export const useAdjustedShapingSave = (
  options: UseAdjustedShapingSaveOptions,
): PlaybackShapingSaveControls | undefined => {
  const [errorFeedback, setErrorFeedback] =
    useState<PlaybackShapingSaveFeedback | null>(null);
  const [saved, setSaved] = useState<SavedAdjustedEntity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { activeItem, effective } = options;

  // A confirmation belongs to the item and settings that were saved.
  useEffect(() => {
    setErrorFeedback(null);
    setSaved(null);
  }, [activeItem?.id, effective.pitchSemitones, effective.speedMultiplier]);

  if (!activeItem) {
    return undefined;
  }

  const persist = (entity: AdjustedSaveEntity) => {
    return entity.kind === 'loop'
      ? options.saveLoop(entity.loop)
      : options.saveSource(entity.source);
  };

  const onSave = async (kind: AdjustedSaveKind) => {
    if (isSaving) {
      return;
    }

    const savedSource = options.savedSources.find(
      ({ id }) => id === activeItem.sourceId,
    );
    const sourceToUse = savedSource ?? activeItem.source;

    setIsSaving(true);

    try {
      if (!savedSource && !(await options.saveSource(sourceToUse))) {
        setErrorFeedback({ message: SAVE_FAILURE_MESSAGE, tone: 'error' });
        return;
      }

      const entity = buildAdjustedSaveEntity({
        activeItem,
        effective,
        kind,
        ownerId: options.ownerId,
        savedSource: sourceToUse,
      });

      if (!entity) {
        return;
      }

      if (await persist(entity)) {
        setErrorFeedback(null);
        setSaved({
          addedSourceName: savedSource ? null : sourceToUse.name,
          entity,
        });
      } else {
        setErrorFeedback({ message: SAVE_FAILURE_MESSAGE, tone: 'error' });
      }
    } catch {
      setErrorFeedback({ message: SAVE_FAILURE_MESSAGE, tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const onRename = async (name: string) => {
    const renamed = saved ? renameAdjustedSaveEntity(saved.entity, name) : null;

    if (!saved || !renamed || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      if (await persist(renamed)) {
        setErrorFeedback(null);
        setSaved({ ...saved, entity: renamed });
      } else {
        setErrorFeedback({ message: RENAME_FAILURE_MESSAGE, tone: 'error' });
      }
    } catch {
      setErrorFeedback({ message: RENAME_FAILURE_MESSAGE, tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const savedName = saved ? getAdjustedSaveEntityName(saved.entity) : null;
  const feedback: PlaybackShapingSaveFeedback | null =
    errorFeedback ??
    (saved && savedName !== null
      ? {
          message: formatAdjustedSaveSuccess({
            addedSourceName: saved.addedSourceName,
            name: savedName,
          }),
          tone: 'success',
        }
      : null);

  return {
    availability: resolveAdjustedSaveAvailability({
      activeItem,
      effective,
      isItemTransformActive: options.isItemTransformActive,
    }),
    feedback,
    isSaving,
    onRename: (name) => {
      void onRename(name);
    },
    onSave: (kind) => {
      void onSave(kind);
    },
    savedName,
  };
};
