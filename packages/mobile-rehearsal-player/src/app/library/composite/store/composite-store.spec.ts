import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeTrack } from '@org/audio-library-models';

import { createCompositeStore, type CompositeStorage } from './composite-store';

const DRAFT = {
  name: 'Ubi caritas',
  stems: [
    { trackId: 't-s', name: 'Soprano' },
    { trackId: 't-a', name: 'Alto' },
    { trackId: 't-b', name: 'Bass' },
  ],
};

const setup = (initial: CompositeTrack[] = []) => {
  let saved = initial;
  const deleted: string[] = [];
  const storage: CompositeStorage = {
    list: async () => saved,
    update: async (change) => {
      saved = change(saved);

      return saved;
    },
  };
  const store = createCompositeStore({
    storage,
    onDeleted: (id) => deleted.push(id),
  });

  return {
    store,
    deleted,
    saved: () => saved,
    setSaved: (next: CompositeTrack[]) => {
      saved = next;
    },
  };
};

const storageRemove = async (
  t: ReturnType<typeof setup>,
  compositeId: string,
) => {
  t.setSaved(t.saved().filter(({ id }) => id !== compositeId));
};

describe('composite store', () => {
  it('drops the prepared stems of a composite removed outside the store, once', async () => {
    const t = setup();
    const composite = await t.store.create(DRAFT);

    assert.ok(composite);

    // Removed behind the store's back, as deleting its file in Files does.
    await storageRemove(t, composite.id);
    await t.store.refresh();
    await t.store.refresh();

    assert.deepEqual(t.deleted, [composite.id]);
    assert.deepEqual(t.store.getSnapshot(), []);
  });

  it('does not report anything deleted on the first read', async () => {
    const composite = await setup().store.create(DRAFT);

    assert.ok(composite);

    const t = setup([composite]);

    await t.store.refresh();

    assert.deepEqual(t.deleted, []);
  });

  it('creates a composite, saves it and tells subscribers', async () => {
    const t = setup();
    let notified = 0;

    t.store.subscribe(() => {
      notified += 1;
    });

    const composite = await t.store.create(DRAFT, {
      partPreferences: ['Bass'],
    });

    assert.equal(composite?.name, 'Ubi caritas');
    assert.equal(composite?.stems.find((s) => s.mine)?.name, 'Bass');
    assert.deepEqual(t.store.getSnapshot(), t.saved());
    assert.equal(notified, 1);
  });

  it('does not create from fewer than two tracks', async () => {
    const t = setup();

    assert.equal(
      await t.store.create({ name: 'x', stems: [DRAFT.stems[0]] }),
      null,
    );
    assert.deepEqual(t.store.getSnapshot(), []);
  });

  it('loads what is saved on refresh', async () => {
    const first = setup();
    const made = await first.store.create(DRAFT);
    const later = setup(made ? [made] : []);

    assert.deepEqual(later.store.getSnapshot(), []);
    await later.store.refresh();
    assert.equal(later.store.getSnapshot().length, 1);
  });

  it('renames the composite and edits its stems', async () => {
    const t = setup();
    const made = await t.store.create(DRAFT);

    assert.ok(made);
    await t.store.rename(made.id, 'Evening set');
    await t.store.renameStem(made.id, 'stem-2', 'Alto 1');
    await t.store.setStemOffset(made.id, 'stem-3', 250);
    await t.store.setStemMine(made.id, 'stem-1', true);
    await t.store.relinkStem(made.id, 'stem-2', 't-new');

    const [saved] = t.saved();

    assert.equal(saved.name, 'Evening set');
    assert.deepEqual(
      saved.stems.map((s) => [s.name, s.offsetMs, s.mine, s.trackId]),
      [
        ['Soprano', 0, true, 't-s'],
        ['Alto 1', 0, false, 't-new'],
        ['Bass', 250, false, 't-b'],
      ],
    );
  });

  it('saves a preset, optionally as the default, and sets the default', async () => {
    const t = setup();
    const made = await t.store.create(DRAFT);
    const mix = {
      levels: { 'stem-1': { volume: 40, muted: false, soloed: false } },
    };

    assert.ok(made);
    await t.store.saveMixPreset(made.id, { name: 'Soft', mix });
    assert.equal(t.saved()[0].presets[0].name, 'Soft');
    assert.deepEqual(t.saved()[0].defaultMix, { levels: {} });

    await t.store.setDefaultMix(made.id, mix);
    assert.equal(t.saved()[0].defaultMix.levels['stem-1'].volume, 40);
  });

  it('keeps sheet music on the composite: add, rename, remove', async () => {
    const t = setup();
    const made = await t.store.create(DRAFT);

    assert.ok(made);
    await t.store.addSheetMusic(made.id, {
      format: 'pdf',
      label: 'Score',
      location: { kind: 'drive', fileId: 'f1', name: 'score.pdf' },
    });

    const [added] = t.saved()[0].sheetMusic ?? [];

    assert.equal(added.label, 'Score');
    await t.store.changeSheetMusic(made.id, added.id, { label: 'Full score' });
    assert.equal(t.saved()[0].sheetMusic?.[0].label, 'Full score');
    await t.store.removeSheetMusic(made.id, added.id);
    assert.equal(t.saved()[0].sheetMusic, undefined);
  });

  it('edits only the composite it was asked about', async () => {
    const t = setup();
    const one = await t.store.create(DRAFT);
    const two = await t.store.create({ ...DRAFT, name: 'Locus iste' });

    assert.ok(one && two);
    await t.store.rename(one.id, 'Changed');

    assert.deepEqual(
      t.saved().map((c) => c.name),
      ['Changed', 'Locus iste'],
    );
  });

  it('removes a stem, and asks instead of leaving a single stem', async () => {
    const t = setup();
    const made = await t.store.create(DRAFT);

    assert.ok(made);
    assert.equal(await t.store.removeStem(made.id, 'stem-2'), 'removed');
    assert.equal(t.saved()[0].stems.length, 2);
    assert.equal(await t.store.removeStem(made.id, 'stem-1'), 'ask-delete');
    assert.equal(t.saved()[0].stems.length, 2);
    assert.equal(await t.store.removeStem(made.id, 'nope'), 'unchanged');
  });

  it('deletes a composite, tells the owner of what was prepared, and keeps the others', async () => {
    const t = setup();
    const one = await t.store.create(DRAFT);
    const two = await t.store.create({ ...DRAFT, name: 'Locus iste' });

    assert.ok(one && two);
    await t.store.remove(one.id);

    assert.deepEqual(
      t.store.getSnapshot().map((c) => c.id),
      [two.id],
    );
    assert.deepEqual(t.deleted, [one.id]);
  });

  it('stops notifying a subscriber that left', async () => {
    const t = setup();
    let notified = 0;
    const unsubscribe = t.store.subscribe(() => {
      notified += 1;
    });

    unsubscribe();
    await t.store.create(DRAFT);

    assert.equal(notified, 0);
  });
});

describe('composite store placement hook', () => {
  it('awaits onCreated before publishing and survives its failure', async () => {
    const order: string[] = [];
    let saved: CompositeTrack[] = [];
    const store = createCompositeStore({
      storage: {
        list: async () => saved,
        update: async (change) => {
          saved = change(saved);

          return saved;
        },
      },
      onCreated: async () => {
        order.push('placed');
        throw new Error('storage unavailable');
      },
    });

    store.subscribe(() => order.push('published'));
    await store.create(DRAFT);

    assert.deepEqual(order, ['placed', 'published']);
    assert.equal(store.getSnapshot().length, 1);
  });
});
