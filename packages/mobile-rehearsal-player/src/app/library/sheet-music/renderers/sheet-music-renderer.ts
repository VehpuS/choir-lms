import type {
  ResolvedPartSelection,
  ScoreNoteRange,
  ScoreBars,
  ScorePart,
  PartSelectionRequest,
} from '@org/audio-library-models';

export type ScoreRenderFailureReason =
  /** The text could not be read as a score (or has no parts to draw). */
  | 'invalid-score'
  /** No renderer exists for this platform yet (native, see native-playback-follow-ups 1.6). */
  | 'unsupported-platform';

/** A score on screen: it can be re-filtered, zoomed, and torn down. */
export type ScoreRendering = {
  /** The bars of the score: how many, the number printed on each, its rehearsal marks. */
  readonly bars: ScoreBars;
  /** Every part the score declares, whether or not it is shown. */
  readonly parts: readonly ScorePart[];
  /** Which parts are shown now, and why a fallback happened. */
  readonly resolved: ResolvedPartSelection;
  /**
   * The lowest and highest sounding note of the parts shown now, or null when
   * they have no pitched notes. The viewer centres the piano on it.
   */
  noteRange(): ScoreNoteRange | null;
  /** Removes the drawing and releases the renderer. */
  dispose(): void;
  /** Redraws with a different part selection and returns what is now shown. */
  applySelection(
    selection: PartSelectionRequest | undefined,
  ): ResolvedPartSelection;
  /**
   * The drawn height at zoom 1, in the same units as the container's height,
   * or 0 when it cannot be measured. The viewer fits the zoom to the height
   * it has (design Decision 11).
   */
  naturalHeight(): number;
  /**
   * The name of the part whose staff is at `y`, in pixels from the top of the
   * drawing at the current zoom, or undefined for blank space or when the staves
   * cannot be matched to parts.
   */
  partNameAtY(y: number): string | undefined;
  /**
   * Scrolls so that bar `barIndex` (1-based, counting every bar) is at the
   * left of the view. A long score draws the run holding the bar first.
   */
  scrollToBar(barIndex: number): void;
  /** 1 is the natural size. */
  setZoom(zoom: number): void;
};

export type ScoreRenderResult =
  | { rendering: ScoreRendering; status: 'rendered' }
  | { reason: ScoreRenderFailureReason; status: 'failed' };

/**
 * Draws a MusicXML score into a host element. The container type is the
 * platform's own (a DOM element on the web), so the viewer, the part filter,
 * and the state model are shared while each platform supplies a renderer.
 * Never throws: a bad score is a typed failure.
 */
export type MusicXmlRenderer<Container> = {
  render(options: {
    container: Container;
    musicXml: string;
    selection: PartSelectionRequest | undefined;
    zoom?: number;
  }): Promise<ScoreRenderResult>;
};

export type PdfRenderFailureReason =
  | 'invalid-pdf'
  /** Needs a password the app cannot ask for; the viewer offers to open it outside. */
  | 'password-protected'
  | 'unsupported-platform';

/** A PDF on screen as a column of pages. */
export type PdfRendering = {
  readonly pageCount: number;
  /** Removes the pages and releases the document. */
  dispose(): void;
  /**
   * Sets the zoom (1 fits the container's width) and lays the pages out again.
   * Call it with the current zoom after the container's width changes.
   */
  setZoom(zoom: number): void;
};

export type PdfRenderResult =
  | { rendering: PdfRendering; status: 'rendered' }
  | { reason: PdfRenderFailureReason; status: 'failed' };

/** Draws a PDF into a host element as a scrolling column of pages. Never throws. */
export type PdfRenderer<Container> = {
  render(options: {
    bytes: Uint8Array;
    container: Container;
    zoom?: number;
  }): Promise<PdfRenderResult>;
};
