import type { PlayableItem } from '@org/audio-library-models';
import { useMemo, useState } from 'react';

import type { WaveformFlag } from '../../../../components/playback-waveform/marker-flags-model';
import { buildMarkersSheetModel } from '../../../markers/components/markers-sheet/model';
import { usePlaybackMarkersLookup } from '../../../markers/hooks/use-playback-markers';
import {
  resolvePlayableMarkersItem,
  resolveWaveformMarkers,
} from '../../../markers/utils/waveform-markers';
import {
  INITIAL_MARKER_PICK_STATE,
  getInvalidRangeMessage,
  pickMarker,
  toggleArmedBoundary,
} from '../../utils/loop-editor-marker-picking';
import type { LoopEditorRange } from '../../utils/loop-editor-model';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';

const WHOLE_TRACK = {
  kind: 'track',
  range: { startMs: 0, endMs: null },
} as const;

type Options = {
  /** The loop being edited: its own boundaries are the thing changing. */
  editingLoopId: string | null;
  onSetRange: (range: LoopEditorRange) => void;
  range: LoopEditorRange;
  selectedTrack: PlayableItem;
  trackDurationMs: number | null;
};

/**
 * Marker support for the loop editor (design Decision 6): read-only flags on
 * the waveform, arming a Start or End card, and setting the armed boundary
 * from a flag or from the marker picker. Markers cannot be changed here.
 */
export const useLoopEditorMarkers = (options: Options) => {
  const { editingLoopId, onSetRange, range, selectedTrack } = options;
  const lookup = usePlaybackMarkersLookup();
  const [pickState, setPickState] = useState(INITIAL_MARKER_PICK_STATE);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const durationMs = options.trackDurationMs ?? undefined;
  const resolution = useMemo(() => {
    return lookup?.markersFor(resolvePlayableMarkersItem(selectedTrack), {
      excludeLoopId: editingLoopId ?? undefined,
    });
  }, [editingLoopId, lookup, selectedTrack]);
  const markers = useMemo(() => {
    return resolution && lookup
      ? resolveWaveformMarkers(WHOLE_TRACK, resolution, lookup.filter)
      : [];
  }, [lookup, resolution]);

  const pickPosition = (positionMs: number) => {
    const result = pickMarker({
      durationMs,
      positionMs,
      range,
      state: pickState,
    });

    setPickState(result.state);
    onSetRange(result.range);
  };

  const pickerModel =
    resolution?.owner && lookup
      ? buildMarkersSheetModel({
          canMakeLoops: false,
          canMutateLibrary: false,
          derived: resolution.derived,
          durationMs: resolution.owner.durationMs,
          explicit: resolution.explicit,
          filter: lookup.filter,
          isOwnerLoaded: false,
          ownerName: resolution.owner.name,
          showRowActions: false,
        })
      : null;

  return {
    armed: pickState.armed,
    canPick: markers.length > 0,
    closePicker: () => {
      setIsPickerOpen(false);
    },
    filter: lookup?.filter,
    invalidRangeMessage: getInvalidRangeMessage(range, durationMs),
    isPickerOpen,
    markers,
    openPicker: () => {
      setIsPickerOpen(true);
    },
    pickFromFlag: (flag: WaveformFlag) => {
      if (pickState.armed) {
        pickPosition(flag.positionMs);
      }
    },
    pickFromRow: (positionMs: number) => {
      pickPosition(positionMs);
      setIsPickerOpen(false);
    },
    pickerModel,
    toggleArm: (boundary: LoopBuilderBoundary) => {
      setPickState(toggleArmedBoundary(pickState, boundary));
    },
  };
};
