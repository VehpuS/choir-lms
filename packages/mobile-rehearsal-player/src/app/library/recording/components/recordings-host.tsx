import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useMemo, useState } from 'react';

import { subscribeToSavedItemRequests } from '../../components/saved-item-menu/saved-item-requests';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { RecordingsView } from '../recordings-panel-model';
import { RecordingsPanel } from './recordings-panel';

type RecordingsHostProps = {
  library: {
    savedLibrarySources: readonly DriveLibrarySource[];
    savedLoops: readonly NamedLoop[];
  };
};

type PanelTarget = { view: RecordingsView; viewName: string };

/**
 * Opens the Recordings panel when the playback menu asks for it over the
 * saved-item request channel, for a track, an adjusted track, or a loop.
 */
export const RecordingsHost = ({ library }: RecordingsHostProps) => {
  const { savedLibrarySources, savedLoops } = library;
  const [target, setTarget] = useState<PanelTarget | null>(null);

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (request.action !== 'recordings') {
        return;
      }

      if (request.kind === 'loop') {
        const loop = savedLoops.find(({ id }) => id === request.id);

        setTarget(
          loop
            ? { view: { kind: 'loop', loopId: loop.id }, viewName: loop.name }
            : null,
        );

        return;
      }

      const source = savedLibrarySources.find(({ id }) => id === request.id);

      setTarget(
        source
          ? {
              view: {
                kind: source.adjustment ? 'adjusted' : 'track',
                sourceId: source.id,
              },
              viewName: source.name,
            }
          : null,
      );
    });
  }, [savedLibrarySources, savedLoops]);

  // Only plain saved tracks own recordings' originals and offline state.
  const tracks = useMemo(
    () => savedLibrarySources.filter((source) => !source.adjustment),
    [savedLibrarySources],
  );
  const recordingLibrary = useMemo(
    () => ({ sources: savedLibrarySources, loops: savedLoops }),
    [savedLibrarySources, savedLoops],
  );

  if (!target) {
    return null;
  }

  return (
    <RecordingsPanel
      library={recordingLibrary}
      onClose={() => setTarget(null)}
      sources={tracks}
      view={target.view}
      viewName={target.viewName}
    />
  );
};
