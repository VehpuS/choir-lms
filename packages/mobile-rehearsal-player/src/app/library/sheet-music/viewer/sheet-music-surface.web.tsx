import { DEFAULT_PDF_LAYOUT } from '@org/audio-library-models';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { pianoCapabilities } from '../../piano/piano-capabilities';
import { usePianoSound } from '../../piano/use-piano-sound';
import { appTheme } from '../../../utils/theme';
import { createMusicXmlRenderer } from '../renderers/musicxml-renderer';
import { createPdfRenderer } from '../renderers/pdf-renderer';
import { resolveScoreMusicXml } from '../renderers/score-music-xml';
import type {
  PdfRendering,
  ScoreRendering,
} from '../renderers/sheet-music-renderer';
import { syncPdfLayout } from './sync-pdf-layout';
import { attachPdfPaging, type PagingHost } from './attach-pdf-paging.web';
import {
  attachPdfZoomGestures,
  type GestureHost,
} from './attach-pdf-zoom-gestures.web';
import { shouldTakeFocus, type FocusTarget } from './pdf-paging-input';
import { pageStateOf } from '../pdf-layout/pdf-page-controls-model';
import { computeFitZoom } from './fit-zoom-model';
import { VIEWER_MAX_PDF_ZOOM } from './model';
import { PartPeekLabel, usePartPeek, type PeekHost } from './part-peek';
import { useHostSizeChange } from './use-host-size-change';
import type { SheetMusicSurfaceProps } from './sheet-music-surface-types';
import {
  noteheadAtPoint,
  useScoreNoteTaps,
  type TapHost,
} from './use-score-note-taps';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type HostNode = PeekHost & {
  clientHeight: number;
  clientWidth: number;
  style: { overflow: string; scrollbarGutter: string };
};
type Live = {
  /** Removes the PDF's pinch, wheel, and double-tap handling. */
  detachGestures?: () => void;
  /** Removes the PDF's keyboard and wheel paging. */
  detachPaging?: () => void;
  pdf?: PdfRendering;
  score?: ScoreRendering;
};

/**
 * Draws the loaded document into a scrolling element: a column of pages for a
 * PDF, staves for MusicXML and MIDI. The viewer owns the part selection and
 * zoom; this keeps the drawing in step with them and tells the viewer which
 * parts the score has.
 */
