import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createThumbnailQueue,
  type ThumbnailCanvas,
} from './thumbnail-queue.js';

type FakeDraw = {
  cancelled: boolean;
  finish(): void;
  index: number;
};

// A fake drawer whose renders finish only when the test says so, to observe
// the one-at-a-time rule without timers.
const setup = () => {
  const draws: FakeDraw[] = [];
  const queue = createThumbnailQueue({
    draw: (index) => {
      let finish: () => void = () => undefined;
      const done = new Promise<boolean>((resolve) => {
        finish = () => resolve(!record.cancelled);
      });
      const record: FakeDraw = {
        cancelled: false,
        finish: () => finish(),
        index,
      };

      draws.push(record);

      return {
        cancel: () => {
          record.cancelled = true;
          finish();
        },
        done,
      };
    },
  });

  return { draws, queue };
};

const canvas = (): ThumbnailCanvas => ({ height: 320, width: 240 });
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('createThumbnailQueue', () => {
  it('draws one thumbnail at a time, in the order requested', async () => {
    const { draws, queue } = setup();

    queue.enqueue(3, canvas(), 120);
    queue.enqueue(4, canvas(), 120);
    queue.enqueue(5, canvas(), 120);

    assert.deepEqual(
      draws.map((draw) => draw.index),
      [3],
    );

    draws[0]?.finish();
    await settle();
    assert.deepEqual(
      draws.map((draw) => draw.index),
      [3, 4],
    );

    draws[1]?.finish();
    await settle();
    assert.deepEqual(
      draws.map((draw) => draw.index),
      [3, 4, 5],
    );
  });

  it('draws a prioritized page before the other queued ones', async () => {
    const { draws, queue } = setup();

    queue.enqueue(0, canvas(), 120);
    queue.enqueue(1, canvas(), 120);
    queue.enqueue(2, canvas(), 120);
    queue.prioritize(2);

    draws[0]?.finish();
    await settle();

    assert.deepEqual(
      draws.map((draw) => draw.index),
      [0, 2],
    );
  });

  it('does not draw a page twice', async () => {
    const { draws, queue } = setup();

    queue.enqueue(0, canvas(), 120);
    queue.enqueue(0, canvas(), 120);
    draws[0]?.finish();
    await settle();
    queue.enqueue(0, canvas(), 120);

    assert.equal(draws.length, 1);
  });

  it('cancels a drawing page that is discarded and frees its canvas', async () => {
    const { draws, queue } = setup();
    const first = canvas();

    queue.enqueue(0, first, 120);
    queue.enqueue(1, canvas(), 120);
    queue.discard(0);

    assert.equal(draws[0]?.cancelled, true);
    assert.equal(first.width, 0);

    await settle();
    // The next wanted page is drawn after the cancelled one.
    assert.deepEqual(
      draws.map((draw) => draw.index),
      [0, 1],
    );
  });

  it('drops a queued page that is discarded without drawing it', async () => {
    const { draws, queue } = setup();
    const waiting = canvas();

    queue.enqueue(0, canvas(), 120);
    queue.enqueue(1, waiting, 120);
    queue.discard(1);
    draws[0]?.finish();
    await settle();

    assert.equal(draws.length, 1);
    assert.equal(waiting.width, 0);
  });

  it('frees a finished thumbnail when it is discarded', async () => {
    const { draws, queue } = setup();
    const drawn = canvas();

    queue.enqueue(0, drawn, 120);
    draws[0]?.finish();
    await settle();

    queue.discard(0);

    assert.equal(drawn.width, 0);
    assert.equal(drawn.height, 0);
  });

  it('releases everything, and releasing again changes nothing', async () => {
    const { draws, queue } = setup();
    const drawing = canvas();
    const waiting = canvas();

    queue.enqueue(0, drawing, 120);
    queue.enqueue(1, waiting, 120);
    queue.release();
    queue.release();
    await settle();

    assert.equal(draws[0]?.cancelled, true);
    assert.equal(drawing.width, 0);
    assert.equal(waiting.width, 0);
    assert.equal(draws.length, 1);
  });

  it('ignores requests after release', () => {
    const { draws, queue } = setup();

    queue.release();
    queue.enqueue(0, canvas(), 120);

    assert.equal(draws.length, 0);
  });

  it('discards one page, freeing it and letting it be queued again', async () => {
    const { draws, queue } = setup();
    const first = canvas();

    queue.enqueue(0, first, 120);
    queue.discard(0);

    assert.equal(draws[0]?.cancelled, true);
    assert.equal(first.width, 0);

    queue.enqueue(0, canvas(), 140);
    await settle();

    assert.equal(draws.length, 2);
  });
});
