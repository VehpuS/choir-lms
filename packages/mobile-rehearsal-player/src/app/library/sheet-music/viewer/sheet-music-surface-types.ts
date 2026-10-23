import type {
  PdfLayout,
  ResolvedPartSelection,
  ScoreNoteRange,
  ScoreBars,
  ScorePart,
  PartSelectionRequest,
} from '@org/audio-library-models';

import type { GoToJump } from './go-to/use-go-to';
import type { ViewerFailureReason } from './model';
import type { LoadedSheetMusic } from './use-sheet-music-document';

/** The parts of a drawn score and which of them are shown. */
export type ScoreInfo = {
  bars: ScoreBars;
  /** The range of the parts shown, for centring the piano; null if none. */
  noteRange: ScoreNoteRange | null;
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
  /**
   * A PDF was zoomed by pinch, wheel, or double tap; the viewer takes the zoom
   * so its readout and buttons follow. Not called for a score.
   */
  onZoomChange: (zoom: number) => void;
  /** How a PDF's pages are laid out; defaults to `scroll`. Not used for a score. */
  pdfLayout?: PdfLayout;
  selection: PartSelectionRequest | undefined;
  zoom: number;
};
