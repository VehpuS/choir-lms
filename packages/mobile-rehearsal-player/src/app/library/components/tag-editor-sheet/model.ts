import { normalizeLibraryEntityTags } from '@org/audio-library-models';
import type { RehearsalLibraryTagUsage } from '@org/audio-library-runtime';

import { normalizeSearchQuery } from '../../search/utils/saved-library-search-view-model';

export const parseLibraryTagInput = (value: string) => {
  return normalizeLibraryEntityTags(value.split(','));
};

export const addLibraryEntityTag = (tags: string[], inputValue: string) => {
  return normalizeLibraryEntityTags([
    ...tags,
    ...parseLibraryTagInput(inputValue),
  ]);
};

export const removeLibraryEntityTag = (tags: string[], tagToRemove: string) => {
  return tags.filter((tag) => {
    return tag !== tagToRemove;
  });
};

export const TAG_EDITOR_SUGGESTION_CAP = 12;

export const getActiveTagEditorInputSegment = (tagInput: string) => {
  const segments = tagInput.split(',');

  return segments[segments.length - 1]?.trim() ?? '';
};

export const resolveTagEditorSuggestions = (
  availableTagUsage: RehearsalLibraryTagUsage[],
  currentTags: string[],
  activeSegment: string,
): string[] => {
  const normalizedCurrentTags = new Set(
    currentTags.map((tag) => tag.toLocaleLowerCase()),
  );
  const normalizedSegment = normalizeSearchQuery(activeSegment);

  return availableTagUsage
    .filter((usage) => {
      const normalizedTag = usage.tag.toLocaleLowerCase();

      if (normalizedCurrentTags.has(normalizedTag)) {
        return false;
      }

      if (!normalizedSegment) {
        return true;
      }

      return (
        normalizedTag.includes(normalizedSegment) &&
        normalizedTag !== normalizedSegment
      );
    })
    .slice(0, TAG_EDITOR_SUGGESTION_CAP)
    .map((usage) => usage.tag);
};

export const removeTagEditorInputActiveSegment = (tagInput: string) => {
  const lastCommaIndex = tagInput.lastIndexOf(',');

  if (lastCommaIndex === -1) {
    return '';
  }

  return tagInput.slice(0, lastCommaIndex);
};
