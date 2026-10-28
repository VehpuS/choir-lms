import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  attachWheelScroll,
  type WheelScrollHost,
} from './attach-wheel-scroll.web.js';

const createHost = () => {
  let listener: ((event: never) => void) | null = null;
  let options: { passive: false } | null = null;
  const host: WheelScrollHost = {
    addEventListener: (_type, next, nextOptions) => {
      listener = next as never;
      options = nextOptions;
    },
    removeEventListener: () => {
      listener = null;
    },
  };

  return {
    host,
    options: () => options,
    isAttached: () => listener !== null,
    wheel: (event: {
      deltaX?: number;
      deltaY?: number;
      shiftKey?: boolean;
    }) => {
      let prevented = false;

      listener?.({
        ...event,
        preventDefault: () => {
          prevented = true;
        },
      } as never);

      return prevented;
    },
  };
};

describe('attachWheelScroll', () => {
  it('listens non-passively so preventDefault takes effect', () => {
    const fake = createHost();

    attachWheelScroll(fake.host, () => undefined);

    assert.deepEqual(fake.options(), { passive: false });
  });

  it('scrolls and claims the gesture for a horizontal movement', () => {
    const fake = createHost();
    const scrolls: number[] = [];

    attachWheelScroll(fake.host, (delta) => scrolls.push(delta));

    assert.equal(fake.wheel({ deltaX: 24 }), true);
    assert.deepEqual(scrolls, [24]);
  });

  it('leaves a vertical movement to the page unless Shift is held', () => {
    const fake = createHost();
    const scrolls: number[] = [];

    attachWheelScroll(fake.host, (delta) => scrolls.push(delta));

    assert.equal(fake.wheel({ deltaY: 30 }), false);
    assert.deepEqual(scrolls, []);
    assert.equal(fake.wheel({ deltaY: 30, shiftKey: true }), true);
    assert.deepEqual(scrolls, [30]);
  });

  it('stops listening when detached', () => {
    const fake = createHost();

    attachWheelScroll(fake.host, () => undefined)();

    assert.equal(fake.isAttached(), false);
  });
});
