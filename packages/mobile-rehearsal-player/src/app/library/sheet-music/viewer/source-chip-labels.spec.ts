import type { SheetMusicSource } from '@org/audio-library-models';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSourceChipLabels } from './source-chip-labels';

const source = (
  id: string,
  label: string,
  format: SheetMusicSource['format'],
): SheetMusicSource => ({
  addedAt: '2026-10-17T00:00:00.000Z',
  format,
  id,
  label,
  location: { kind: 'url', url: `https://example.com/${id}` },
});

describe('resolveSourceChipLabels', () => {
  it('leaves unique labels exactly as stored', () => {
    const labels = resolveSourceChipLabels([
      source('a', 'Full score', 'pdf'),
      source('b', 'Alto part', 'musicxml'),
    ]);

    assert.deepEqual(labels, { a: 'Full score', b: 'Alto part' });
  });

  it('adds the format to sources whose labels match', () => {
    const labels = resolveSourceChipLabels([
      source('a', 'Radio Video - V7.0', 'midi'),
      source('b', 'Radio Video - V7.0', 'musicxml'),
      source('c', 'Full score', 'pdf'),
    ]);

    assert.deepEqual(labels, {
      a: 'Radio Video - V7.0 · MIDI',
      b: 'Radio Video - V7.0 · MusicXML',
      c: 'Full score',
    });
  });

  it('treats labels that differ only by case or padding as the same', () => {
    const labels = resolveSourceChipLabels([
      source('a', 'Gloria', 'pdf'),
      source('b', ' gloria ', 'midi'),
    ]);

    assert.equal(labels.a, 'Gloria · PDF');
    assert.equal(labels.b, 'gloria · MIDI');
  });

  it('returns nothing for no sources', () => {
    assert.deepEqual(resolveSourceChipLabels([]), {});
  });
});
