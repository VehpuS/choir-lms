import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  planMarkerSections,
  type TrackMarker,
} from '@org/audio-library-models';

import {
  NEEDS_DURATION_MESSAGE,
  NO_SECTIONS_MESSAGE,
  SKIP_REASON_LABELS,
  buildCreateLoopsModel,
  formatConfirmLabel,
  resolveSectionsToCreate,
  toggleSection,
} from './model';

const marker = (name: string, positionMs: number): TrackMarker => ({
  id: name,
  name,
  positionMs,
  createdAt: '2026-10-22T00:00:00.000Z',
});

const MARKERS = [
  marker('Verse', 10_000),
  marker('Chorus', 40_000),
  marker('Bridge', 70_000),
];
const DURATION_MS = 100_000;

const plan = (
  existing: { name: string; startMs: number; endMs: number }[] = [],
  includeIntro = false,
  durationMs: number | null = DURATION_MS,
) =>
  planMarkerSections(MARKERS, durationMs ?? undefined, existing, {
    includeIntro,
  });

describe('buildCreateLoopsModel', () => {
  it('lists every section checked with a count to create', () => {
    const model = buildCreateLoopsModel(plan(), {});

    assert.deepEqual(
      model.rows.map(({ name, isChecked, canCheck }) => [
        name,
        isChecked,
        canCheck,
      ]),
      [
        ['Verse', true, true],
        ['Chorus', true, true],
        ['Bridge', true, true],
      ],
    );
    assert.equal(model.confirmLabel, 'Create 3 loops');
    assert.equal(model.canConfirm, true);
    assert.equal(model.rows[0]?.rangeLabel, '0:10.0 – 0:40.0');
  });

  it('adds an Intro section when asked', () => {
    const model = buildCreateLoopsModel(plan([], true), {});

    assert.equal(model.rows[0]?.name, 'Intro');
    assert.equal(model.rows[0]?.rangeLabel, '0:00.0 – 0:10.0');
    assert.equal(model.confirmLabel, 'Create 4 loops');
  });

  it('shows a section that is already a loop unchecked with the reason', () => {
    const model = buildCreateLoopsModel(
      plan([{ name: 'Old', startMs: 10_000, endMs: 40_000 }]),
      {},
    );
    const verse = model.rows[0];

    assert.equal(verse?.isChecked, false);
    assert.equal(verse?.canCheck, false);
    assert.equal(verse?.skipLabel, SKIP_REASON_LABELS['existing-loop']);
    assert.equal(model.confirmLabel, 'Create 2 loops');
  });

  it('flags a name that is already used', () => {
    const model = buildCreateLoopsModel(
      plan([{ name: 'chorus', startMs: 1, endMs: 2_000 }]),
      {},
    );

    assert.equal(
      model.rows[1]?.skipLabel,
      SKIP_REASON_LABELS['duplicate-name'],
    );
    assert.equal(model.rows[1]?.isChecked, false);
  });

  it('flags a section that runs past the end of a short track', () => {
    const model = buildCreateLoopsModel(plan([], false, 50_000), {});

    assert.equal(model.rows[1]?.skipLabel, SKIP_REASON_LABELS['past-end']);
  });

  it('uses the singular for one loop and disables confirm for none', () => {
    assert.equal(formatConfirmLabel(1), 'Create 1 loop');
    assert.equal(formatConfirmLabel(0), 'Create loops');

    const none = buildCreateLoopsModel(plan(), {
      Verse: false,
      Chorus: false,
      Bridge: false,
    });

    assert.equal(none.checkedCount, 0);
    assert.equal(none.canConfirm, false);
    assert.equal(none.confirmLabel, 'Create loops');
  });

  it('says so when the last marker has no section for want of a length', () => {
    const model = buildCreateLoopsModel(plan([], false, null), {});

    assert.deepEqual(
      model.rows.map(({ name }) => name),
      ['Verse', 'Chorus'],
    );
    assert.equal(model.note, NEEDS_DURATION_MESSAGE);
  });

  it('explains an empty plan', () => {
    const model = buildCreateLoopsModel(
      planMarkerSections([], DURATION_MS, [], { includeIntro: false }),
      {},
    );

    assert.equal(model.emptyMessage, NO_SECTIONS_MESSAGE);
    assert.equal(model.canConfirm, false);
  });
});

describe('toggleSection and resolveSectionsToCreate', () => {
  it('unchecks and rechecks a section', () => {
    const sections = plan();
    const [verse] = sections.sections;

    assert.ok(verse);

    const unchecked = toggleSection({}, verse);

    assert.deepEqual(
      resolveSectionsToCreate(sections, unchecked).map(({ name }) => name),
      ['Chorus', 'Bridge'],
    );
    assert.deepEqual(
      resolveSectionsToCreate(sections, toggleSection(unchecked, verse)).map(
        ({ name }) => name,
      ),
      ['Verse', 'Chorus', 'Bridge'],
    );
  });

  it('never checks a skipped section', () => {
    const sections = plan([{ name: 'Old', startMs: 10_000, endMs: 40_000 }]);
    const [verse] = sections.sections;

    assert.ok(verse);
    assert.deepEqual(toggleSection({}, verse), {});
    assert.equal(
      resolveSectionsToCreate(sections, { [verse.key]: true }).some(
        ({ key }) => key === verse.key,
      ),
      false,
    );
  });

  it('keeps choices across switching the intro on', () => {
    const overrides = { Chorus: false };
    const withIntro = plan([], true);

    assert.deepEqual(
      resolveSectionsToCreate(withIntro, overrides).map(({ name }) => name),
      ['Intro', 'Verse', 'Bridge'],
    );
  });
});
