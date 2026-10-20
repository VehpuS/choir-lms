import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  createKeyboardLayout,
  PIANO_KEYS,
  WHITE_KEY_WIDTH,
} from './keyboard-layout.js';
import { createKeyGestures, keyAtPoint } from './piano-key-gestures.js';

const KEY_HEIGHT = 100;
const WHITE_ZONE_Y = 90;
const SCROLL_STRIP_Y = 120;
const MIDDLE_C = 60;

const keyByMidi = (midi: number) => PIANO_KEYS[midi - 21];
/** A point inside the white-key-only area under the black keys. */
const whiteAt = (midi: number) => ({
  x: keyByMidi(midi).left + WHITE_KEY_WIDTH / 2,
  y: WHITE_ZONE_Y,
});

const createHarness = (maxVoices?: number) => {
  const events: string[] = [];
  const gestures = createKeyGestures(
    {
      press: (midi) => events.push(`+${midi}`),
      release: (midi) => events.push(`-${midi}`),
    },
    { keyHeight: () => KEY_HEIGHT, maxVoices },
  );

  return { events, gestures };
};

describe('key hit-testing at a wider key width', () => {
  const wide = createKeyboardLayout(80);

  it('finds the key under a point on the wider keys', () => {
    const d4 = wide.keys[62 - 21];

    assert.equal(
      keyAtPoint(d4.left + d4.width / 2, WHITE_ZONE_Y, KEY_HEIGHT, wide)?.midi,
      62,
    );
    // At 40 pt the same x lands on a different (higher) key.
    assert.notEqual(
      keyAtPoint(d4.left + d4.width / 2, WHITE_ZONE_Y, KEY_HEIGHT)?.midi,
      62,
    );
  });

  it('prefers the wider black key in its region', () => {
    const black = wide.keys[61 - 21];

    assert.equal(
      keyAtPoint(black.left + black.width / 2, 10, KEY_HEIGHT, wide)?.midi,
      61,
    );
    assert.equal(
      keyAtPoint(black.left + black.width - 1, 10, KEY_HEIGHT, wide)?.midi,
      61,
    );
  });

  it('uses the layout the model is asked for at each touch', () => {
    const events: string[] = [];
    let layout = createKeyboardLayout(40);
    const gestures = createKeyGestures(
      {
        press: (midi) => events.push(`+${midi}`),
        release: (midi) => events.push(`-${midi}`),
      },
      { keyHeight: () => KEY_HEIGHT, layout: () => layout },
    );
    const d4Wide = createKeyboardLayout(80).keys[62 - 21];
    const x = d4Wide.left + d4Wide.width / 2;

    gestures.pointerDown(1, x, WHITE_ZONE_Y);
    gestures.pointerUp(1);
    layout = createKeyboardLayout(80);
    gestures.pointerDown(2, x, WHITE_ZONE_Y);
    gestures.pointerUp(2);

    assert.notEqual(events[0], '+62');
    assert.deepEqual(events.slice(-2), ['+62', '-62']);
  });
});

describe('key hit-testing', () => {
  it('prefers a black key in its region and the white key below it', () => {
    const black = keyByMidi(61);
    const centre = black.left + black.width / 2;

    assert.equal(keyAtPoint(centre, 10, KEY_HEIGHT)?.midi, 61);
    // The black key's centre is the C/D boundary, so probe just left of it.
    assert.equal(keyAtPoint(centre - 5, WHITE_ZONE_Y, KEY_HEIGHT)?.midi, 60);
  });

  it('finds nothing outside the keys', () => {
    assert.equal(keyAtPoint(10, SCROLL_STRIP_Y, KEY_HEIGHT), null);
    assert.equal(keyAtPoint(-5, 10, KEY_HEIGHT), null);
  });
});

describe('key gestures', () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
  });

  it('sounds a held key until it is released', () => {
    const { x, y } = whiteAt(MIDDLE_C);

    assert.equal(harness.gestures.pointerDown(1, x, y), 'play');
    assert.deepEqual(harness.events, ['+60']);

    harness.gestures.pointerUp(1);
    assert.deepEqual(harness.events, ['+60', '-60']);
  });

  it('sounds two keys for two fingers and releases each on its own', () => {
    harness.gestures.pointerDown(1, whiteAt(60).x, WHITE_ZONE_Y);
    harness.gestures.pointerDown(2, whiteAt(64).x, WHITE_ZONE_Y);
    harness.gestures.pointerUp(1);

    assert.deepEqual(harness.events, ['+60', '+64', '-60']);
  });

  it('releases the first key and presses the next when sliding', () => {
    harness.gestures.pointerDown(1, whiteAt(60).x, WHITE_ZONE_Y);
    harness.gestures.pointerMove(1, whiteAt(62).x, WHITE_ZONE_Y);

    assert.deepEqual(harness.events, ['+60', '-60', '+62']);
  });

  it('does nothing for a move that stays on the same key', () => {
    const { x, y } = whiteAt(60);

    harness.gestures.pointerDown(1, x, y);
    harness.gestures.pointerMove(1, x + 3, y);

    assert.deepEqual(harness.events, ['+60']);
  });

  it('scrolls, without sound, for a touch that begins beneath the keys', () => {
    const role = harness.gestures.pointerDown(1, 200, SCROLL_STRIP_Y);

    harness.gestures.pointerMove(1, 400, SCROLL_STRIP_Y);
    harness.gestures.pointerMove(1, 400, 50);
    harness.gestures.pointerUp(1);

    assert.equal(role, 'scroll');
    assert.deepEqual(harness.events, []);
  });

  it('keeps a key sounding until the last finger on it lets go', () => {
    harness.gestures.pointerDown(1, whiteAt(60).x, WHITE_ZONE_Y);
    harness.gestures.pointerDown(2, whiteAt(60).x, WHITE_ZONE_Y);
    harness.gestures.pointerUp(1);
    assert.deepEqual(harness.events, ['+60']);

    harness.gestures.pointerUp(2);
    assert.deepEqual(harness.events, ['+60', '-60']);
  });

  it('releases on cancel and when a finger leaves the keys', () => {
    harness.gestures.pointerDown(1, whiteAt(60).x, WHITE_ZONE_Y);
    harness.gestures.pointerMove(1, whiteAt(60).x, SCROLL_STRIP_Y);
    harness.gestures.pointerDown(2, whiteAt(62).x, WHITE_ZONE_Y);
    harness.gestures.pointerCancel(2);

    assert.deepEqual(harness.events, ['+60', '-60', '+62', '-62']);
  });

  it('releases every key with releaseAll', () => {
    harness.gestures.pointerDown(1, whiteAt(60).x, WHITE_ZONE_Y);
    harness.gestures.pointerDown(2, whiteAt(62).x, WHITE_ZONE_Y);
    harness.gestures.releaseAll();

    assert.deepEqual(harness.events, ['+60', '+62', '-60', '-62']);
  });

  it('releases the oldest key past the voice cap', () => {
    const capped = createHarness(2);

    capped.gestures.pointerDown(1, whiteAt(60).x, WHITE_ZONE_Y);
    capped.gestures.pointerDown(2, whiteAt(62).x, WHITE_ZONE_Y);
    capped.gestures.pointerDown(3, whiteAt(64).x, WHITE_ZONE_Y);
    // The dropped finger lifting later must not release anything twice.
    capped.gestures.pointerUp(1);

    assert.deepEqual(capped.events, ['+60', '+62', '-60', '+64']);
  });
});
