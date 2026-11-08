import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeStem, CompositeTrack } from '@org/audio-library-models';

import {
  formatOffsetLabel,
  MAX_STEM_OFFSET_MS,
  resolveStemOptionsModel,
  stepOffsetMs,
} from './stem-options-model';

const stem = (
  id: string,
  overrides: Partial<CompositeStem> = {},
): CompositeStem =>
  ({
    id,
    trackId: `track-${id}`,
    name: id,
    offsetMs: 0,
    mine: false,
    ...overrides,
  }) as CompositeStem;

// Only the fields the model reads; the rest of a record is irrelevant here.
const composite = (stems: CompositeStem[]): CompositeTrack =>
  ({ id: 'c1', name: 'Ubi', stems }) as unknown as CompositeTrack;

describe('formatOffsetLabel', () => {
  it('always shows a sign, with a true minus sign for negatives', () => {
    assert.equal(formatOffsetLabel(0), '+0 ms');
    assert.equal(formatOffsetLabel(250), '+250 ms');
    assert.equal(formatOffsetLabel(-100), '−100 ms');
  });
});

describe('stepOffsetMs', () => {
  it('adds the step and stops at the limit either way', () => {
    assert.equal(stepOffsetMs(0, -100), -100);
    assert.equal(stepOffsetMs(MAX_STEM_OFFSET_MS - 5, 100), MAX_STEM_OFFSET_MS);
    assert.equal(
      stepOffsetMs(-MAX_STEM_OFFSET_MS + 5, -100),
      -MAX_STEM_OFFSET_MS,
    );
  });
});

describe('resolveStemOptionsModel', () => {
  const three = composite([
    stem('a'),
    stem('b', { offsetMs: -100, mine: true }),
    stem('c'),
  ]);

  it('is null for a stem that is not in the composite', () => {
    assert.equal(
      resolveStemOptionsModel({ composite: three, stemId: 'zzz' }),
      null,
    );
  });

  it('describes the stem, its track and its offset', () => {
    const model = resolveStemOptionsModel({
      composite: three,
      stemId: 'b',
      track: { name: 'Ubi caritas · Tenor', durationMs: 199_000 },
    });

    assert.equal(model?.title, 'b');
    assert.equal(model?.subtitle, 'Ubi caritas · Tenor · 3:19');
    assert.equal(model?.mine, true);
    assert.equal(model?.offsetLabel, '−100 ms');
    assert.deepEqual(
      model?.steps.map((step) => step.label),
      ['−100', '−10', '+10', '+100'],
    );
  });

  it('leaves the subtitle to what is known when the track is gone', () => {
    const model = resolveStemOptionsModel({ composite: three, stemId: 'a' });

    assert.equal(model?.subtitle, '');
  });

  it('disables a step that is at the limit', () => {
    const atLimit = composite([
      stem('a', { offsetMs: MAX_STEM_OFFSET_MS }),
      stem('b'),
    ]);
    const steps =
      resolveStemOptionsModel({ composite: atLimit, stemId: 'a' })?.steps ?? [];

    assert.deepEqual(
      steps.map((step) => step.disabled),
      [false, false, true, true],
    );
  });

  it('asks to delete the composite only when removing would leave one stem', () => {
    const two = composite([stem('a'), stem('b')]);

    assert.equal(
      resolveStemOptionsModel({ composite: two, stemId: 'a' })
        ?.removeAsksToDelete,
      true,
    );
    assert.equal(
      resolveStemOptionsModel({ composite: three, stemId: 'a' })
        ?.removeAsksToDelete,
      false,
    );
  });
});
