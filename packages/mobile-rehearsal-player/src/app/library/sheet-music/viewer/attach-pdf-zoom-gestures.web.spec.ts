import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  attachPdfZoomGestures,
  type GestureHost,
} from './attach-pdf-zoom-gestures.web.js';

type Handler = (event: Record<string, unknown>) => void;

// A stand-in for the scrolling element: it records listeners and sizes the
// content in proportion to the zoom, as drawn pages do.
const setUp = (startZoom = 1, options: { around?: boolean } = {}) => {
  const handlers = new Map<string, Handler>();
  const state = {
    around: [] as Array<{ focal: { x: number; y: number }; zoom: number }>,
    zoom: startZoom,
    zooms: [] as number[],
  };
  const host = {
    addEventListener: (type: string, listener: unknown) => {
      handlers.set(type, listener as Handler);
    },
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
    removeEventListener: (type: string) => {
      handlers.delete(type);
    },
    scrollLeft: 0,
    scrollTop: 400,
    style: { touchAction: 'auto' },
    get scrollHeight() {
      return 1000 * state.zoom;
    },
    get scrollWidth() {
      return 500 * state.zoom;
    },
  };
  const changes: number[] = [];
  const frames: Array<() => void> = [];
  let time = 0;
  const detach = attachPdfZoomGestures({
    host: host as unknown as GestureHost,
    max: 4,
    now: () => time,
    onZoomChange: (zoom) => changes.push(zoom),
    pdf: {
      currentZoom: () => state.zoom,
      setZoom: (zoom) => {
        state.zoom = zoom;
        state.zooms.push(zoom);
      },
      // A target that places the scroll itself (the real renderer does).
      ...(options.around
        ? {
            setZoomAround: (zoom: number, focal: { x: number; y: number }) => {
              state.zoom = zoom;
              state.around.push({ focal, zoom });
            },
          }
        : {}),
    },
    // Frames run when the spec says so, so batching can be observed.
    requestFrame: (callback) => frames.push(callback),
  });
  const flush = () => frames.splice(0).forEach((frame) => frame());
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
    advance: (ms: number) => {
      time += ms;
    },
    changes,
    detach,
    fire,
    flush,
    handlers,
    host,
    state,
  };
};

const touch = (x: number, y: number) => ({ clientX: x, clientY: y });

