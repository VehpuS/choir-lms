import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import { hasRenderedText } from '../../../test-support/rendered-text';
import { PracticeToolsMenu } from './practice-tools-menu';
import { getPracticeToolsModel } from './practice-tools-model';

const renderMenu = (options: { pianoOn: boolean; sheetMusic: boolean }) => {
  const toggled: string[] = [];
  const closed: string[] = [];
  const model = getPracticeToolsModel({
    piano: { checked: options.pianoOn },
    pitch: { checked: false },
    otherOctave: { checked: false },
    isSheetMusicOpen: options.sheetMusic,
  });

  render(
    <PracticeToolsMenu
      model={model}
      onClose={() => closed.push('close')}
      onToggle={(id) => toggled.push(id)}
    />,
  );

  return { toggled, closed };
};

describe('PracticeToolsMenu', () => {
  afterEach(cleanup);

  it('shows the title and a labelled switch per tool with its state', () => {
    renderMenu({ pianoOn: true, sheetMusic: false });

    assert.ok(hasRenderedText('Practice tools'));
    assert.ok(screen.getByLabelText('Piano, on'));
    assert.ok(screen.getByLabelText('Pitch detection, off'));
    assert.equal(
      screen.queryByLabelText('Show other-octave matches, off'),
      null,
    );
  });

  it('adds the other-octave row next to a score', () => {
    renderMenu({ pianoOn: false, sheetMusic: true });

    assert.ok(screen.getByLabelText('Show other-octave matches, off'));
  });

  it('explains the other-octave row with a helper line, and no other row', () => {
    renderMenu({ pianoOn: false, sheetMusic: true });

    assert.ok(
      hasRenderedText('Also lightly marks the same note in other octaves'),
    );
  });

  it('shows no helper line without a score', () => {
    renderMenu({ pianoOn: false, sheetMusic: false });

    assert.equal(
      hasRenderedText('Also lightly marks the same note in other octaves'),
      false,
    );
  });

  it('toggles a tool without closing the menu', () => {
    const { toggled, closed } = renderMenu({
      pianoOn: false,
      sheetMusic: false,
    });

    fireEvent.press(screen.getByLabelText('Piano, off'));
    fireEvent.press(screen.getByLabelText('Pitch detection, off'));

    assert.deepEqual(toggled, ['piano', 'pitch']);
    assert.deepEqual(closed, []);
  });

  it('closes on a press outside the panel', () => {
    const { closed } = renderMenu({ pianoOn: false, sheetMusic: false });

    fireEvent.press(screen.getByLabelText('Close practice tools'));

    assert.deepEqual(closed, ['close']);
  });
});
