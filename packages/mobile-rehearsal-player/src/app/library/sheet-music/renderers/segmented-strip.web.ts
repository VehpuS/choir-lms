import {
  computeBarScrollLeft,
  readBarOffsets,
  type MeasureRow,
} from './bar-offsets';
import {
  computeScrollAdjustment,
  estimateBarWidth,
  findSegmentForBar,
  layoutOffsets,
  planSegments,
  selectSegmentsToDraw,
  selectSegmentsToRelease,
} from './strip-segments';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type StripStyle = { cssText: string; height: string; width: string };
type StripNode = {
  appendChild(child: unknown): unknown;
  innerHTML: string;
  style: StripStyle;
};
type DrawnSvg = {
  cloneNode(deep: boolean): DrawnSvg;
  getBoundingClientRect(): { height: number; width: number };
  style: { display: string };
};
export type StripStage = StripNode & {
  querySelector(selector: string): DrawnSvg | null;
};
export type StripHost = StripNode & {
  addEventListener(
    type: 'scroll',
    listener: () => void,
    options: { passive: boolean },
  ): void;
  clientWidth: number;
  ownerDocument: { createElement(tag: 'div'): StripNode };
  removeEventListener(type: 'scroll', listener: () => void): void;
  scrollLeft: number;
};

/** The slice of the OpenSheetMusicDisplay instance the strip drives. */
export type StripOsmd = {
  GraphicSheet: { MeasureList: readonly MeasureRow[] };
  clear(): void;
  render(): void;
  setOptions(options: Record<string, unknown>): void;
  zoom: number;
};

export type SegmentedStrip = {
  dispose(): void;
  /** The drawn height at zoom 1, or 0 before the first run is drawn. */
  naturalHeight(): number;
  /** Draws again after parts are shown or hidden; the first run is drawn before it returns. */
  redraw(): void;
  /** Draws the run holding the bar if needed and scrolls the bar to the left of the view. */
  scrollToBar(barIndex: number): void;
  setZoom(zoom: number): void;
};

// Before any run is drawn a bar is assumed about this wide at zoom 1; the first
// drawn run replaces the guess with a measurement.
const FALLBACK_BAR_WIDTH_PX = 120;
const SLOT_STYLE = 'flex:none;overflow:hidden;';
const STRIP_STYLE = 'display:flex;width:max-content;min-width:100%;';
const SVG_SELECTOR = 'svg';

const yieldToBrowser = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

/**
 * Draws a long score as runs of bars side by side in the host's scroll strip,
 * and only the runs near the viewport. One OpenSheetMusicDisplay instance holds
 * the parsed score; each run is drawn into a hidden stage by bar range and its
 * SVG is copied into the run's slot. Runs not yet drawn hold a slot sized from
 * the bars measured so far, and when a drawn size replaces a guess to the left
 * of the viewport the scroll moves with it, so what is being read stays put.
 * `stage` is the element the instance was created with.
 */
