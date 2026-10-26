import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PdfLayout } from '@org/audio-library-models';

import { attachPdfPaging, type PagingHost } from './attach-pdf-paging.web.js';

type Handler = (event: Record<string, unknown>) => void;

const setUp = (
  options: { layout?: PdfLayout; page?: number; zoom?: number } = {},
) => {
  const handlers = new Map<string, Handler>();
  const state = {
    layout: options.layout ?? 'pages',
    page: options.page ?? 5,
    zoom: options.zoom ?? 1,
  };
  const goTo: number[] = [];
  const animated: boolean[] = [];
  // While a slide runs, the page it heads to; the reported page lags behind it.
  let pending: number | undefined;
  const host = {
    addEventListener: (type: string, listener: unknown) => {
      handlers.set(type, listener as Handler);
    },
    clientWidth: 400,
    focused: 0,
    focus() {
      this.focused += 1;
    },
    removeEventListener: (type: string) => {
      handlers.delete(type);
    },
    scrollLeft: 100,
    style: { outline: 'auto' },
    tabIndex: -1,
  };
  let time = 0;
  const detach = attachPdfPaging({
    host: host as unknown as PagingHost,
    now: () => time,
    pdf: {
      currentLayout: () => state.layout,
      currentPage: () => state.page,
      currentZoom: () => state.zoom,
      goToPage: (index, turn) => {
        goTo.push(index);
        animated.push(turn?.animate ?? false);

        if (turn?.animate) {
          pending = index;
        } else {
          state.page = index;
        }
      },
      pendingPage: () => pending,
      pageCount: 10,
    },
  });
  const fire = (type: string, event: Record<string, unknown> = {}) => {
    const prevented = { value: false };

    handlers.get(type)?.({
      preventDefault: () => {
        prevented.value = true;
      },
      ...event,
    });

    return prevented.value;
  };

  return {
    animated,
    advance: (ms: number) => {
      time += ms;
    },
    detach,
    fire,
    goTo,
    handlers,
    host,
    state,
  };
};

describe('attachPdfPaging', () => {
  it('makes the host focusable and takes focus without framing the page', () => {
    const { host } = setUp();

    assert.equal(host.tabIndex, 0);
    assert.equal(host.style.outline, 'none');
    assert.equal(host.focused, 1);
  });

  it('turns the page on the arrows and Page Up/Down and stops the browser scrolling', () => {
    const { fire, goTo } = setUp({ page: 5 });

    assert.equal(fire('keydown', { key: 'ArrowRight' }), true);
    assert.equal(fire('keydown', { key: 'PageUp' }), true);
    assert.equal(fire('keydown', { key: 'ArrowLeft' }), true);
    assert.equal(fire('keydown', { key: 'PageDown' }), true);

    assert.deepEqual(goTo, [6, 5, 4, 5]);
  });

  it('slides key turns but not wheel turns', () => {
    const { advance, animated, fire } = setUp({ page: 5 });

    fire('keydown', { key: 'ArrowRight' });
    // Past the pause that follows a turn, then a flick of the wheel.
    advance(5_000);
    fire('wheel', { deltaMode: 0, deltaX: 0, deltaY: 400 });

    assert.deepEqual(animated, [true, false]);
  });

  it('adds up quick repeated key turns on the page the slide is heading to', () => {
    const { fire, goTo } = setUp({ page: 5 });

    fire('keydown', { key: 'ArrowRight' });
    fire('keydown', { key: 'ArrowRight' });
    fire('keydown', { key: 'ArrowRight' });

    // The reported page stays 5 while sliding; the targets still add up.
    assert.deepEqual(goTo, [6, 7, 8]);
  });

  it('works in strip too', () => {
    const { fire, goTo } = setUp({ layout: 'strip', page: 2 });

    fire('keydown', { key: 'ArrowRight' });

    assert.deepEqual(goTo, [3]);
  });

  it('does not go past the first or last page', () => {
    const first = setUp({ page: 0 });
    const last = setUp({ page: 9 });

    first.fire('keydown', { key: 'ArrowLeft' });
    last.fire('keydown', { key: 'ArrowRight' });

    assert.deepEqual(first.goTo, []);
    assert.deepEqual(last.goTo, []);
  });

  it('leaves keys alone in scroll, with a shortcut, or while typing', () => {
    const scroll = setUp({ layout: 'scroll' });
    const paged = setUp();

    assert.equal(scroll.fire('keydown', { key: 'ArrowRight' }), false);
    assert.equal(
      paged.fire('keydown', { ctrlKey: true, key: 'ArrowRight' }),
      false,
    );
    assert.equal(
      paged.fire('keydown', {
        key: 'ArrowRight',
        target: { tagName: 'INPUT' },
      }),
      false,
    );
    assert.deepEqual(scroll.goTo.concat(paged.goTo), []);
  });

  it('slides the strip sideways by the wheel', () => {
    const { fire, host } = setUp({ layout: 'strip' });

    assert.equal(fire('wheel', { deltaMode: 0, deltaY: 60 }), true);
    assert.equal(host.scrollLeft, 160);
    fire('wheel', { deltaMode: 0, deltaY: -20 });
    assert.equal(host.scrollLeft, 140);
  });

  it('turns one page per flick of the wheel in pages', () => {
    const { advance, fire, goTo } = setUp({ page: 3 });

    for (let tick = 0; tick < 5; tick += 1) {
      fire('wheel', { deltaMode: 0, deltaY: 100 });
      advance(30);
    }

    assert.deepEqual(goTo, [4]);
  });

  it('leaves the wheel to the browser when zoomed in, in scroll, or for zoom', () => {
    const zoomed = setUp({ layout: 'strip', zoom: 2 });
    const scroll = setUp({ layout: 'scroll' });
    const pinch = setUp({ layout: 'strip' });

    assert.equal(zoomed.fire('wheel', { deltaY: 100 }), false);
    assert.equal(scroll.fire('wheel', { deltaY: 100 }), false);
    assert.equal(pinch.fire('wheel', { ctrlKey: true, deltaY: 100 }), false);
    assert.equal(zoomed.host.scrollLeft, 100);
    assert.equal(pinch.host.scrollLeft, 100);
  });

  it('follows a layout change without being attached again', () => {
    const { fire, goTo, state } = setUp({ layout: 'scroll', page: 1 });

    assert.equal(fire('keydown', { key: 'ArrowRight' }), false);
    state.layout = 'pages';
    assert.equal(fire('keydown', { key: 'ArrowRight' }), true);
    assert.deepEqual(goTo, [2]);
  });

  it('removes its listeners and restores the host when detached', () => {
    const { detach, handlers, host } = setUp();

    detach();

    assert.equal(handlers.size, 0);
    assert.equal(host.tabIndex, -1);
    assert.equal(host.style.outline, 'auto');
  });
});
