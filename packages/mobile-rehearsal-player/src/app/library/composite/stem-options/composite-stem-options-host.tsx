import type { DriveAudioSource } from '@org/audio-library-models';

import { requestTrackReveal } from '../../saved-rehearsal-library/track-reveal-store';
import {
  getCompositeStore,
  useComposites,
} from '../store/composite-store-instance';
import { CompositeStemOptionsSheet } from './composite-stem-options-sheet';
import { resolveStemOptionsModel, stepOffsetMs } from './stem-options-model';
import {
  closeStemOptions,
  useStemOptionsRequest,
} from './stem-options-request';

/** Shows the stem options sheet when a stem asks for it, saving edits as they are made. */
export const CompositeStemOptionsHost = ({
  sources,
}: {
  sources: readonly DriveAudioSource[];
}) => {
  const request = useStemOptionsRequest();
  const composites = useComposites();
  const composite = composites.find((item) => item.id === request?.compositeId);
  const stem = composite?.stems.find((item) => item.id === request?.stemId);
  const track = sources.find((source) => source.id === stem?.trackId);
  const model =
    composite && request
      ? resolveStemOptionsModel({
          composite,
          stemId: request.stemId,
          track,
        })
      : null;

  if (!composite || !request || !model) {
    return null;
  }

  const { compositeId, stemId } = request;
  const store = getCompositeStore();

  return (
    // Keyed so a different stem starts with its own name in the field.
    <CompositeStemOptionsSheet
      key={`${compositeId}:${stemId}`}
      model={model}
      onClose={closeStemOptions}
      onDeleteComposite={() => {
        closeStemOptions();
        void store.remove(compositeId);
      }}
      onRemove={() => {
        closeStemOptions();
        void store.removeStem(compositeId, stemId);
      }}
      onRename={(name) => void store.renameStem(compositeId, stemId, name)}
      onStepOffset={(deltaMs) =>
        void store.setStemOffset(
          compositeId,
          stemId,
          stepOffsetMs(model.offsetMs, deltaMs),
        )
      }
      onShowOriginalTrack={
        stem && track
          ? () => {
              closeStemOptions();
              requestTrackReveal(track.id);
            }
          : undefined
      }
      onToggleMine={(mine) => void store.setStemMine(compositeId, stemId, mine)}
    />
  );
};