export const createSegmentedStrip = (options: {
  host: StripHost;
  osmd: StripOsmd;
  stage: StripStage;
  totalBars: number;
  zoom: number;
  /** Called after each run is drawn and before its SVG is copied. */
  afterRender?: () => void;
}): SegmentedStrip => {
  const { afterRender, host, osmd, stage } = options;
  const segments = planSegments(options.totalBars);
  const strip = host.ownerDocument.createElement('div');
  const slots = segments.map(() => host.ownerDocument.createElement('div'));
  const measured = new Map<number, number>();
  const drawn = new Set<number>();
  // Where each bar starts inside its run's drawing, in pixels at zoom 1. A run
  // keeps these when it is released; drawing it again refreshes them.
  const barOffsets = new Map<number, number>();
  const pending = new Set<number>();
  let zoom = options.zoom;
  let height = 0;
  let generation = 0;
  let isDisposed = false;
  let queue: Promise<void> = Promise.resolve();
  let frame: ReturnType<typeof setTimeout> | undefined;
  let widths: number[] = [];

  const estimateWidths = (): number[] => {
    const average =
      estimateBarWidth(
        [...measured].map(([index, width]) => ({
          barCount: segments[index]?.barCount ?? 0,
          width,
        })),
      ) ?? FALLBACK_BAR_WIDTH_PX * zoom;

    return segments.map(
      (segment, index) => measured.get(index) ?? segment.barCount * average,
    );
  };
  const writeLayout = (next: number[]) => {
    widths = next;
    slots.forEach((slot, index) => {
      slot.style.cssText = `${SLOT_STYLE}width:${next[index] ?? 0}px;height:${height}px;`;
    });
  };
  // Sets new widths and moves the scroll by what changed left of the viewport.
  const relayout = (next: number[]) => {
    const adjustment = computeScrollAdjustment({
      newWidths: next,
      oldWidths: widths,
      scrollLeft: host.scrollLeft,
    });

    writeLayout(next);

    if (adjustment !== 0) {
      host.scrollLeft += adjustment;
    }
  };

  const draw = (index: number) => {
    const segment = segments[index];
    const slot = slots[index];

    if (!segment || !slot) {
      return;
    }

    osmd.setOptions({
      // The part names are drawn once, at the start of the score.
      drawPartNames: index === 0,
      drawFromMeasureNumber: segment.firstBar,
      drawUpToMeasureNumber: segment.lastBar,
    });
    osmd.render();
    afterRender?.();

    const svg = stage.querySelector(SVG_SELECTOR);

    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    const copy = svg.cloneNode(true);

    // An inline SVG sits on its line's baseline and leaves a gap under it.
    copy.style.display = 'block';
    slot.innerHTML = '';
    slot.appendChild(copy);
    drawn.add(index);

    for (const [bar, offset] of readBarOffsets(
      osmd.GraphicSheet.MeasureList,
      segment.firstBar,
      segment.lastBar,
    )) {
      barOffsets.set(bar, offset);
    }

    measured.set(index, rect.width);
    height = rect.height;
    relayout(estimateWidths());
  };

  const wantedRuns = () => {
    return selectSegmentsToDraw({
      scrollLeft: host.scrollLeft,
      viewportWidth: host.clientWidth,
      widths,
    });
  };

  const enqueue = (index: number) => {
    if (drawn.has(index) || pending.has(index)) {
      return;
    }

    const startedIn = generation;

    pending.add(index);
    queue = queue
      .then(async () => {
        pending.delete(index);

        if (isDisposed || startedIn !== generation) {
          return;
        }

        // The viewport may have moved on while this run waited its turn.
        if (!wantedRuns().includes(index)) {
          return;
        }

        draw(index);
        refresh();
        await yieldToBrowser();
      })
      .catch(() => undefined);
  };

  function refresh() {
    if (isDisposed) {
      return;
    }

    const wanted = wantedRuns();

    for (const index of selectSegmentsToRelease({
      drawn: [...drawn],
      wanted,
    })) {
      const slot = slots[index];

      if (slot) {
        slot.innerHTML = '';
      }

      drawn.delete(index);
    }

    wanted.forEach(enqueue);
  }

  const onScroll = () => {
    if (frame !== undefined) {
      return;
    }

    frame = setTimeout(() => {
      frame = undefined;
      refresh();
    }, 0);
  };

  const clearDrawn = () => {
    generation += 1;
    pending.clear();
    drawn.clear();
    slots.forEach((slot) => {
      slot.innerHTML = '';
    });
  };

  strip.style.cssText = STRIP_STYLE;
  slots.forEach((slot) => strip.appendChild(slot));
  host.innerHTML = '';
  host.appendChild(strip);
  host.appendChild(stage);
  writeLayout(estimateWidths());
  host.addEventListener('scroll', onScroll, { passive: true });
  // The first run is drawn now, so the strip's height is known when this returns.
  draw(0);
  refresh();

  return {
    dispose() {
      isDisposed = true;
      host.removeEventListener('scroll', onScroll);
      osmd.clear();
      host.innerHTML = '';
    },
    naturalHeight() {
      return zoom > 0 ? height / zoom : 0;
    },
    redraw() {
      clearDrawn();
      // Runs keep their last widths as estimates until they are drawn again.
      draw(0);
      refresh();
    },
    scrollToBar(barIndex) {
      const index = findSegmentForBar(segments, barIndex);

      if (index === undefined) {
        return;
      }

      // Draw the run first so the bar's position is measured, not guessed.
      if (!drawn.has(index)) {
        draw(index);
      }

      host.scrollLeft = computeBarScrollLeft({
        barOffset: barOffsets.get(barIndex) ?? 0,
        drawingLeft: layoutOffsets(widths)[index] ?? 0,
        zoom,
      });
      refresh();
    },
    setZoom(next) {
      if (next === zoom) {
        return;
      }

      const ratio = next / zoom;
      const scrolled = host.scrollLeft;

      zoom = next;
      osmd.zoom = next;
      clearDrawn();
      height *= ratio;

      for (const [index, width] of measured) {
        measured.set(index, width * ratio);
      }

      writeLayout(estimateWidths());
      host.scrollLeft = scrolled * ratio;
      draw(0);
      refresh();
    },
  };
};