export const SheetMusicSurface = ({
  document,
  focusRequest,
  initialPage,
  jump,
  onFailed,
  onFitZoom,
  onRendered,
  onPageChange,
  onThumbnailDrawer,
  onViewerWidth,
  onZoomChange,
  pageRequest,
  pdfLayout = DEFAULT_PDF_LAYOUT,
  selection,
  zoom,
}: SheetMusicSurfaceProps) => {
  const [host, setHost] = useState<HostNode | null>(null);
  const live = useRef<Live>({});
  // The latest values, read by effects that must not restart when they change.
  const values = {
    initialPage,
    onFailed,
    onFitZoom,
    onPageChange,
    onRendered,
    onThumbnailDrawer,
    onViewerWidth,
    onZoomChange,
    pdfLayout,
    selection,
    zoom,
  };
  const latest = useRef(values);

  latest.current = values;

  // Tells the viewer which zoom fits the drawn score into the height this
  // element has; the viewer decides whether to use it (auto-fit is on).
  const reportFit = (current: Live, element: HostNode) => {
    const naturalHeight = current.score?.naturalHeight() ?? 0;

    if (naturalHeight > 0) {
      latest.current.onFitZoom(
        computeFitZoom({
          availableHeight: element.clientHeight,
          naturalHeight,
        }),
      );
    }
  };

  useEffect(() => {
    if (!host) {
      return undefined;
    }

    let isCancelled = false;
    const next: Live = {};

    const draw = async () => {
      if (document.format === 'pdf') {
        const result = await createPdfRenderer().render({
          bytes: document.bytes,
          container: host,
          layout: latest.current.pdfLayout,
          onPageChange: (range) =>
            latest.current.onPageChange?.(
              pageStateOf(range, next.pdf?.pageCount ?? 0),
            ),
          zoom: latest.current.zoom,
        });

        if (result.status === 'failed') {
          return latest.current.onFailed(result.reason);
        }

        next.pdf = result.rendering;
        live.current = next;

        if (isCancelled) {
          return undefined;
        }

        // A surface drawn again (the window changed shape) opens where the
        // reader was, before the page is reported.
        if (latest.current.initialPage) {
          result.rendering.goToPage(latest.current.initialPage);
        }

        latest.current.onViewerWidth?.(host.clientWidth);
        latest.current.onThumbnailDrawer?.(result.rendering.drawThumbnail);
        latest.current.onPageChange?.(
          pageStateOf(
            result.rendering.currentPageRange(),
            result.rendering.pageCount,
          ),
        );

        next.detachGestures = attachPdfZoomGestures({
          host: host as unknown as GestureHost,
          max: VIEWER_MAX_PDF_ZOOM,
          onZoomChange: (changed) => latest.current.onZoomChange(changed),
          pdf: result.rendering,
        });
        next.detachPaging = attachPdfPaging({
          host: host as unknown as PagingHost,
          pdf: result.rendering,
        });

        return latest.current.onRendered(null);
      }

      const score = await resolveScoreMusicXml({
        bytes: document.bytes,
        format: document.format,
        isCompressed: document.isCompressed,
      });

      if (isCancelled) {
        return undefined;
      }

      if (!score) {
        return latest.current.onFailed('invalid-score');
      }

      const result = await createMusicXmlRenderer().render({
        container: host,
        musicXml: score.musicXml,
        selection: latest.current.selection,
        zoom: latest.current.zoom,
      });

      if (result.status === 'failed') {
        return latest.current.onFailed(result.reason);
      }

      next.score = result.rendering;
      live.current = next;

      if (!isCancelled) {
        reportFit(next, host);
      }

      return isCancelled
        ? undefined
        : latest.current.onRendered({
            bars: result.rendering.bars,
            noteRange: result.rendering.noteRange(),
            parts: result.rendering.parts,
            resolved: result.rendering.resolved,
          });
    };

    void draw().then(() => {
      // A drawing that finished after the effect was cleaned up is released here.
      if (isCancelled) {
        next.detachGestures?.();
        next.detachPaging?.();
        next.pdf?.dispose();
        next.score?.dispose();
      }
    });

    return () => {
      isCancelled = true;

      if (next.pdf) {
        latest.current.onThumbnailDrawer?.(undefined);
      }

      next.detachGestures?.();
      next.detachPaging?.();
      next.pdf?.dispose();
      next.score?.dispose();
      live.current = {};
    };
  }, [document, host]);

  // Gives the page area the keyboard back, so the arrow keys and Page Up/Down
  // still turn pages after a sheet closes or a toolbar button is used.
  useEffect(() => {
    if (!focusRequest || !host) {
      return;
    }

    const page = host as unknown as {
      focus(options: { preventScroll: boolean }): void;
      ownerDocument: { activeElement: FocusTarget | null };
    };

    if (shouldTakeFocus(page.ownerDocument.activeElement)) {
      page.focus({ preventScroll: true });
    }
  }, [focusRequest]);

  useEffect(() => {
    const rendering = live.current.score;

    if (rendering && host) {
      const resolved = rendering.applySelection(selection);

      latest.current.onRendered({
        bars: rendering.bars,
        noteRange: rendering.noteRange(),
        parts: rendering.parts,
        resolved,
      });
      // Hiding or showing parts changes how tall the strip is.
      reportFit(live.current, host);
    }
    // `reportFit` only reads refs and the host, so it is not a dependency.
  }, [selection]);

  // Notes are tappable in staves (MusicXML and MIDI), not in a PDF page.
  const piano = usePianoSound();

  const notesSound = document.format !== 'pdf' && pianoCapabilities().canPlay;

  useScoreNoteTaps(host as Parameters<typeof useScoreNoteTaps>[0], {
    isEnabled: notesSound,
    press: piano.press,
    release: piano.release,
  });

  const peek = usePartPeek(
    host,
    (y) => live.current.score?.partNameAtY(y),
    (x, y) =>
      notesSound &&
      host !== null &&
      noteheadAtPoint(host as unknown as TapHost, x, y) !== undefined,
  );

  useEffect(() => {
    if (jump) {
      live.current.score?.scrollToBar(jump.barIndex);
    }
  }, [jump]);

  useEffect(() => {
    syncPdfLayout(live.current.pdf, pdfLayout, latest.current.onZoomChange);
  }, [pdfLayout]);

  useEffect(() => {
    if (pageRequest) {
      live.current.pdf?.goToPage(pageRequest.page, {
        animate: pageRequest.animate,
      });
    }
  }, [pageRequest]);

  useEffect(() => {
    // A pinch or wheel has already laid the pages out at this zoom.
    if (live.current.pdf && live.current.pdf.currentZoom() !== zoom) {
      live.current.pdf.setZoom(zoom);
    }

    live.current.score?.setZoom(zoom);
  }, [zoom]);

  // PDF pages are laid out for the element's size (a column fits its width; a
  // strip or paged page fits its height), so a change in either (a rotated
  // phone, a resized window) lays them out again. Staves are one sideways strip
  // and do not depend on the width, but a change in height re-fits them.
  useHostSizeChange(host, ({ hasHeightChanged }) => {
    if (host && hasHeightChanged) {
      reportFit(live.current, host);
    }

    live.current.pdf?.setZoom(latest.current.zoom);

    if (host && live.current.pdf) {
      latest.current.onViewerWidth?.(host.clientWidth);
    }
  });

  return (
    <View style={styles.frame}>
      <View
        ref={(node) => {
          const element = node as unknown as HostNode | null;

          // A plain scrolling element that both renderers draw into: staves scroll
          // sideways, PDF pages scroll down. The scrollbar's space is reserved up
          // front, so the PDF column keeps the width it measured once a long
          // document makes the scrollbar appear.
          if (element) {
            element.style.overflow = 'auto';
            element.style.scrollbarGutter = 'stable';
          }

          setHost(element);
        }}
        style={[
          styles.host,
          document.format === 'pdf' ? styles.pdfGround : styles.paper,
        ]}
      />
      {peek ? <PartPeekLabel peek={peek} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    flex: 1,
  },
  host: {
    flex: 1,
    borderRadius: appTheme.radius.md,
  },
  paper: {
    // OpenSheetMusicDisplay draws black on a transparent background, which
    // would vanish on the dark app ground, so a score sits on paper.
    backgroundColor: appTheme.colors.paper,
  },
  pdfGround: {
    backgroundColor: appTheme.colors.surface,
  },
});
