/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SheetMusicSource } from '@org/audio-library-models';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { usePdfLayoutControl } from './use-pdf-layout-control.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Control = ReturnType<typeof usePdfLayoutControl>;

// A file that has chosen `spread` for itself, whatever the device layout is.
const SPREAD_SOURCE: SheetMusicSource = {
  addedAt: '2026-10-26T00:00:00.000Z',
  format: 'pdf',
  id: 'score',
  label: 'Score',
  location: { kind: 'url', url: 'https://example.test/score.pdf' },
  pdfLayout: 'spread',
};

const mount = async (isSpreadAvailable: boolean) => {
  const box: { current?: Control } = {};
  const Probe = () => {
    box.current = usePdfLayoutControl({
      isPdf: true,
      isSpreadAvailable,
      onSaveSourceLayout: () => undefined,
      source: SPREAD_SOURCE,
    });

    return null;
  };

  await act(async () => {
    create(createElement(Probe));
  });

  return box;
};

describe('usePdfLayoutControl', () => {
  it('is in spread, and shows the spread glyph, while the viewer is wide enough', async () => {
    const box = await mount(true);

    assert.equal(box.current?.layout, 'spread');
    assert.equal(box.current?.button?.layout, 'spread');
  });

  it('shows a stored spread as pages while the viewer is too narrow', async () => {
    const box = await mount(false);

    assert.equal(box.current?.layout, 'pages');
    assert.equal(box.current?.button?.layout, 'pages');
  });
});
