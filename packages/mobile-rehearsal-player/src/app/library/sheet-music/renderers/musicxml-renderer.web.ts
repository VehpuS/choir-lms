import {
  extractScoreBars,
  extractScoreParts,
  resolvePartSelection,
  type ResolvedPartSelection,
  type ScorePart,
  type PartSelectionRequest,
} from '@org/audio-library-models';

import {
  computeBarScrollLeft,
  readBarOffsets,
  type MeasureRow,
} from './bar-offsets';
import { resolveVisibilityFlags } from './part-visibility';
import {
  buildStaffBands,
  findPartNameAtY,
  flattenStaffNames,
  type StaffBand,
} from './staff-bands';
import {
  createSegmentedStrip,
  type SegmentedStrip,
  type StripHost,
  type StripStage,
} from './segmented-strip.web';
import { shouldSegment } from './strip-segments';
import type { MusicXmlContainer } from './musicxml-renderer';
import type {
  MusicXmlRenderer,
  ScoreRenderResult,
  ScoreRendering,
} from './sheet-music-renderer';

// The app's TypeScript config carries no DOM library, so the slice of the
// OpenSheetMusicDisplay API used here is described structurally.
type OsmdInstrument = { Staves: readonly unknown[]; Visible: boolean };
type OsmdStaffLine = {
  PositionAndShape: { AbsolutePosition: { y: number } };
  StaffHeight: number;
};
type OsmdInstance = {
  GraphicSheet: {
    MeasureList: readonly MeasureRow[];
    MusicPages: readonly {
      MusicSystems: readonly { StaffLines: readonly OsmdStaffLine[] }[];
    }[];
  };
  Sheet: { Instruments: OsmdInstrument[] };
  clear(): void;
  load(musicXml: string): Promise<unknown>;
  render(): void;
  setOptions(options: Record<string, unknown>): void;
  zoom: number;
};
type OsmdModule = {
  OpenSheetMusicDisplay: new (
    container: unknown,
    options: {
      autoResize: boolean;
      drawTitle: boolean;
      renderSingleHorizontalStaffline: boolean;
    },
  ) => OsmdInstance;
};

// The slice of a DOM element used to measure the drawing.
type DrawnSvg = {
  getBoundingClientRect(): { height: number };
  style: { display: string };
};
type Measurable = { querySelector(selector: string): DrawnSvg | null };
type StageBuilder = {
  ownerDocument: { createElement(tag: 'div'): StripStage };
};

const DEFAULT_ZOOM = 1;
// OpenSheetMusicDisplay lays out in units of ten pixels at zoom 1.
const UNIT_PX = 10;
// Where a long score is drawn before its runs are copied into the strip: laid
// out like a normal element but out of sight.
const STAGE_STYLE =
  'position:absolute;left:-100000px;top:0;width:4000px;visibility:hidden;';

// An inline SVG sits on its line's baseline, which leaves a few pixels under it
// that make a score fitted exactly to the height scroll vertically.
const removeBaselineGap = (container: Measurable) => {
  const svg = container.querySelector('svg');

  if (svg) {
    svg.style.display = 'block';
  }
};

// Where each drawn staff sits, matched to the part it belongs to, from the
// last drawing. Positions do not depend on the zoom or on which run of a long
// score was drawn last, so this holds until the part selection changes.
const readStaffBands = (
  osmd: OsmdInstance,
  visibleParts: readonly ScorePart[],
): StaffBand[] => {
  const lines = osmd.GraphicSheet.MusicPages[0]?.MusicSystems[0]?.StaffLines;
  const shown = osmd.Sheet.Instruments.filter(({ Visible }) => Visible);
  const names = lines
    ? flattenStaffNames(
        visibleParts.map(({ name }, index) => ({
          name,
          staffCount: shown[index]?.Staves.length ?? 0,
        })),
        lines.length,
      )
    : undefined;

  return lines && names
    ? buildStaffBands(
        lines.map((line) => ({
          height: line.StaffHeight * UNIT_PX,
          y: line.PositionAndShape.AbsolutePosition.y * UNIT_PX,
        })),
        names,
      )
    : [];
};

const failed = (reason: 'invalid-score'): ScoreRenderResult => ({
  reason,
  status: 'failed',
});

/**
 * Draws MusicXML into a DOM element with OpenSheetMusicDisplay (VexFlow), which
 * is imported on demand so it never reaches the startup bundle. Hidden parts
 * are switched off before drawing, so they are not laid out at all.
 */
