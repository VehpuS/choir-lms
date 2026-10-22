import type { MarkerListFilter, PlayableItem } from '@org/audio-library-models';
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import type {
  WaveformFlag,
  WaveformMarker,
} from '../../../components/playback-waveform/marker-flags-model';
import { requestSavedItemAction } from '../../components/saved-item-menu/saved-item-requests';
import { useMarkersFilter } from '../markers-filter-preference';
import {
  resolvePlayableMarkersItem,
  resolveWaveformMarkers,
} from '../utils/waveform-markers';
import type {
  MarkersItem,
  SourceMarkersResolution,
} from './use-source-markers';

type PlaybackMarkersValue = {
  filter: MarkerListFilter;
  /** Jumps within the loaded item `target`; see `planMarkerJump`. */
  jump: (target: PlayableItem, positionMs: number) => void;
  markersFor: (item: MarkersItem) => SourceMarkersResolution;
};

const NO_MARKERS: readonly WaveformMarker[] = [];

const PlaybackMarkersContext = createContext<PlaybackMarkersValue | null>(null);

export const PlaybackMarkersProvider = ({
  children,
  value,
}: {
  children: ReactNode;
  value: PlaybackMarkersValue;
}) => (
  <PlaybackMarkersContext.Provider value={value}>
    {children}
  </PlaybackMarkersContext.Provider>
);

/** The provider's value: the device filter, the lookup, and a stable jump. */
export const usePlaybackMarkersValue = (options: {
  jumpToMarker: (target: PlayableItem, positionMs: number) => unknown;
  markersFor: PlaybackMarkersValue['markersFor'];
}): PlaybackMarkersValue => {
  const { filter } = useMarkersFilter();
  // The playback actions are recreated on every render; the latest is read at
  // call time so the context value stays stable between library changes.
  const jumpRef = useRef(options.jumpToMarker);

  jumpRef.current = options.jumpToMarker;

  return useMemo(
    () => ({
      filter,
      jump: (target, positionMs) => {
        void jumpRef.current(target, positionMs);
      },
      markersFor: options.markersFor,
    }),
    [filter, options.markersFor],
  );
};

/** The request that addresses a playing item's track or loop, as the menus do. */
const toRequestTarget = (item: PlayableItem) => {
  return item.kind === 'loop' && item.loopId
    ? { id: item.loopId, kind: 'loop' as const }
    : { id: item.sourceId, kind: 'track' as const };
};

/**
 * Flags for the playing item's waveform and what pressing them does: a tap
 * jumps, a long press on a flag opens its row actions, and a long press on
 * empty waveform adds a marker there (design Decision 5). Nothing is offered
 * while the item's track is not in the library.
 */
export const useWaveformMarkers = (item: PlayableItem) => {
  const value = useContext(PlaybackMarkersContext);

  return useMemo(() => {
    const resolution = value?.markersFor(resolvePlayableMarkersItem(item));

    if (!value || !resolution?.owner) {
      return { markers: NO_MARKERS };
    }

    const target = toRequestTarget(item);

    return {
      markers: resolveWaveformMarkers(item, resolution, value.filter),
      onFlagLongPress: (flag: WaveformFlag) => {
        requestSavedItemAction({
          action: 'markers',
          markerKey: flag.key,
          ...target,
        });
      },
      onFlagPress: (flag: WaveformFlag) => {
        value.jump(item, flag.positionMs);
      },
      onLongPressPosition: (positionMs: number) => {
        requestSavedItemAction({
          action: 'add-marker-here',
          positionMs,
          ...target,
        });
      },
    };
  }, [item, value]);
};
