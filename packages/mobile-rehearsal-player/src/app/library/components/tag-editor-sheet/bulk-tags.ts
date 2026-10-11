import { normalizeLibraryEntityTags } from '@org/audio-library-models';

// The pure rules of the bulk tag editor (task 9.9). The sheet edits one draft
// list of tags; tags that only some selected items carry (mixed) stay in the
// list untouched unless the user adds them (which gives every item the tag) or
// removes them (which clears it from every item).

export type BulkTagTarget = {
  id: string;
  kind: 'folder' | 'loop' | 'playlist' | 'track';
};

export type BulkTagBaseline = {
  /** Tags on some but not all of the selected items, in first-seen order. */
  mixedTags: string[];
  /** Tags on every selected item, in first-seen order. */
  sharedTags: string[];
};

const toKey = (tag: string) => tag.toLocaleLowerCase();

/**
 * Splits the tags of the selected items into shared (on all) and mixed (on
 * some). Tags compare case-insensitively, as the tag store does.
 */
export const getBulkTagBaseline = (
  targetTags: readonly (readonly string[] | undefined)[],
): BulkTagBaseline => {
  const normalized = targetTags.map((tags) =>
    normalizeLibraryEntityTags([...(tags ?? [])]),
  );
  const tagByKey = new Map<string, string>();

  for (const tags of normalized) {
    for (const tag of tags) {
      if (!tagByKey.has(toKey(tag))) {
        tagByKey.set(toKey(tag), tag);
      }
    }
  }

  const sharedTags: string[] = [];
  const mixedTags: string[] = [];

  for (const [key, tag] of tagByKey) {
    const isOnEveryItem =
      normalized.length > 0 &&
      normalized.every((tags) =>
        tags.some((existing) => toKey(existing) === key),
      );

    (isOnEveryItem ? sharedTags : mixedTags).push(tag);
  }

  return { mixedTags, sharedTags };
};

export type BulkTagChange = {
  add: string[];
  remove: string[];
};

/**
 * What to write for the final draft. `draftTags` is everything left in the
 * editor, and `untouchedMixedTags` the part of it still marked mixed. A tag
 * that was on some item and is gone from the draft is removed everywhere; a
 * draft tag that is not an untouched mixed tag is added to every item.
 */
export const computeBulkTagChange = (options: {
  baseline: BulkTagBaseline;
  draftTags: readonly string[];
  untouchedMixedTags: readonly string[];
}): BulkTagChange => {
  const draftKeys = new Set(options.draftTags.map(toKey));
  const mixedKeys = new Set(options.untouchedMixedTags.map(toKey));
  const sharedKeys = new Set(options.baseline.sharedTags.map(toKey));
  const remove = [
    ...options.baseline.sharedTags,
    ...options.baseline.mixedTags,
  ].filter((tag) => !draftKeys.has(toKey(tag)));
  const add = options.draftTags.filter(
    (tag) => !mixedKeys.has(toKey(tag)) && !sharedKeys.has(toKey(tag)),
  );

  return { add, remove };
};

/** Adding a tag that was mixed makes it shared: it leaves the mixed set. */
export const dropFromMixed = (
  mixedTags: readonly string[],
  addedTags: readonly string[],
): string[] => {
  const addedKeys = new Set(addedTags.map(toKey));

  return mixedTags.filter((tag) => !addedKeys.has(toKey(tag)));
};

export const isBulkTagChangeEmpty = (change: BulkTagChange) =>
  change.add.length === 0 && change.remove.length === 0;

const countTags = (count: number) => `${count} ${count === 1 ? 'tag' : 'tags'}`;

export const getBulkTagAcknowledgment = (options: {
  change: BulkTagChange;
  targetCount: number;
}) => {
  const parts = [
    options.change.add.length > 0
      ? `added ${countTags(options.change.add.length)}`
      : null,
    options.change.remove.length > 0
      ? `removed ${countTags(options.change.remove.length)}`
      : null,
  ].filter((part): part is string => part !== null);
  const summary = parts.join(' and ');

  return {
    message: `${summary.charAt(0).toUpperCase()}${summary.slice(1)} on ${options.targetCount} ${options.targetCount === 1 ? 'item' : 'items'}.`,
    title: 'Tags updated',
  };
};
