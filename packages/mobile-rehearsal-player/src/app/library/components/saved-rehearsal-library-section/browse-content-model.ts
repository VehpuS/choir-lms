import type { PlayableItem } from '@org/audio-library-models';

import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';

export const shouldRenderFilesLoopBuilder = (options: {
  activeLibrarySearchQuery: string | null;
  selectedTrack: PlayableItem | null;
  selectedView: SavedRehearsalLibraryView;
}) => {
  return (
    options.selectedView === 'files' &&
    !options.activeLibrarySearchQuery &&
    options.selectedTrack !== null
  );
};
