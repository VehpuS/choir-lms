import type { PdfLayout } from '@org/audio-library-models';
import { clamp } from 'es-toolkit';

// The types are imported without a value import, so the layout model can use
// this module without a cycle.
import type {
  PdfLayoutResult,
  PdfLayoutSize,
  PdfPageBox,
  PdfPageSpan,
} from './pdf-layout-model';

/** Pages pair from page 1: 1-2, 3-4, and so on; an odd last page sits alone. */
const PAGES_PER_SPREAD = 2;
// Facing pages sit almost touching, like an open book.
const SPREAD_GAP_PX = 4;

/** Where a page sits in its slot, from the shared spans: first or second, and its partner's box. */
export const slotRoleOf = (
  layout: Pick<PdfLayoutResult, 'boxes' | 'spans'>,
  index: number,
): { isFirst: boolean; next?: PdfPageBox } => {
  const start = layout.spans[index]?.start;

  return {
    isFirst: index === 0 || layout.spans[index - 1]?.start !== start,
    next:
      layout.spans[index + 1]?.start === start
        ? layout.boxes[index + 1]
        : undefined,
  };
};

/** How many pages a layout puts in one slot: two in `spread`, else one. */
export const pagesPerSlotOf = (layout: PdfLayout): number =>
  layout === 'spread' ? PAGES_PER_SPREAD : 1;

/** How many spreads a document of `pageCount` pages makes. */
export const spreadCount = (pageCount: number): number =>
  Math.ceil(Math.max(0, pageCount) / PAGES_PER_SPREAD);

/** The spread (0-based) a page (0-based) is in. */
export const spreadOfPage = (page: number): number =>
  Math.floor(Math.max(0, page) / PAGES_PER_SPREAD);

/** The first and last page of a spread; they are equal for a lone last page. */
export const pagesOfSpread = (
  spread: number,
  pageCount: number,
): { first: number; last: number } => {
  const first = Math.max(0, spread) * PAGES_PER_SPREAD;

  return {
    first: Math.min(first, Math.max(0, pageCount - 1)),
    last: Math.min(first + PAGES_PER_SPREAD - 1, Math.max(0, pageCount - 1)),
  };
};

/**
 * The page a step from `from` lands on. A spread layout steps by spread and
 * lands on its first page; every other layout steps by page. Never past either
 * end.
 */
export const stepTargetPage = (options: {
  from: number;
  layout: PdfLayout;
  pageCount: number;
  step: number;
}): number => {
  const { from, layout, pageCount, step } = options;

  if (layout !== 'spread') {
    return clamp(from + step, 0, Math.max(0, pageCount - 1));
  }

  const spread = clamp(
    spreadOfPage(from) + step,
    0,
    Math.max(0, spreadCount(pageCount) - 1),
  );

  return pagesOfSpread(spread, pageCount).first;
};

const relativeWidth = (page: PdfLayoutSize): number =>
  Math.max(1, page.width) / Math.max(1, page.height);

/**
 * Places the pages two to a slot. Each slot is as wide as the viewer (wider
 * when zoomed), and holds its pages side by side at one shared height, fitted
 * whole (the smaller of the width fit and the height fit) and centered. Both
 * pages of a slot share its span, so scrolling to either page shows the spread.
 */
export const layoutSpread = (
  container: PdfLayoutSize,
  pages: PdfLayoutSize[],
  zoom: number,
): PdfLayoutResult => {
  const boxes: PdfPageBox[] = [];
  const spans: PdfPageSpan[] = [];
  let slotStart = 0;
  let contentHeight = container.height;

  for (let spread = 0; spread < spreadCount(pages.length); spread += 1) {
    const members = pages.slice(
      spread * PAGES_PER_SPREAD,
      (spread + 1) * PAGES_PER_SPREAD,
    );
    const gap = members.length > 1 ? SPREAD_GAP_PX : 0;
    const widthOfOneUnitHigh = members.reduce(
      (sum, page) => sum + relativeWidth(page),
      0,
    );
    const height =
      Math.min(container.height, (container.width - gap) / widthOfOneUnitHigh) *
      zoom;
    const total = widthOfOneUnitHigh * height + gap;
    // A zoomed spread is wider than the viewer, so its slot grows with it.
    const slotWidth = Math.max(container.width, total);
    const top = Math.max(0, (container.height - height) / 2);
    let left = slotStart + (slotWidth - total) / 2;

    for (const page of members) {
      const width = relativeWidth(page) * height;

      boxes.push({ height, left, top, width });
      spans.push({ size: slotWidth, start: slotStart });
      left += width + gap;
    }

    contentHeight = Math.max(contentHeight, top + height);
    slotStart += slotWidth;
  }

  return {
    axis: 'horizontal',
    boxes,
    container,
    contentHeight,
    contentWidth: slotStart,
    spans,
  };
};
