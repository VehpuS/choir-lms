import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { createMusicXmlRenderer } from '../renderers/musicxml-renderer';
import { createPdfRenderer } from '../renderers/pdf-renderer';
import { resolveScoreMusicXml } from '../renderers/score-music-xml';
import type {
  PdfRendering,
  ScoreRendering,
} from '../renderers/sheet-music-renderer';
import type { SheetMusicSurfaceProps } from './sheet-music-surface-types';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type HostNode = {
  clientWidth: number;
  style: { overflowY: string; scrollbarGutter: string };
};
type ResizeObserverLike = {
  disconnect(): void;
  observe(target: unknown): void;
};
type ResizeObserverConstructor = new (
  callback: () => void,
) => ResizeObserverLike;

type Live = { pdf?: PdfRendering; score?: ScoreRendering };

const RESIZE_DEBOUNCE_MS = 150;

/**
 * Draws the loaded document into a scrolling element: a column of pages for a
 * PDF, staves for MusicXML and MIDI. The viewer owns the part selection and
 * zoom; this keeps the drawing in step with them and tells the viewer which
 * parts the score has.
 */
export const SheetMusicSurface = ({
  document,
  onFailed,
  onRendered,
  selection,
  zoom,
}: SheetMusicSurfaceProps) => {
  const [host, setHost] = useState<HostNode | null>(null);
  const live = useRef<Live>({});
  // The latest values, read by effects that must not restart when they change.
  const latest = useRef({ onFailed, onRendered, selection, zoom });

  latest.current = { onFailed, onRendered, selection, zoom };

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
          zoom: latest.current.zoom,
        });

        if (result.status === 'failed') {
          return latest.current.onFailed(result.reason);
        }

        next.pdf = result.rendering;
        live.current = next;

        return isCancelled ? undefined : latest.current.onRendered(null);
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

      return isCancelled
        ? undefined
        : latest.current.onRendered({
            parts: result.rendering.parts,
            resolved: result.rendering.resolved,
          });
    };

    void draw().then(() => {
      // A drawing that finished after the effect was cleaned up is released here.
      if (isCancelled) {
        next.pdf?.dispose();
        next.score?.dispose();
      }
    });

    return () => {
      isCancelled = true;
      next.pdf?.dispose();
      next.score?.dispose();
      live.current = {};
    };
  }, [document, host]);

  useEffect(() => {
    const rendering = live.current.score;

    if (rendering) {
      latest.current.onRendered({
        parts: rendering.parts,
        resolved: rendering.applySelection(selection),
      });
    }
  }, [selection]);

  useEffect(() => {
    live.current.pdf?.setZoom(zoom);
    live.current.score?.setZoom(zoom);
  }, [zoom]);

  // The pages and staves are laid out for the element's width, so a change in
  // it (a rotated phone, a resized window) lays them out again.
  useEffect(() => {
    const Observer = (
      globalThis as { ResizeObserver?: ResizeObserverConstructor }
    ).ResizeObserver;

    if (!host || !Observer) {
      return undefined;
    }

    let lastWidth = host.clientWidth;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new Observer(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (host.clientWidth === lastWidth) {
          return;
        }

        lastWidth = host.clientWidth;
        live.current.pdf?.setZoom(latest.current.zoom);
        live.current.score?.setZoom(latest.current.zoom);
      }, RESIZE_DEBOUNCE_MS);
    });

    observer.observe(host);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [host]);

  return (
    <View
      ref={(node) => {
        const element = node as unknown as HostNode | null;

        // A plain scrolling element: both renderers measure it and draw into it.
        // The scrollbar's space is reserved up front, so the width they measure
        // is the width they keep once a long score makes the scrollbar appear.
        if (element) {
          element.style.overflowY = 'auto';
          element.style.scrollbarGutter = 'stable';
        }

        setHost(element);
      }}
      style={[
        styles.host,
        document.format === 'pdf' ? styles.pdfGround : styles.paper,
      ]}
    />
  );
};

const styles = StyleSheet.create({
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
