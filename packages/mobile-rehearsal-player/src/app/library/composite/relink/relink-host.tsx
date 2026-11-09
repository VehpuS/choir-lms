import type { DriveAudioSource } from '@org/audio-library-models';

import {
  getCompositeStore,
  useComposites,
} from '../store/composite-store-instance';
import { resolveRelinkOptions } from './relink-model';
import { closeRelink, useRelinkRequest } from './relink-request';
import { RelinkSheet } from './relink-sheet';

/** Shows the re-link sheet when a missing stem asks for it. */
export const RelinkHost = ({
  sources,
}: {
  sources: readonly DriveAudioSource[];
}) => {
  const request = useRelinkRequest();
  const composites = useComposites();
  const composite = composites.find((item) => item.id === request?.compositeId);
  const stem = composite?.stems.find((item) => item.id === request?.stemId);

  if (!request || !composite || !stem) {
    return null;
  }

  return (
    <RelinkSheet
      getOptions={(query) =>
        resolveRelinkOptions({
          composite,
          query,
          stemId: stem.id,
          tracks: sources,
        })
      }
      onCancel={closeRelink}
      onChoose={(trackId) => {
        closeRelink();
        void getCompositeStore().relinkStem(composite.id, stem.id, trackId);
      }}
      stemName={stem.name}
    />
  );
};
