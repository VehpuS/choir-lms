import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkStemLengths,
  clampStemVolume,
  getCompositeDurationMs,
  getStemEndMs,
  getStemPaddingMs,
  getStemTrimMs,
  guessStemName,
  isStemNameGuessedFromSection,
  parseCompositeTrack,
} from './composite-track.ts';

const stemRecord = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  trackId: `track-${id}`,
  name: id,
  offsetMs: 0,
  mine: false,
  ...extra,
});

const compositeRecord = (extra: Record<string, unknown> = {}) => ({
  id: 'c1',
  name: 'Ubi caritas',
  stems: [stemRecord('a'), stemRecord('b')],
  createdAt: '2026-11-07T00:00:00.000Z',
  ...extra,
});

describe('guessStemName', () => {
  it('uses the section label when the name names one section', () => {
    assert.equal(guessStemName('Ubi caritas · Soprano'), 'Soprano');
    assert.equal(guessStemName('Tenor 2'), 'Tenor');
  });

  it('keeps the track name when it names no section', () => {
    assert.equal(
      guessStemName('Ubi caritas · piano guide'),
      'Ubi caritas · piano guide',
    );
    assert.equal(isStemNameGuessedFromSection('piano guide'), false);
  });

  it('keeps the track name when it names several sections', () => {
    assert.equal(guessStemName('Alto and Tenor'), 'Alto and Tenor');
    assert.equal(isStemNameGuessedFromSection('Alto and Tenor'), false);
  });

  it('reports a guess from a section', () => {
    assert.equal(isStemNameGuessedFromSection('Bass'), true);
  });
});

describe('stem timing', () => {
  it('ends a stem at its offset plus duration', () => {
    assert.equal(getStemEndMs({ offsetMs: 250, durationMs: 10_000 }), 10_250);
    assert.equal(getStemEndMs({ offsetMs: -100, durationMs: 10_000 }), 9_900);
    assert.equal(
      getStemEndMs({ offsetMs: 0, durationMs: undefined }),
      undefined,
    );
  });

  it('makes the composite as long as the longest stem counting offsets', () => {
    assert.equal(
      getCompositeDurationMs([
        { offsetMs: 0, durationMs: 10_000 },
        { offsetMs: 0, durationMs: 4_000 },
        { offsetMs: 250, durationMs: 10_000 },
      ]),
      10_250,
    );
  });

  it('waits while any duration is unknown', () => {
    assert.equal(
      getCompositeDurationMs([
        { offsetMs: 0, durationMs: 10_000 },
        { offsetMs: 0, durationMs: undefined },
      ]),
      undefined,
    );
  });

  it('trims a negative offset and pads a positive one', () => {
    assert.equal(getStemTrimMs(-100), 100);
    assert.equal(getStemTrimMs(250), 0);
    assert.equal(getStemPaddingMs(250), 250);
    assert.equal(getStemPaddingMs(-100), 0);
  });
});

describe('checkStemLengths', () => {
  it('matches when lengths are within one second', () => {
    const check = checkStemLengths([205_000, 205_800, 204_900]);

    assert.equal(check.matches, true);
    assert.equal(check.differs, false);
  });

  it('differs when a stem is six seconds shorter', () => {
    const check = checkStemLengths([205_000, 199_000, 205_000]);

    assert.equal(check.differs, true);
    assert.equal(check.shorterCount, 1);
    assert.equal(check.spreadMs, 6_000);
  });

  it('waits when a duration is unknown', () => {
    const check = checkStemLengths([205_000, undefined]);

    assert.equal(check.waiting, true);
    assert.equal(check.matches, false);
    assert.equal(check.differs, false);
  });
});

describe('clampStemVolume', () => {
  it('keeps volume within 0 to 150', () => {
    assert.equal(clampStemVolume(-5), 0);
    assert.equal(clampStemVolume(200), 150);
    assert.equal(clampStemVolume(Number.NaN), 100);
  });
});

describe('parseCompositeTrack', () => {
  it('reads a valid record', () => {
    const parsed = parseCompositeTrack(
      compositeRecord({
        stems: [
          stemRecord('a', { offsetMs: 250.4, mine: true }),
          stemRecord('b'),
        ],
        defaultMix: { levels: { a: { volume: 180, muted: true } } },
        lyricsStemId: 'b',
      }),
    );

    assert.ok(parsed);
    assert.equal(parsed.stems[0].offsetMs, 250);
    assert.equal(parsed.stems[0].mine, true);
    assert.deepEqual(parsed.defaultMix.levels.a, {
      volume: 150,
      muted: true,
      soloed: false,
    });
    assert.equal(parsed.lyricsStemId, 'b');
  });

  it('rejects a record with fewer than two usable stems', () => {
    assert.equal(
      parseCompositeTrack(
        compositeRecord({ stems: [stemRecord('a'), { id: 'x' }] }),
      ),
      null,
    );
  });

  it('drops duplicate stems and malformed presets', () => {
    const parsed = parseCompositeTrack(
      compositeRecord({
        stems: [stemRecord('a'), stemRecord('a'), stemRecord('b')],
        presets: [
          { id: 'p1', name: 'Loud', mix: { levels: {} } },
          { id: 'p2' },
        ],
      }),
    );

    assert.ok(parsed);
    assert.equal(parsed.stems.length, 2);
    assert.deepEqual(
      parsed.presets.map((preset) => preset.id),
      ['p1'],
    );
  });

  it('forgets a lyrics pick that names no stem', () => {
    const parsed = parseCompositeTrack(
      compositeRecord({ lyricsStemId: 'zzz' }),
    );

    assert.equal(parsed?.lyricsStemId, undefined);
  });

  it('returns null for non-objects and nameless records', () => {
    assert.equal(parseCompositeTrack(null), null);
    assert.equal(parseCompositeTrack(compositeRecord({ name: '' })), null);
  });
});
