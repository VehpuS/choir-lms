import type { PlayableItem } from '@org/audio-library-models';
import { useMemo, useState } from 'react';

import type { WaveformFlag } from '../../../../components/playback-waveform/marker-flags-model';
import {
  buildMarkersSheetModel,
  formatMarkerTime,
} from '../../../markers/components/markers-sheet/model';
import { usePlaybackMarkersLookup } from '../../../markers/hooks/use-playback-markers';
import {
  resolvePlayableMarkersItem,
  resolveWaveformMarkers,
} from '../../../markers/utils/waveform-markers';
import {
  INITIAL_MARKER_PICK_STATE,
  classifyMarkerPick,
  describeMarkerPickConflict,
  resolvePickedRange,
  toggleArmedBoundary,
  type MarkerPickConflict,
} from '../../utils/loop-editor-marker-picking';
import type { LoopEditorRange } from '../../utils/loop-editor-model';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';

const WHOLE_TRACK = {
  kind: 'track',
  range: { startMs: 0, endMs: null },
} as const;

const NO_FLAGS: never[] = [];

const OUT_OF_REACH_LABELS: Record<LoopBuilderBoundary, string> = {
  end: 'At or before the loop start',
  start: 'At or after the loop end',
};

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
 * from a flag or from the marker picker. A pick that would put the start at
 * or after the end (or the reverse) asks first, offering to move the other
 * edge to the track's start or end, so the editor never holds an unusable
 * range. Markers cannot be changed here.
 */
export const useLoopEditorMarkers = (options: Options) => {
  const { editingLoopId, onSetRange, range, selectedTrack } = options;
  const lookup = usePlaybackMarkersLookup();
  const [pickState, setPickState] = useState(INITIAL_MARKER_PICK_STATE);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [areMarkersShown, setAreMarkersShown] = useState(true);
  const [conflict, setConflict] = useState<MarkerPickConflict | null>(null);
  const durationMs = options.trackDurationMs ?? undefined;
  const { armed } = pickState;
  const resolution = useMemo(() => {
    return lookup?.markersFor(resolvePlayableMarkersItem(selectedTrack), {
      excludeLoopId: editingLoopId ?? undefined,
    });
  }, [editingLoopId, lookup, selectedTrack]);

  // Whether a marker can be the armed edge without moving the other one.
  const isPickable = (positionMs: number) => {
    return (
      armed === null ||
      classifyMarkerPick({ armed, durationMs, positionMs, range }).kind ===
        'valid'
    );
  };

  const markers = useMemo(() => {
    if (!resolution || !lookup) {
      return [];
    }

    return resolveWaveformMarkers(WHOLE_TRACK, resolution, lookup.filter).map(
      (marker) => ({
        ...marker,
        isDimmed:
          armed !== null &&
          classifyMarkerPick({
            armed,
            durationMs,
            positionMs: marker.positionMs,
            range,
          }).kind !== 'valid',
      }),
    );
  }, [armed, durationMs, lookup, range, resolution]);

  const pick = (positionMs: number, name: string) => {
    if (!armed) {
      return;
    }

    const classification = classifyMarkerPick({
      armed,
      durationMs,
      positionMs,
      range,
    });

    if (classification.kind === 'valid') {
      onSetRange(resolvePickedRange({ armed, durationMs, positionMs, range }));
      setPickState(INITIAL_MARKER_PICK_STATE);
      return;
    }

    setConflict({
      armed,
      fix: classification.fix,
      marker: { name, positionMs },
    });
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
          isPickable,
          outOfReachLabel: armed ? OUT_OF_REACH_LABELS[armed] : undefined,
          ownerName: resolution.owner.name,
          showRowActions: false,
        })
      : null;

  return {
    areMarkersShown,
    armed,
    canPick: markers.length > 0,
    closePicker: () => {
      setIsPickerOpen(false);
    },
    conflictText: conflict
      ? describeMarkerPickConflict(conflict, range, formatMarkerTime)
      : null,
    filter: lookup?.filter,
    isPickerOpen,
    markers: areMarkersShown ? markers : NO_FLAGS,
    openPickerFor: (boundary: LoopBuilderBoundary) => {
      setPickState({ armed: boundary });
      setIsPickerOpen(true);
    },
    toggleMarkers: () => {
      setAreMarkersShown(!areMarkersShown);
    },
    pickFromFlag: (flag: WaveformFlag) => {
      pick(flag.positionMs, flag.name);
    },
    pickFromRow: (positionMs: number, name: string) => {
      setIsPickerOpen(false);
      pick(positionMs, name);
    },
    pickerModel,
    resolveConflict: {
      cancel: () => {
        setConflict(null);
      },
      // Back to the list, still armed, to choose a marker that fits.
      pickAnother: () => {
        setConflict(null);
        setIsPickerOpen(true);
      },
      useFix: () => {
        if (!conflict) {
          return;
        }

        onSetRange(
          resolvePickedRange({
            armed: conflict.armed,
            durationMs,
            fix: conflict.fix,
            positionMs: conflict.marker.positionMs,
            range,
          }),
        );
        setPickState(INITIAL_MARKER_PICK_STATE);
        setConflict(null);
      },
    },
    toggleArm: (boundary: LoopBuilderBoundary) => {
      setPickState(toggleArmedBoundary(pickState, boundary));
    },
  };
};
