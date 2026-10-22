import {
  buildMarkerList,
  type MarkerListFilter,
  type PlayableItem,
} from '@org/audio-library-models';

import type { WaveformMarker } from '../../../components/playback-waveform/marker-flags-model';
import { formatMarkerTime } from '../components/markers-sheet/model';
import type {
  MarkersItem,
  SourceMarkersResolution,
} from '../hooks/use-source-markers';

type MarkersItemSource = Pick<PlayableItem, 'kind' | 'loopId' | 'sourceId'>;

/** The item whose owning track's markers a playing item shows. */
export const resolvePlayableMarkersItem = (
  item: MarkersItemSource,
): MarkersItem => {
  return item.kind === 'loop' && item.loopId
    ? { id: item.loopId, sourceId: item.sourceId }
    : { id: item.sourceId, sourceId: item.sourceId };
};

/**
 * The markers drawn on the waveform of a playing item: the owning track's list
 * under the device filter, limited to the item's range when it is a loop, and
 * without markers beyond the end of the audio (they have nowhere to be drawn).
 */
export const resolveWaveformMarkers = (
  item: Pick<PlayableItem, 'kind' | 'range'>,
  resolution: SourceMarkersResolution,
  filter: MarkerListFilter,
): WaveformMarker[] => {
  if (!resolution.owner) {
    return [];
  }

  const { endMs, startMs } = item.range;

  return buildMarkerList({
    explicit: resolution.explicit,
    derived: resolution.derived,
    filter,
    range:
      item.kind === 'loop' && endMs !== null ? { startMs, endMs } : undefined,
    durationMs: resolution.owner.durationMs,
  })
    .filter((entry) => !entry.isPastEnd)
    .map((entry) => ({
      key: entry.key,
      name: entry.name,
      positionMs: entry.positionMs,
      kind: entry.origin === 'explicit' ? 'explicit' : 'derived',
      timeLabel: formatMarkerTime(entry.positionMs),
    }));
};
