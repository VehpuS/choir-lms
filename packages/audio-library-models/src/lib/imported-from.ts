/**
 * Where an imported entity came from (library-share-import spec). Set on the
 * folder an import creates and on every entity it creates; never on a source
 * that an import reused.
 */
export type ImportedFrom = {
  author: string;
  bundleName: string;
  importedAt: string;
};

/** Reads a stored `importedFrom`; anything malformed is dropped. */
export const parseImportedFrom = (value: unknown): ImportedFrom | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const { author, bundleName, importedAt } = value as Record<string, unknown>;

  return typeof author === 'string' &&
    typeof bundleName === 'string' &&
    typeof importedAt === 'string'
    ? { author, bundleName, importedAt }
    : undefined;
};
