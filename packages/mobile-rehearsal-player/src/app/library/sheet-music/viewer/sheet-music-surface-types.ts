import type {
  ResolvedPartSelection,
  ScoreBars,
  ScorePart,
  SheetMusicPartSelection,
} from '@org/audio-library-models';

import type { GoToJump } from './go-to/use-go-to';
import type { ViewerFailureReason } from './model';
import type { LoadedSheetMusic } from './use-sheet-music-document';

/** The parts of a drawn score and which of them are shown. */
export type ScoreInfo = {
  bars: ScoreBars;
  parts: readonly ScorePart[];
  resolved: ResolvedPartSelection;
};

export type SheetMusicSurfaceProps = {
  document: LoadedSheetMusic;
  /** The latest request to scroll to a bar; each new one scrolls again. */
  jump: GoToJump | undefined;
  onFailed: (reason: ViewerFailureReason) => void;
  /** The zoom that fits a score's height to the space; not called for a PDF. */
  onFitZoom: (zoom: number) => void;
  /** `null` for a PDF, which has no parts. Called again when the selection changes. */
  onRendered: (info: ScoreInfo | null) => void;
  selection: SheetMusicPartSelection | undefined;
  zoom: number;
};
