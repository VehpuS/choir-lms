import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCompositeDraft,
  CREATE_SHEET_COPY,
  getDefaultCompositeName,
  resolveCreateSheetModel,
  type CreateSheetInput,
  type CreateSheetTrack,
} from './create-sheet-model';

const MINUTE = 60_000;
const LENGTH = 3 * MINUTE + 25_000;

const track = (name: string, durationMs?: number): CreateSheetTrack => ({
  id: name,
  name,
  durationMs,
});

const input = (
  tracks: CreateSheetTrack[],
  overrides: Partial<CreateSheetInput> = {},
): CreateSheetInput => ({
  tracks,
  compositeName: null,
  stemNames: {},
  fit: 'fits',
  ...overrides,
});

const SATB = [
  track('Ubi caritas · Soprano', LENGTH),
  track('Ubi caritas · Alto', LENGTH),
  track('Ubi caritas · Tenor', LENGTH),
  track('Ubi caritas · Bass', LENGTH),
];

describe('getDefaultCompositeName', () => {
  it('is the lead the track names share, without its separator', () => {
    assert.equal(
      getDefaultCompositeName(SATB.map((t) => t.name)),
      'Ubi caritas',
    );
  });

  it('falls back to a plain name when the names share nothing useful', () => {
    assert.equal(
      getDefaultCompositeName(['Locus iste', 'Ave verum']),
      'New composite',
    );
    assert.equal(getDefaultCompositeName(['A', 'AB']), 'New composite');
  });
});

describe('resolveCreateSheetModel rows', () => {
  it('names each stem from its track and lists its length', () => {
    const model = resolveCreateSheetModel(input(SATB));

    assert.deepEqual(
      model.rows.map((row) => row.stemName),
      ['Soprano', 'Alto', 'Tenor', 'Bass'],
    );
    assert.equal(model.rows[0].meta, '3:25');
    assert.equal(model.compositeName, 'Ubi caritas');
  });

  it('says a name was taken from the track when no section is named', () => {
    const model = resolveCreateSheetModel(
      input([track('Ubi caritas · piano guide', LENGTH), SATB[0]]),
    );

    assert.equal(model.rows[0].stemName, 'Ubi caritas · piano guide');
    assert.match(model.rows[0].meta, /named from the track/);
    assert.doesNotMatch(model.rows[1].meta, /named from the track/);
  });

  it('uses a typed stem name and drops the note about where it came from', () => {
    const model = resolveCreateSheetModel(
      input([track('piano guide', LENGTH), SATB[0]], {
        stemNames: { 'piano guide': 'Piano' },
      }),
    );

    assert.equal(model.rows[0].stemName, 'Piano');
    assert.doesNotMatch(model.rows[0].meta, /named from the track/);
  });

  it('uses a typed composite name', () => {
    assert.equal(
      resolveCreateSheetModel(input(SATB, { compositeName: 'Evening set' }))
        .compositeName,
      'Evening set',
    );
  });
});

describe('resolveCreateSheetModel lengths', () => {
  it('warns about a shorter stem, saying it is padded', () => {
    const model = resolveCreateSheetModel(
      input([SATB[0], SATB[1], track('Ubi caritas · Tenor', LENGTH - 6000)]),
    );

    assert.match(model.rows[2].meta, /6 s short, padded/);
    assert.match(model.lengthWarning ?? '', /^Tenor is shorter/);
    assert.match(model.lengthWarning ?? '', /padded with silence/);
    assert.match(model.lengthWarning ?? '', /offset/);
  });

  it('counts several shorter stems instead of naming them', () => {
    const model = resolveCreateSheetModel(
      input([
        SATB[0],
        track('Ubi caritas · Alto', LENGTH - 5000),
        track('Ubi caritas · Tenor', LENGTH - 9000),
      ]),
    );

    assert.match(model.lengthWarning ?? '', /^2 stems are shorter/);
  });

  it('does not warn within the one-second tolerance', () => {
    const model = resolveCreateSheetModel(
      input([SATB[0], track('Ubi caritas · Alto', LENGTH - 900)]),
    );

    assert.equal(model.lengthWarning, null);
    assert.doesNotMatch(model.rows[1].meta, /short/);
  });

  it('waits for a length that is not known yet, and Create waits with it', () => {
    const model = resolveCreateSheetModel(
      input([SATB[0], track('Ubi caritas · Alto')]),
    );

    assert.equal(model.waitingNote, CREATE_SHEET_COPY.waitingNote);
    assert.equal(model.canCreate, false);
    assert.equal(model.lengthWarning, null);
  });
});

describe('resolveCreateSheetModel room and notes', () => {
  it('can create when the stems fit or the browser cannot say', () => {
    assert.equal(resolveCreateSheetModel(input(SATB)).canCreate, true);
    assert.equal(
      resolveCreateSheetModel(input(SATB, { fit: 'unknown' })).canCreate,
      true,
    );
  });

  it('cannot create when there is no room, and says why without counts', () => {
    const model = resolveCreateSheetModel(input(SATB, { fit: 'does-not-fit' }));

    assert.equal(model.canCreate, false);
    assert.equal(model.room.kind, 'no-room');
  });

  it('always carries the first-play note and never mentions memory', () => {
    const model = resolveCreateSheetModel(input(SATB));

    assert.equal(model.firstPlayNote, CREATE_SHEET_COPY.firstPlayNote);
    assert.doesNotMatch(JSON.stringify(model), /memory/i);
  });
});

describe('buildCompositeDraft', () => {
  it('saves the names in selection order', () => {
    const draft = buildCompositeDraft(
      input(SATB, { stemNames: { 'Ubi caritas · Tenor': '  Tenor   1 ' } }),
    );

    assert.equal(draft.name, 'Ubi caritas');
    assert.deepEqual(draft.stems, [
      { trackId: 'Ubi caritas · Soprano', name: 'Soprano' },
      { trackId: 'Ubi caritas · Alto', name: 'Alto' },
      { trackId: 'Ubi caritas · Tenor', name: 'Tenor 1' },
      { trackId: 'Ubi caritas · Bass', name: 'Bass' },
    ]);
  });

  it('falls back to the guess when a name was emptied', () => {
    const draft = buildCompositeDraft(
      input(SATB, {
        compositeName: '   ',
        stemNames: { 'Ubi caritas · Alto': '' },
      }),
    );

    assert.equal(draft.name, 'Ubi caritas');
    assert.equal(draft.stems[1].name, 'Alto');
  });
});
