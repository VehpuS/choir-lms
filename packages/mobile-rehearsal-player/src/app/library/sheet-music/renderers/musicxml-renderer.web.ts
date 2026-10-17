import {
  extractScoreParts,
  resolvePartSelection,
  type ResolvedPartSelection,
  type ScorePart,
  type SheetMusicPartSelection,
} from '@org/audio-library-models';

import { resolveVisibilityFlags } from './part-visibility';
import type { MusicXmlContainer } from './musicxml-renderer';
import type {
  MusicXmlRenderer,
  ScoreRenderResult,
  ScoreRendering,
} from './sheet-music-renderer';

// The app's TypeScript config carries no DOM library, so the slice of the
// OpenSheetMusicDisplay API used here is described structurally.
type OsmdInstrument = { Visible: boolean };
type OsmdInstance = {
  Sheet: { Instruments: OsmdInstrument[] };
  clear(): void;
  load(musicXml: string): Promise<unknown>;
  render(): void;
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

const DEFAULT_ZOOM = 1;

// An inline SVG sits on its line's baseline, which leaves a few pixels under it
// that make a score fitted exactly to the height scroll vertically.
const removeBaselineGap = (container: Measurable) => {
  const svg = container.querySelector('svg');

  if (svg) {
    svg.style.display = 'block';
  }
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
        // The whole score is one long system that scrolls sideways, as a singer
        // reads it, instead of lines that wrap at the pane's width: on a phone
        // that wrap leaves about a bar per line and a very tall page. Its size
        // does not depend on the pane's width, so nothing reflows on a resize.
        // OpenSheetMusicDisplay stops at 32,768 px and wraps past that.
        const osmd = new OpenSheetMusicDisplay(container, {
          autoResize: false,
          drawTitle: false,
          renderSingleHorizontalStaffline: true,
        });

        await osmd.load(musicXml);

        // The part list and the renderer's instruments describe the same file; if
        // they ever disagree, draw everything rather than hide the wrong staves.
        const canFilter = osmd.Sheet.Instruments.length === parts.length;
        const draw = (
          next: SheetMusicPartSelection | undefined,
        ): ResolvedPartSelection => {
          const resolved = resolvePartSelection(
            parts,
            canFilter ? next : 'all',
          );
          const flags = resolveVisibilityFlags(parts, resolved);

          osmd.Sheet.Instruments.forEach((instrument, index) => {
            instrument.Visible = flags[index] ?? true;
          });
          osmd.render();
          removeBaselineGap(container as Measurable);

          return resolved;
        };

        osmd.zoom = zoom;
        let resolved = draw(selection);

        const rendering: ScoreRendering = {
          applySelection(next) {
            resolved = draw(next);
            return resolved;
          },
          dispose() {
            osmd.clear();
            // `clear` resets the layout but leaves the drawn SVG in the host.
            host.innerHTML = '';
          },
          naturalHeight() {
            const svg = (container as Measurable).querySelector('svg');

            return svg ? svg.getBoundingClientRect().height / osmd.zoom : 0;
          },
          parts: parts as readonly ScorePart[],
          get resolved() {
            return resolved;
          },
          setZoom(next) {
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
