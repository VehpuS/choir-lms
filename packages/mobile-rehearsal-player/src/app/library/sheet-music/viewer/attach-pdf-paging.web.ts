import type { PdfLayout } from '@org/audio-library-models';

import { stepTargetPage } from '../renderers/pdf-spread-layout';
import {
  INITIAL_WHEEL_TURN_STATE,
  isEditableTarget,
  accumulateWheelTurn,
  isSidewaysWheel,
  pageKeyStep,
  wheelDeltaPixels,
  type WheelInput,
  type WheelTurnState,
} from './pdf-paging-input';

// The app's TypeScript config carries no DOM library, so the slice of the DOM
// used here is described structurally.
type Listener = (event: never) => void;
type EventTarget = {
  isContentEditable?: boolean;
  tagName?: string;
};
type KeyEvent = {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  preventDefault(): void;
  target?: EventTarget | null;
};
type WheelEvent = WheelInput & { preventDefault(): void };

export type PagingHost = {
  addEventListener(
    type: string,
    listener: Listener,
    options?: { passive: boolean },
  ): void;
  clientWidth: number;
  focus(options?: { preventScroll: boolean }): void;
  removeEventListener(type: string, listener: Listener): void;
  scrollLeft: number;
  style: { outline: string };
  tabIndex: number;
};

/** What the paging reads from the drawn PDF. */
export type PdfPagingTarget = {
  currentLayout(): PdfLayout;
  currentPage(): number;
  currentZoom(): number;
  goToPage(index: number, options?: { animate?: boolean }): void;
  /** The page a smooth turn is heading to, if one is running. */
  pendingPage?(): number | undefined;
  readonly pageCount: number;
};

/**
 * Keyboard and wheel paging for a PDF in `pages` or `strip`: the arrows and
 * Page Up/Down turn a page, and a plain vertical wheel moves the pages sideways
 * while a page is fitted. The host takes the keyboard focus (it is made
 * focusable) so keys work as soon as the PDF opens. Returns a detach function.
 */
export const attachPdfPaging = ({
  host,
  now = () => Date.now(),
  pdf,
}: {
  host: PagingHost;
  now?: () => number;
  pdf: PdfPagingTarget;
}): (() => void) => {
  let wheelTurn: WheelTurnState = INITIAL_WHEEL_TURN_STATE;
  const previousTabIndex = host.tabIndex;
  const previousOutline = host.style.outline;

  // Keys slide; the wheel (and a swipe) already move the view themselves.
  // A turn during a slide builds on where the slide is heading, so quick
  // repeated presses add up.
  const turnBy = (step: number, animate: boolean) => {
    const from = pdf.pendingPage?.() ?? pdf.currentPage();
    const target = stepTargetPage({
      from,
      layout: pdf.currentLayout(),
      pageCount: pdf.pageCount,
      step,
    });

    if (target !== from) {
      pdf.goToPage(target, { animate });
    }
  };

  const onKeyDown = (event: KeyEvent) => {
    const step = pageKeyStep(
      {
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        isFromEditableTarget: isEditableTarget(event.target),
        key: event.key,
        metaKey: event.metaKey,
      },
      pdf.currentLayout(),
    );

    if (step === 0) {
      return;
    }

    event.preventDefault();
    turnBy(step, true);
  };

  const onWheel = (event: WheelEvent) => {
    const layout = pdf.currentLayout();

    if (!isSidewaysWheel(event, layout, pdf.currentZoom())) {
      return;
    }

    event.preventDefault();

    const pixels = wheelDeltaPixels(event, host.clientWidth);

    // Without snapping the pages simply slide; with it a nudge would snap
    // back, so the wheel turns whole pages instead.
    if (layout === 'strip') {
      host.scrollLeft += pixels;

      return;
    }

    const turned = accumulateWheelTurn(wheelTurn, pixels, now());

    wheelTurn = turned.state;

    if (turned.step !== 0) {
      turnBy(turned.step, false);
    }
  };

  host.tabIndex = 0;
  // The host is the reading surface; a focus ring around it would only frame
  // the page.
  host.style.outline = 'none';
  host.focus({ preventScroll: true });
  host.addEventListener('keydown', onKeyDown as Listener);
  host.addEventListener('wheel', onWheel as Listener, { passive: false });

  return () => {
    host.removeEventListener('keydown', onKeyDown as Listener);
    host.removeEventListener('wheel', onWheel as Listener);
    host.tabIndex = previousTabIndex;
    host.style.outline = previousOutline;
  };
};
