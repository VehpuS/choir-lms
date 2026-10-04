import type { useSavedTrackPlayback } from '../library/playback/hooks/use-saved-track-playback';
import type { useRehearsalLibraryController } from '../library/saved-rehearsal-library/use-rehearsal-library-controller';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../library/storage/local-library-storage';
import { useAdjustedShapingSave } from './playback/shaping/use-adjusted-shaping-save';
import { usePlaybackShapingControls } from './playback/shaping/use-playback-shaping-controls';

/** The shaping controls for the playback surfaces, with saving wired to the library. */
export const useAppRouterPlaybackShaping = (options: {
  libraryController: ReturnType<typeof useRehearsalLibraryController>;
  playback: ReturnType<typeof useSavedTrackPlayback>;
}) => {
  const { libraryController, playback } = options;
  const shapingControls = usePlaybackShapingControls(playback.shaping);
  const save = useAdjustedShapingSave({
    activeItem: playback.activePlayableItem,
    effective: shapingControls.effective,
    isItemTransformActive: shapingControls.isItemTransformActive,
    ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    saveLoop: libraryController.savedLibrary.saveLoop,
    savedSources: libraryController.savedLibrary.savedLibrarySources,
    saveSource: libraryController.savedLibrary.saveSource,
  });

  return { ...shapingControls, save };
};