export const createMusicXmlRenderer =
  (): MusicXmlRenderer<MusicXmlContainer> => ({
    async render({ container, musicXml, selection, zoom = DEFAULT_ZOOM }) {
      const parts = extractScoreParts(musicXml);

      if (parts.length === 0) {
        return failed('invalid-score');
      }

      try {
        const { OpenSheetMusicDisplay } =
          (await import('opensheetmusicdisplay')) as unknown as OsmdModule;
        const host = container as { innerHTML: string };
        const bars = extractScoreBars(musicXml);
        const totalBars = bars.barCount;
        // A long score is drawn in runs of bars, only those near the viewport;
        // an ordinary arrangement is one drawing, as it always was.
        const stage = shouldSegment(totalBars)
          ? (container as StageBuilder).ownerDocument.createElement('div')
          : undefined;

        if (stage) {
          stage.style.cssText = STAGE_STYLE;
        }

        // The whole score is one long system that scrolls sideways, as a singer
        // reads it, instead of lines that wrap at the pane's width: on a phone
        // that wrap leaves about a bar per line and a very tall page. Its size
        // does not depend on the pane's width, so nothing reflows on a resize.
        // OpenSheetMusicDisplay stops at 32,768 px and wraps past that.
        const osmd = new OpenSheetMusicDisplay(stage ?? container, {
          autoResize: false,
          drawTitle: false,
          renderSingleHorizontalStaffline: true,
        });

        await osmd.load(musicXml);

        // The part list and the renderer's instruments describe the same file; if
        // they ever disagree, draw everything rather than hide the wrong staves.
        const canFilter = osmd.Sheet.Instruments.length === parts.length;
        const draw = (
          next: PartSelectionRequest | undefined,
        ): ResolvedPartSelection => {
          const resolved = resolvePartSelection(
            parts,
            canFilter ? next : 'all',
          );
          const flags = resolveVisibilityFlags(parts, resolved);

          osmd.Sheet.Instruments.forEach((instrument, index) => {
            instrument.Visible = flags[index] ?? true;
          });
          if (stage) {
            if (strip) {
              strip.redraw();
            } else {
              strip = createSegmentedStrip({
                host: container as StripHost,
                osmd,
                stage,
                totalBars,
                zoom: osmd.zoom,
              });
            }
          } else {
            osmd.render();
            removeBaselineGap(container as Measurable);
            barOffsets = readBarOffsets(
              osmd.GraphicSheet.MeasureList,
              1,
              totalBars,
            );
          }

          staffBands = readStaffBands(osmd, resolved.visible);

          return resolved;
        };

        let strip: SegmentedStrip | undefined;
        // Where each bar starts in a single drawing, in pixels at zoom 1.
        let barOffsets = new Map<number, number>();
        let staffBands: StaffBand[] = [];

        osmd.zoom = zoom;
        let resolved = draw(selection);

        const rendering: ScoreRendering = {
          bars,
          applySelection(next) {
            resolved = draw(next);
            return resolved;
          },
          dispose() {
            if (strip) {
              strip.dispose();
              return;
            }

            osmd.clear();
            // `clear` resets the layout but leaves the drawn SVG in the host.
            host.innerHTML = '';
          },
          naturalHeight() {
            if (strip) {
              return strip.naturalHeight();
            }

            const svg = (container as Measurable).querySelector('svg');

            return svg ? svg.getBoundingClientRect().height / osmd.zoom : 0;
          },
          parts: parts as readonly ScorePart[],
          get resolved() {
            return resolved;
          },
          partNameAtY(y) {
            return findPartNameAtY(staffBands, y / osmd.zoom);
          },
          scrollToBar(barIndex) {
            if (strip) {
              strip.scrollToBar(barIndex);
              return;
            }

            (container as { scrollLeft: number }).scrollLeft =
              computeBarScrollLeft({
                barOffset: barOffsets.get(barIndex) ?? 0,
                zoom: osmd.zoom,
              });
          },
          setZoom(next) {
            if (strip) {
              strip.setZoom(next);
              return;
            }

            osmd.zoom = next;
            osmd.render();
            removeBaselineGap(container as Measurable);
          },
        };

        return { rendering, status: 'rendered' };
      } catch {
        return failed('invalid-score');
      }
    },
  });
