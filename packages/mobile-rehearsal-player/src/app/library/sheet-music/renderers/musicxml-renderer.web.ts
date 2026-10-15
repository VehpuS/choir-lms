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
    options: { autoResize: boolean; drawTitle: boolean },
  ) => OsmdInstance;
};

const DEFAULT_ZOOM = 1;

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
        // OpenSheetMusicDisplay sizes itself from its container's `offsetWidth`,
        // which counts the space a scrollbar takes. Drawing into a full-width
        // inner element makes it use the width the scrolling host really has.
        const host = container as {
          appendChild(child: unknown): unknown;
          innerHTML: string;
          ownerDocument: {
            createElement(tag: 'div'): { style: { cssText: string } };
          };
        };
        const surface = host.ownerDocument.createElement('div');

        surface.style.cssText = 'width:100%;';
        host.innerHTML = '';
        host.appendChild(surface);

        const osmd = new OpenSheetMusicDisplay(surface, {
          autoResize: false,
          drawTitle: false,
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
          parts: parts as readonly ScorePart[],
          get resolved() {
            return resolved;
          },
          setZoom(next) {
            osmd.zoom = next;
            osmd.render();
          },
        };

        return { rendering, status: 'rendered' };
      } catch {
        return failed('invalid-score');
      }
    },
  });
