import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createMediaElementTransport,
  type MediaElementLike,
} from './recording-transport.web.js';

const createElement = () => {
  const handlers = new Map<string, Set<() => void>>();
  const element: MediaElementLike = {
    currentTime: 12.5,
    paused: false,
    ended: false,
    addEventListener: (type, listener) => {
      handlers.set(type, (handlers.get(type) ?? new Set()).add(listener));
    },
    removeEventListener: (type, listener) => {
      handlers.get(type)?.delete(listener);
    },
  };

  return {
    element,
    fire: (type: string) => handlers.get(type)?.forEach((fn) => fn()),
    listenerCount: () =>
      [...handlers.values()].reduce((sum, set) => sum + set.size, 0),
  };
};

describe('createMediaElementTransport', () => {
  it('reads the position in milliseconds and whether the element plays', () => {
    const fake = createElement();
    const transport = createMediaElementTransport(fake.element);

    assert.equal(transport.getPositionMs(), 12_500);
    assert.equal(transport.isPlaying(), true);

    fake.element.paused = true;
    assert.equal(transport.isPlaying(), false);

    fake.element.paused = false;
    fake.element.ended = true;
    assert.equal(transport.isPlaying(), false);
  });

  it('reports play, pause, a finished track as a pause, and seeks', () => {
    const fake = createElement();
    const seen: string[] = [];
    const unsubscribe = createMediaElementTransport(fake.element).subscribe(
      (event) => seen.push(event),
    );

    ['play', 'pause', 'seeked', 'ended', 'timeupdate'].forEach(fake.fire);

    assert.deepEqual(seen, ['play', 'pause', 'seek', 'pause']);

    unsubscribe();
    assert.equal(fake.listenerCount(), 0);
  });
});
