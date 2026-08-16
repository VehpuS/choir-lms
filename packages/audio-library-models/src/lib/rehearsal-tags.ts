const MULTI_SPACE_PATTERN = /\s+/g;

const normalizeTagToken = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue.replace(MULTI_SPACE_PATTERN, ' ');
};

export const normalizeLibraryEntityTags = (tags: string[]) => {
  const uniqueTags: string[] = [];
  const seenTags = new Set<string>();

  for (const tag of tags) {
    const normalizedTag = normalizeTagToken(tag);

    if (!normalizedTag) {
      continue;
    }

    const dedupeKey = normalizedTag.toLocaleLowerCase();

    if (seenTags.has(dedupeKey)) {
      continue;
    }

    seenTags.add(dedupeKey);
    uniqueTags.push(normalizedTag);
  }

  return uniqueTags;
};
