import { normalizeLibraryEntityTags } from '@org/audio-library-models';

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
