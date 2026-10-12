import {
  formatTransformLabel,
  getSourceDisplayDurationMs,
} from '@org/audio-library-models';
import { compact } from 'es-toolkit/compat';

import { ROW_META_SEPARATOR } from '../../../components/row-meta-line/model';
import {
  formatLengthLabel,
  type DriveLibrarySource,
} from '../../drive/utils/drive-library-view-model';

const TRACK_KIND_LABEL = 'Track';
export const UNAVAILABLE_TRACK_LABEL = 'Track unavailable';

// Plural helper shared with the row builders.
export const formatPluralizedCount = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const ADJUSTED_TRACK_KIND_LABEL = 'Adjusted track';

/**
 * A track's meta line (screens 1b, 1c): duration, tags, and loop count, or
 * the kind word when none of those exist. An adjusted track leads with its
 * kind and transform and names its source, so it is never mistaken for a
 * separate recording; its duration is the source's over its speed.
 */
export const formatTrackMetaLabel = (options: {
  loopCount: number;
  source: Pick<DriveLibrarySource, 'adjustment' | 'durationMs' | 'tags'>;
  withDuration: boolean;
}) => {
  const { adjustment } = options.source;
  const parts = compact([
    adjustment ? ADJUSTED_TRACK_KIND_LABEL : undefined,
    adjustment ? formatTransformLabel(adjustment.transform) : undefined,
    options.withDuration
      ? formatLengthLabel(getSourceDisplayDurationMs(options.source))
      : undefined,
    adjustment?.sourceName,
    ...(options.source.tags ?? []),
    options.loopCount > 0
      ? formatPluralizedCount(options.loopCount, 'loop')
      : undefined,
  ]);

  return parts.length > 0 ? parts.join(ROW_META_SEPARATOR) : TRACK_KIND_LABEL;
};

/**
 * The same track when Drive access is missing (task 8.63): the state leads, and
 * an adjusted track keeps its kind, transform and source, since that is what
 * tells the user which row this is exactly when the track cannot be played.
 */
export const formatUnavailableTrackMetaLabel = (
  source: Pick<DriveLibrarySource, 'adjustment'>,
) => {
  const { adjustment } = source;

  return compact([
    UNAVAILABLE_TRACK_LABEL,
    adjustment ? ADJUSTED_TRACK_KIND_LABEL : undefined,
    adjustment ? formatTransformLabel(adjustment.transform) : undefined,
    adjustment?.sourceName,
  ]).join(ROW_META_SEPARATOR);
};
