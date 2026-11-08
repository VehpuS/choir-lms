/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { useTrackDurations, type TrackDurations } from './use-track-durations';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Only the fields the hook reads; the rest of a source is irrelevant here.
const source = (id: string, durationMs?: number): DriveAudioSource =>
  ({ id, name: id, durationMs }) as DriveAudioSource;

const render = async (
  tracks: DriveAudioSource[],
  probe: (track: DriveAudioSource) => Promise<number | null>,
) => {
  const saved: Array<[string, number]> = [];
  const result: { current: TrackDurations | null } = { current: null };
  const Probe = () => {
    result.current = useTrackDurations(tracks, {
      accessToken: 'token',
      persistDuration: (id, ms) => saved.push([id, ms]),
      probe,
    });

    return null;
  };

  await act(async () => {
    create(createElement(Probe));
  });

  return { result, saved };
};

describe('useTrackDurations', () => {
  it('reads only the lengths the library lacks and saves each one', async () => {
    const probed: string[] = [];
    const { result, saved } = await render(
      [source('a', 1000), source('b'), source('c')],
      async (track) => {
        probed.push(track.id);

        return track.id === 'b' ? 2000 : 3000;
      },
    );

    assert.deepEqual(probed, ['b', 'c']);
    assert.deepEqual(result.current?.durationsByTrackId, { b: 2000, c: 3000 });
    assert.deepEqual(saved, [
      ['b', 2000],
      ['c', 3000],
    ]);
  });

  it('reports a track whose length cannot be read and keeps going', async () => {
    const { result, saved } = await render(
      [source('a'), source('b')],
      async (track) => (track.id === 'a' ? null : 2000),
    );

    assert.deepEqual(result.current?.unreadableTrackIds, ['a']);
    assert.deepEqual(result.current?.durationsByTrackId, { b: 2000 });
    assert.deepEqual(saved, [['b', 2000]]);
  });
});
