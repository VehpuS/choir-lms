import type {
  ResolvedPartSelection,
  ScorePart,
  SheetMusicPartSelection,
} from '@org/audio-library-models';

export type ScoreRenderFailureReason =
  /** The text could not be read as a score (or has no parts to draw). */
  | 'invalid-score'
  /** No renderer exists for this platform yet (native, see native-playback-follow-ups 1.6). */
  | 'unsupported-platform';

/** A score on screen: it can be re-filtered, zoomed, and torn down. */
export type ScoreRendering = {
  /** Every part the score declares, whether or not it is shown. */
  readonly parts: readonly ScorePart[];
  /** Which parts are shown now, and why a fallback happened. */
  readonly resolved: ResolvedPartSelection;
  /** Removes the drawing and releases the renderer. */
  dispose(): void;
  /** Redraws with a different part selection and returns what is now shown. */
  applySelection(
    selection: SheetMusicPartSelection | undefined,
  ): ResolvedPartSelection;
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
    selection: SheetMusicPartSelection | undefined;
    zoom?: number;
  }): Promise<ScoreRenderResult>;
};
