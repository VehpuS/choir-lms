import type { MarkerListFilter, TrackMarker } from '@org/audio-library-models';

import type { MarkerAddResult } from '../../utils/marker-add-result';
import type { MarkerLoopDraft, MarkerRow, MarkersSheetModel } from './model';

export type MarkersSheetProps = {
  /** Playhead of the loaded owner, when there is one: `Set to current position`. */
  currentPositionMs?: number;
  durationMs?: number;
  filter: MarkerListFilter;
  /** Hides the All / My markers control (the loop editor's picker). */
  isFilterHidden?: boolean;
  /** Opens this row's action menu straight away (a long press on its flag). */
  initialMenuRowKey?: string;
  model: MarkersSheetModel;
  /** Resolves with the new marker, or the reason nothing was added. */
  onAddHere: () => Promise<MarkerAddResult>;
  onClose: () => void;
  onCreateLoops: () => void;
  onDelete: (markerId: string) => Promise<TrackMarker | undefined>;
  onFilterChange: (filter: MarkerListFilter) => void;
  onJump: (row: MarkerRow) => void;
  onKeepAsMarker: (row: MarkerRow) => void;
  onMakeLoop: (draft: MarkerLoopDraft) => void;
  onMove: (markerId: string, positionMs: number) => void;
  onOpenLoop: (loopId: string) => void;
  onRename: (markerId: string, name: string) => void;
  onRestore: (marker: TrackMarker) => void;
};

export type OpenDialog =
  | { kind: 'menu'; row: MarkerRow }
  | { kind: 'move'; row: MarkerRow }
  | { kind: 'rename'; row: MarkerRow };
