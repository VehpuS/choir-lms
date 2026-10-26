import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planMarkerSections } from './marker-sections.ts';

const marker = (id: string, positionMs: number, name = id) => ({
  id,
  name,
  positionMs,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const NO_INTRO = { includeIntro: false };

describe('planMarkerSections', () => {
  it('returns no sections without markers', () => {
    assert.deepEqual(planMarkerSections([], 10_000, [], NO_INTRO), {
      sections: [],
      lastSectionNeedsDuration: false,
    });
  });

  it('builds sections between consecutive markers, the last to the track end', () => {
    const plan = planMarkerSections(
      [marker('a', 1_000, 'Verse'), marker('b', 4_000, 'Chorus')],
      9_000,
      [],
      NO_INTRO,
    );

    assert.deepEqual(plan.sections, [
      { key: 'a', name: 'Verse', startMs: 1_000, endMs: 4_000 },
      { key: 'b', name: 'Chorus', startMs: 4_000, endMs: 9_000 },
    ]);
  });

  it('omits the last section when the duration is unknown and says so', () => {
    const plan = planMarkerSections(
      [marker('a', 1_000), marker('b', 4_000)],
      undefined,
      [],
      NO_INTRO,
    );

    assert.equal(plan.sections.length, 1);
    assert.equal(plan.lastSectionNeedsDuration, true);
  });

  it('adds an Intro from 0 to the first marker when requested', () => {
    const plan = planMarkerSections([marker('a', 2_000)], 5_000, [], {
      includeIntro: true,
    });

    assert.deepEqual(plan.sections[0], {
      key: 'intro',
      name: 'Intro',
      startMs: 0,
      endMs: 2_000,
    });
  });

  it('flags an Intro as too short when the first marker is at 0', () => {
    const plan = planMarkerSections([marker('a', 0)], 5_000, [], {
      includeIntro: true,
    });

    assert.equal(plan.sections[0]?.skipReason, 'too-short');
  });

  it('flags markers sharing a position as too short', () => {
    const plan = planMarkerSections(
      [marker('a', 1_000), marker('b', 1_000)],
      5_000,
      [],
      NO_INTRO,
    );

    assert.equal(plan.sections[0]?.skipReason, 'too-short');
    assert.equal(plan.sections[1]?.skipReason, undefined);
  });

  it('flags a section identical to an existing loop', () => {
    const plan = planMarkerSections(
      [marker('a', 1_000, 'Verse')],
      3_000,
      [{ name: 'Other name', startMs: 1_000, endMs: 3_000 }],
      NO_INTRO,
    );

    assert.equal(plan.sections[0]?.skipReason, 'existing-loop');
  });

  it('numbers a name already used by a loop or an earlier section', () => {
    const plan = planMarkerSections(
      [
        marker('a', 0, 'Verse'),
        marker('b', 1_000, 'verse'),
        marker('c', 2_000, 'Verse'),
      ],
      3_000,
      [{ name: 'Verse', startMs: 50, endMs: 60 }],
      NO_INTRO,
    );

    assert.deepEqual(
      plan.sections.map((section) => [section.name, section.skipReason]),
      [
        ['Verse (2)', undefined],
        ['verse (3)', undefined],
        ['Verse (4)', undefined],
      ],
    );
  });

  it('does not let a skipped section claim its name', () => {
    const plan = planMarkerSections(
      [marker('a', 0, 'Verse'), marker('b', 1_000, 'Verse')],
      3_000,
      [{ name: 'Other', startMs: 0, endMs: 1_000 }],
      NO_INTRO,
    );

    assert.deepEqual(
      plan.sections.map((section) => [section.name, section.skipReason]),
      [
        ['Verse', 'existing-loop'],
        ['Verse', undefined],
      ],
    );
  });

  it('flags a section that runs past the known end', () => {
    const plan = planMarkerSections(
      [marker('a', 1_000), marker('b', 9_000)],
      5_000,
      [],
      NO_INTRO,
    );

    assert.equal(plan.sections[0]?.skipReason, 'past-end');
  });
});
