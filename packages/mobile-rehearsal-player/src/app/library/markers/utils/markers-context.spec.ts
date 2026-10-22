import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PLAYBACK_SHAPING,
  type DriveAudioSource,
  type NamedLoop,
} from '@org/audio-library-models';

import { resolveMarkersContext } from './markers-context';

const SLOW_SHAPING = { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.75 };

const buildSource = (
  overrides: Partial<DriveAudioSource> = {},
): DriveAudioSource =>
  ({
    id: 'source-1',
    name: 'Ave Maria',
    ...overrides,
  }) as DriveAudioSource;

const buildLoop = (overrides: Partial<NamedLoop> = {}): NamedLoop =>
  ({
    id: 'loop-1',
    name: 'Verse 2',
    sourceId: 'source-1',
    sourceName: 'Ave Maria',
    startMs: 60_000,
    endMs: 90_000,
    ...overrides,
  }) as NamedLoop;

describe('resolveMarkersContext', () => {
  it('opens a track over its whole length', () => {
    const source = buildSource({ durationMs: 180_000 });
    const context = resolveMarkersContext(
      { id: 'source-1', kind: 'track' },
      [source],
      [],
    );

    assert.equal(context?.item, source);
    assert.equal(context?.range, undefined);
    assert.equal(context?.target.kind, 'track');
    assert.equal(context?.target.sourceId, 'source-1');
  });

  it('opens a loop within its start and end', () => {
    const context = resolveMarkersContext(
      { id: 'loop-1', kind: 'loop' },
      [buildSource()],
      [buildLoop()],
    );

    assert.deepEqual(context?.range, { startMs: 60_000, endMs: 90_000 });
    assert.deepEqual(context?.item, { id: 'loop-1', sourceId: 'source-1' });
    assert.equal(context?.target.kind, 'loop');
    assert.equal(context?.target.loopId, 'loop-1');
  });

  it('opens an adjusted track like any track, keeping its shaping', () => {
    const adjusted = buildSource({
      id: 'adjusted-1',
      adjustment: {
        sourceRef: 'source-1',
        sourceName: 'Ave Maria',
        transform: SLOW_SHAPING,
      },
    });
    const context = resolveMarkersContext(
      { id: 'adjusted-1', kind: 'track' },
      [buildSource(), adjusted],
      [],
    );

    assert.equal(context?.item, adjusted);
    assert.deepEqual(context?.target.transform, SLOW_SHAPING);
  });

  it('has no context for a missing track, loop, or loop track', () => {
    assert.equal(
      resolveMarkersContext({ id: 'nope', kind: 'track' }, [buildSource()], []),
      null,
    );
    assert.equal(
      resolveMarkersContext(
        { id: 'nope', kind: 'loop' },
        [buildSource()],
        [buildLoop()],
      ),
      null,
    );
    assert.equal(
      resolveMarkersContext({ id: 'loop-1', kind: 'loop' }, [], [buildLoop()]),
      null,
    );
  });
});
