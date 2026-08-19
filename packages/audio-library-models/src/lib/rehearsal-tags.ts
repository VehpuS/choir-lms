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

export const resolveTagAddedAt = (
  tags: string[] | undefined,
  priorTagAddedAt: Record<string, string> | undefined,
  fallbackAddedAt: string,
): Record<string, string> | undefined => {
  if (!tags || tags.length === 0) {
    return undefined;
  }

  const nextTagAddedAt: Record<string, string> = {};

  for (const tag of tags) {
    nextTagAddedAt[tag] = priorTagAddedAt?.[tag] ?? fallbackAddedAt;
  }

  return nextTagAddedAt;
};

export const withResolvedTagAddedAt = <
  Entity extends { tags?: string[]; tagAddedAt?: Record<string, string> },
>(
  entity: Entity,
  priorTagAddedAt: Record<string, string> | undefined,
  fallbackAddedAt: string,
): Entity => {
  const tagAddedAt = resolveTagAddedAt(
    entity.tags,
    priorTagAddedAt,
    fallbackAddedAt,
  );
  const nextEntity: Entity = { ...entity };

  if (tagAddedAt) {
    nextEntity.tagAddedAt = tagAddedAt;
  } else {
    delete nextEntity.tagAddedAt;
  }

  return nextEntity;
};
