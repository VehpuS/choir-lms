import {
  createCompositeTrack,
  relinkCompositeStem,
  removeCompositeStem,
  renameComposite,
  saveCompositeMixPreset,
  setCompositeDefaultMix,
  renameCompositeStem,
  setCompositeStemMine,
  setCompositeStemOffset,
  type CompositeDraft,
  type CompositeMix,
  type CompositeTrack,
  type RemoveCompositeStemResult,
} from '@org/audio-library-models';

/** Where composites are kept: the runtime's `composites` collection in production. */
export type CompositeStorage = {
  list: () => Promise<CompositeTrack[]>;
  update: (
    change: (composites: CompositeTrack[]) => CompositeTrack[],
  ) => Promise<CompositeTrack[]>;
};

export type CompositeStoreOptions = {
  storage: CompositeStorage;
  /**
   * Called after a composite is deleted, here or elsewhere (noticed on the
   * next `refresh`), to drop what was prepared for it.
   */
  onDeleted?: (compositeId: string) => void;
  /**
   * Awaited after a new composite is saved and before it is published, so
   * whatever files it (the Files folder) is in place when listeners read it.
   * A failure is ignored: the composite stays where the tree sync put it.
   */
  onCreated?: (
    composite: CompositeTrack,
    placement: { folderId?: string },
  ) => Promise<void>;
};

export type CompositeStore = {
  /** The composites as of the last change, readable synchronously. */
  getSnapshot: () => readonly CompositeTrack[];
  subscribe: (listener: () => void) => () => void;
  refresh: () => Promise<void>;
  /** Null when the draft cannot make a composite (fewer than two distinct tracks). */
  create: (
    draft: CompositeDraft,
    options?: { folderId?: string; partPreferences?: readonly string[] },
  ) => Promise<CompositeTrack | null>;
  rename: (compositeId: string, name: string) => Promise<void>;
  /** Deletes the composite and its presets; the stems' tracks stay in the library. */
  remove: (compositeId: string) => Promise<void>;
  renameStem: (
    compositeId: string,
    stemId: string,
    name: string,
  ) => Promise<void>;
  setStemOffset: (
    compositeId: string,
    stemId: string,
    offsetMs: number,
  ) => Promise<void>;
  setStemMine: (
    compositeId: string,
    stemId: string,
    mine: boolean,
  ) => Promise<void>;
  relinkStem: (
    compositeId: string,
    stemId: string,
    trackId: string,
  ) => Promise<void>;
  /** Saves the mix as a named preset (same name replaces); optionally as the default. */
  saveMixPreset: (
    compositeId: string,
    options: { name: string; mix: CompositeMix; makeDefault?: boolean },
  ) => Promise<void>;
  setDefaultMix: (compositeId: string, mix: CompositeMix) => Promise<void>;
  /** `ask-delete` when one stem would be left: nothing changes and the caller asks. */
  removeStem: (
    compositeId: string,
    stemId: string,
  ) => Promise<RemoveCompositeStemResult['outcome']>;
};

export const createCompositeStore = (
  options: CompositeStoreOptions,
): CompositeStore => {
  const listeners = new Set<() => void>();
  let snapshot: readonly CompositeTrack[] = [];

  const publish = (next: readonly CompositeTrack[]) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  const edit = async (
    compositeId: string,
    change: (composite: CompositeTrack) => CompositeTrack,
  ) => {
    publish(
      await options.storage.update((composites) =>
        composites.map((composite) =>
          composite.id === compositeId ? change(composite) : composite,
        ),
      ),
    );
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    // A composite can also be removed outside this store (deleting its file or
    // folder in Files), so a composite that vanished since the last read has
    // its prepared stems dropped here too.
    refresh: async () => {
      const previousIds = snapshot.map(({ id }) => id);
      const next = await options.storage.list();
      const nextIds = new Set(next.map(({ id }) => id));

      publish(next);
      previousIds
        .filter((id) => !nextIds.has(id))
        .forEach((id) => options.onDeleted?.(id));
    },
    create: async (draft, createOptions) => {
      const composite = createCompositeTrack({
        draft,
        partPreferences: createOptions?.partPreferences,
      });

      if (!composite) {
        return null;
      }

      const next = await options.storage.update((composites) => [
        ...composites,
        composite,
      ]);

      await options
        .onCreated?.(composite, { folderId: createOptions?.folderId })
        .catch(() => undefined);
      publish(next);

      return composite;
    },
    rename: (compositeId, name) =>
      edit(compositeId, (composite) => renameComposite(composite, name)),
    remove: async (compositeId) => {
      publish(
        await options.storage.update((composites) =>
          composites.filter((composite) => composite.id !== compositeId),
        ),
      );
      options.onDeleted?.(compositeId);
    },
    renameStem: (compositeId, stemId, name) =>
      edit(compositeId, (composite) =>
        renameCompositeStem(composite, stemId, name),
      ),
    setStemOffset: (compositeId, stemId, offsetMs) =>
      edit(compositeId, (composite) =>
        setCompositeStemOffset(composite, stemId, offsetMs),
      ),
    setStemMine: (compositeId, stemId, mine) =>
      edit(compositeId, (composite) =>
        setCompositeStemMine(composite, stemId, mine),
      ),
    relinkStem: (compositeId, stemId, trackId) =>
      edit(compositeId, (composite) =>
        relinkCompositeStem(composite, stemId, trackId),
      ),
    saveMixPreset: (compositeId, preset) =>
      edit(compositeId, (composite) =>
        saveCompositeMixPreset(composite, preset),
      ),
    setDefaultMix: (compositeId, mix) =>
      edit(compositeId, (composite) => setCompositeDefaultMix(composite, mix)),
    removeStem: async (compositeId, stemId) => {
      let outcome: RemoveCompositeStemResult['outcome'] = 'unchanged';

      await edit(compositeId, (composite) => {
        const result = removeCompositeStem(composite, stemId);

        outcome = result.outcome;

        return result.outcome === 'removed' ? result.composite : composite;
      });

      return outcome;
    },
  };
};
