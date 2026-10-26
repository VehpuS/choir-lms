import type { PdfThumbnailTask } from '../renderers/sheet-music-renderer';

/** The part of a canvas the queue touches: setting `width` to 0 frees its pixels. */
export type ThumbnailCanvas = { height: number; width: number };

type ThumbnailStatus = 'done' | 'drawing' | 'queued';

type ThumbnailEntry = {
  canvas: ThumbnailCanvas;
  cssWidth: number;
  status: ThumbnailStatus;
  task?: PdfThumbnailTask;
};

export type ThumbnailQueue = {
  /** Queues a page's thumbnail; a page that is already queued or drawn is left alone. */
  enqueue(index: number, canvas: ThumbnailCanvas, cssWidth: number): void;
  /** Cancels and releases one page's thumbnail, such as when its cell goes away. */
  discard(index: number): void;
  /** Moves a queued page to the front, so it is drawn next. */
  prioritize(index: number): void;
  /** Cancels and releases every thumbnail. Safe to call again. */
  release(): void;
  /** Cancels and releases every thumbnail whose page is not in `wanted`. */
  retain(wanted: readonly number[]): void;
};

/**
 * Draws thumbnails one at a time, because pdf.js renders on the main thread
 * and a pile of renders would stall the viewer's own pages. A thumbnail that
 * is no longer wanted is cancelled while drawing and its canvas freed.
 */
export const createThumbnailQueue = (options: {
  draw: (
    index: number,
    canvas: ThumbnailCanvas,
    cssWidth: number,
  ) => PdfThumbnailTask;
}): ThumbnailQueue => {
  // A Map keeps insertion order, which is the drawing order of queued pages.
  const entries = new Map<number, ThumbnailEntry>();
  let isReleased = false;

  const free = (entry: ThumbnailEntry) => {
    entry.task?.cancel();
    entry.task = undefined;
    entry.canvas.width = 0;
    entry.canvas.height = 0;
  };

  const pump = () => {
    const isBusy = [...entries.values()].some(
      (entry) => entry.status === 'drawing',
    );

    if (isBusy || isReleased) {
      return;
    }

    const next = [...entries].find(([, entry]) => entry.status === 'queued');

    if (!next) {
      return;
    }

    const [index, entry] = next;
    const task = options.draw(index, entry.canvas, entry.cssWidth);

    entry.status = 'drawing';
    entry.task = task;

    void task.done.then(() => {
      // A cancelled thumbnail was dropped from the map (or replaced).
      if (entries.get(index) === entry) {
        entry.status = 'done';
        entry.task = undefined;
      }

      pump();
    });
  };

  return {
    discard(index) {
      const entry = entries.get(index);

      if (entry) {
        free(entry);
        entries.delete(index);
      }
    },
    enqueue(index, canvas, cssWidth) {
      if (isReleased || entries.has(index)) {
        return;
      }

      entries.set(index, { canvas, cssWidth, status: 'queued' });
      pump();
    },
    prioritize(index) {
      const entry = entries.get(index);

      if (!entry || entry.status !== 'queued') {
        return;
      }

      // Re-inserting the other queued pages after it puts this one first.
      const others = [...entries].filter(
        ([key, other]) => key !== index && other.status === 'queued',
      );

      for (const [key, other] of others) {
        entries.delete(key);
        entries.set(key, other);
      }
    },
    release() {
      isReleased = true;
      entries.forEach(free);
      entries.clear();
    },
    retain(wanted) {
      const keep = new Set(wanted);

      for (const [index, entry] of [...entries]) {
        if (!keep.has(index)) {
          free(entry);
          entries.delete(index);
        }
      }
    },
  };
};
