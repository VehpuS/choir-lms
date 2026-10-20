import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createComputerKeyboard } from './computer-keyboard.js';

const MIDDLE_C = 60;
const OCTAVE = 12;

const setup = () => {
  const events: string[] = [];
  const keyboard = createComputerKeyboard({
    press: (midi) => events.push(`press ${midi}`),
    release: (midi) => events.push(`release ${midi}`),
  });
  const down = (code: string, overrides = {}) =>
    keyboard.keyDown({
      code,
      repeat: false,
      hasShortcutModifier: false,
      isEditableTarget: false,
      ...overrides,
    });

  return { events, keyboard, down };
};

describe('computer keyboard piano', () => {
  it('plays middle C on A and the black key above it on W', () => {
    const { events, keyboard, down } = setup();

    assert.equal(down('KeyA'), true);
    assert.equal(down('KeyW'), true);
    keyboard.keyUp('KeyA');

    assert.deepEqual(events, [
      `press ${MIDDLE_C}`,
      `press ${MIDDLE_C + 1}`,
      `release ${MIDDLE_C}`,
    ]);
  });

  it('does not retrigger a held key on auto-repeat', () => {
    const { events, down } = setup();

    down('KeyA');
    down('KeyA', { repeat: true });

    assert.deepEqual(events, [`press ${MIDDLE_C}`]);
  });

  it('moves the home row by an octave with Z and X, within three octaves', () => {
    const { events, keyboard, down } = setup();

    down('KeyX');
    down('KeyA');
    keyboard.keyUp('KeyA');
    down('KeyZ');
    down('KeyZ');
    down('KeyA');

    assert.deepEqual(events, [
      `press ${MIDDLE_C + OCTAVE}`,
      `release ${MIDDLE_C + OCTAVE}`,
      `press ${MIDDLE_C - OCTAVE}`,
    ]);

    [1, 2, 3, 4, 5].forEach(() => down('KeyZ'));
    events.length = 0;
    down('KeyS');

    assert.deepEqual(events, [`press ${MIDDLE_C - 3 * OCTAVE + 2}`]);
  });

  it('releases the note a key started even after the octave moved', () => {
    const { events, keyboard, down } = setup();

    down('KeyA');
    down('KeyX');
    keyboard.keyUp('KeyA');

    assert.deepEqual(events, [`press ${MIDDLE_C}`, `release ${MIDDLE_C}`]);
  });

  it('ignores notes beyond the 88 keys', () => {
    const { events, down } = setup();

    [1, 2, 3].forEach(() => down('KeyX'));
    down('Semicolon');

    assert.deepEqual(events, []);
  });

  it('leaves shortcuts, typing, and other keys alone', () => {
    const { events, down } = setup();

    assert.equal(down('KeyA', { hasShortcutModifier: true }), false);
    assert.equal(down('KeyA', { isEditableTarget: true }), false);
    assert.equal(down('Space'), false);
    assert.deepEqual(events, []);
  });

  it('releases every held key at once', () => {
    const { events, keyboard, down } = setup();

    down('KeyA');
    down('KeyD');
    keyboard.releaseAll();
    keyboard.releaseAll();

    assert.deepEqual(events, [
      `press ${MIDDLE_C}`,
      `press ${MIDDLE_C + 4}`,
      `release ${MIDDLE_C}`,
      `release ${MIDDLE_C + 4}`,
    ]);
  });
});
