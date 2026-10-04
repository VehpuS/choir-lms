import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { formatTrackMetaLabel } from '../../saved-rehearsal-library/library-files-model/row-builders';

/**
 * A Tracks row's meta line (screen 1c): tags then loop count. The duration
 * sits in its own trailing column, so it is left out here.
 */
export const formatTracksRowMeta = (options: {
  loopCount: number;
  source: Pick<DriveLibrarySource, 'adjustment' | 'durationMs' | 'tags'>;
}) => {
  return formatTrackMetaLabel({ ...options, withDuration: false });
};

/** The 1-based position shown in a Tracks row's leading index column. */
export const formatTracksRowIndex = (index: number) => {
  return String(index + 1);
};

/**
 * What `Play all` / `Shuffle` queue: the tracks the view is showing, in
 * their shown order, skipping any that cannot play right now.
 */
export const resolveTracksPlayAllItems = (
  sources: DriveLibrarySource[],
): PlayableItem[] => {
  return sources
    .filter((source) => {
      return source.availability.status === 'available';
    })
    .map((source) => {
      return createTrackPlayableItem(source);
    });
};
