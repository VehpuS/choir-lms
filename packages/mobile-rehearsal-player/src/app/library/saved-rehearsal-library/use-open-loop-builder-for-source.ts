import { createTrackPlayableItem } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { prefetchWaveformPeaks } from '../playback/waveform-peaks';

// Opens the loop editor on a saved track: the waveform is analyzed in the
// background while the length resolves, and the editor opens at once, showing
// its own loading state (`pendingLoopBuilderSourceId`) instead of the row
// sitting silent until the length is known.
export const useOpenLoopBuilderForSource = (options: {
  accessToken?: string;
  prepareLoopBuilderTrack: (source: DriveLibrarySource) => Promise<unknown>;
  setSelectedLoopSourceId: (sourceId: string | null) => void;
}) => {
  return (source: DriveLibrarySource) => {
    if (options.accessToken) {
      prefetchWaveformPeaks(
        createTrackPlayableItem(source),
        options.accessToken,
      );
    }

    options.setSelectedLoopSourceId(source.id);
    void options.prepareLoopBuilderTrack(source);
  };
};
