import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react-native/pure';

import type { CompositeTrack } from '@org/audio-library-models';
import { createDefaultMix, startSessionMix } from '@org/audio-mixing';

import { hasRenderedText } from '../../../../test-support/rendered-text';
import { CompositeMixPanelView } from './composite-mix-panel';

const stems: CompositeTrack['stems'] = [
  { id: 's', trackId: 't-s', name: 'Soprano', offsetMs: 0, mine: false },
  { id: 'b', trackId: 't-b', name: 'Bass', offsetMs: 0, mine: true },
];
const composite = {
  id: 'c1',
  stems,
  presets: [],
  defaultMix: createDefaultMix(stems),
};
const available = { status: 'available' } as never;
const libraryOf = (ids: string[]) =>
  new Map(ids.map((id) => [id, { id, availability: available }]));

const renderPanel = (
  overrides: Partial<Parameters<typeof CompositeMixPanelView>[0]> = {},
) => {
  const calls: string[] = [];
  const record =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push([name, ...args].join(':'));
    };

  render(
    <CompositeMixPanelView
      composite={composite}
      library={libraryOf(['t-s', 't-b'])}
      session={startSessionMix(composite)}
      onChoosePreset={record('preset')}
      onMakeDefault={record('make-default')}
      onOpenOptions={record('options')}
      onResetMix={record('reset')}
      onSavePreset={record('save')}
      onRemove={record('remove')}
      onSetVolume={record('volume')}
      onToggleMute={record('mute')}
      onToggleSolo={record('solo')}
      {...overrides}
    />,
  );

  return calls;
};

describe('CompositeMixPanelView', () => {
  afterEach(cleanup);

  it('starts open with a row per stem and marks the user’s part', () => {
    renderPanel();

    assert.equal(screen.getByLabelText('Mix').props['aria-expanded'], true);
    assert.ok(screen.getByLabelText('Mute Soprano'));
    assert.ok(screen.getByLabelText('Solo Bass'));
    assert.ok(hasRenderedText('Your part'));
  });

  it('reports mute, solo and options for the stem that was pressed', () => {
    const calls = renderPanel();

    fireEvent.press(screen.getByLabelText('Mute Soprano'));
    fireEvent.press(screen.getByLabelText('Solo Bass'));
    fireEvent.press(screen.getByLabelText('Bass options'));

    assert.deepEqual(calls, ['mute:s', 'solo:b', 'options:b']);
  });

  it('shows the preset the mix has as a chip and offers Save as preset', () => {
    renderPanel();

    assert.ok(screen.getByLabelText('Mix preset: All parts'));
    assert.ok(screen.getByLabelText('Save as preset'));
  });

  it('closes to one line with the summary', () => {
    renderPanel();

    fireEvent.press(screen.getByLabelText('Mix'));

    assert.equal(screen.getByLabelText('Mix').props['aria-expanded'], false);
    assert.equal(screen.queryByLabelText('Mute Soprano'), null);
    assert.ok(hasRenderedText('All parts · 2 of 2 sounding'));
  });

  it('shows a missing stem with Remove and no mixing controls', () => {
    const calls = renderPanel({ library: libraryOf(['t-b']) });

    assert.ok(hasRenderedText('Stem missing'));
    assert.equal(screen.queryByLabelText('Mute Soprano'), null);

    fireEvent.press(screen.getByLabelText('Remove Soprano'));

    assert.deepEqual(calls, ['remove:s']);
  });
});