describe('attachPdfZoomGestures', () => {
  it('keeps the browser from zooming the page and gives scrolling back to it', () => {
    const { handlers, host } = setUp();

    assert.equal(host.style.touchAction, 'pan-x pan-y');
    assert.ok(handlers.has('wheel') && handlers.has('touchmove'));
  });

  it('zooms on Ctrl + wheel, keeps the point under the pointer, and reports the zoom', () => {
    const { changes, fire, flush, host, state } = setUp();
    const prevented = fire('wheel', {
      clientX: 110,
      clientY: 120,
      ctrlKey: true,
      deltaMode: 0,
      deltaY: -20,
    });

    flush();

    assert.equal(prevented, true);
    assert.ok(state.zoom > 1);
    assert.deepEqual(changes, [state.zoom]);
    // The point 100 px in and 100 px down (scroll 400) stays where it was.
    const ratio = state.zoom;

    assert.ok(Math.abs(host.scrollTop - ((400 + 100) * ratio - 100)) < 1e-6);
    assert.ok(Math.abs(host.scrollLeft - (100 * ratio - 100)) < 1e-6);
  });

  it('leaves a plain wheel alone so the page scrolls', () => {
    const { changes, fire, flush } = setUp();
    const prevented = fire('wheel', { clientX: 0, clientY: 0, deltaY: 50 });

    flush();

    assert.equal(prevented, false);
    assert.deepEqual(changes, []);
  });

  it('draws only the latest zoom when many wheel events arrive within a frame', () => {
    const { fire, flush, state } = setUp();

    for (let step = 0; step < 5; step += 1) {
      fire('wheel', {
        clientX: 0,
        clientY: 0,
        ctrlKey: true,
        deltaMode: 0,
        deltaY: -10,
      });
    }
    flush();

    assert.equal(state.zooms.length, 1);
    assert.ok(state.zoom > 1.4);
  });

  it('pinches by the change in distance between two fingers', () => {
    const { fire, flush, state } = setUp();

    fire('touchstart', { touches: [touch(100, 100), touch(200, 100)] });
    fire('touchmove', { touches: [touch(50, 100), touch(250, 100)] });
    flush();

    assert.equal(state.zoom, 2);
  });

  it('stops pinching when a finger lifts, and a tap after a pinch is not a double tap', () => {
    const { advance, fire, flush, state } = setUp();

    fire('touchstart', { touches: [touch(100, 100), touch(200, 100)] });
    fire('touchend', {
      changedTouches: [touch(200, 100)],
      touches: [touch(100, 100)],
    });
    fire('touchend', { changedTouches: [touch(100, 100)], touches: [] });
    advance(100);
    fire('touchstart', { touches: [touch(100, 100)] });
    fire('touchend', { changedTouches: [touch(100, 100)], touches: [] });
    flush();

    assert.equal(state.zoom, 1);
  });

  it('toggles to a readable size on a double tap and back on the next', () => {
    const { advance, fire, flush, state } = setUp();
    const tap = () => {
      fire('touchstart', { touches: [touch(100, 100)] });
      fire('touchend', { changedTouches: [touch(100, 100)], touches: [] });
    };

    tap();
    advance(150);
    tap();
    flush();
    assert.equal(state.zoom, 2);

    advance(1000);
    tap();
    advance(150);
    tap();
    flush();
    assert.equal(state.zoom, 1);
  });

  it('does not count a scroll that ends in place as a tap', () => {
    const { advance, fire, flush, state } = setUp();

    fire('touchstart', { touches: [touch(100, 100)] });
    fire('touchmove', { touches: [touch(100, 160)] });
    fire('touchend', { changedTouches: [touch(100, 100)], touches: [] });
    advance(100);
    fire('touchstart', { touches: [touch(100, 100)] });
    fire('touchend', { changedTouches: [touch(100, 100)], touches: [] });
    flush();

    assert.equal(state.zoom, 1);
  });

  it('toggles on a double click, once even when a touch double tap also fires one', () => {
    const { advance, fire, flush, state } = setUp();

    fire('dblclick', { clientX: 50, clientY: 50 });
    flush();
    assert.equal(state.zoom, 2);

    advance(2000);
    fire('touchstart', { touches: [touch(100, 100)] });
    fire('touchend', { changedTouches: [touch(100, 100)], touches: [] });
    advance(100);
    fire('touchstart', { touches: [touch(100, 100)] });
    fire('touchend', { changedTouches: [touch(100, 100)], touches: [] });
    fire('dblclick', { clientX: 100, clientY: 100 });
    flush();

    assert.equal(state.zoom, 1);
  });

  it('follows Safari gesture events and clamps to the maximum', () => {
    const { fire, flush, state } = setUp(1.5);

    fire('gesturestart', { clientX: 0, clientY: 0, scale: 1 });
    fire('gesturechange', { clientX: 0, clientY: 0, scale: 9 });
    flush();

    assert.equal(state.zoom, 4);
  });

  it('leaves the scroll to a target that keeps the focal point itself', () => {
    const { changes, fire, flush, host, state } = setUp(1, { around: true });

    fire('wheel', { ctrlKey: true, deltaY: -30, clientX: 110, clientY: 70 });
    flush();

    // Focal point is relative to the host's top left (10, 20).
    assert.deepEqual(
      state.around.map(({ focal }) => focal),
      [{ x: 100, y: 50 }],
    );
    assert.equal(state.zooms.length, 0);
    assert.equal(host.scrollLeft, 0);
    assert.equal(host.scrollTop, 400);
    assert.equal(changes.length, 1);
  });

  it('removes its listeners and restores touch action when detached', () => {
    const { detach, handlers, host } = setUp();

    detach();

    assert.equal(handlers.size, 0);
    assert.equal(host.style.touchAction, 'auto');
  });
});
