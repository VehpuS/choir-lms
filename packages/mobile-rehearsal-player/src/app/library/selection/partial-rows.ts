type GetPartialRowIdsOptions = {
  /** Ids of every folder that has at least one selected item beneath it. */
  ancestorIds: ReadonlySet<string>;
  coveredIds: ReadonlySet<string>;
  rowIds: readonly string[];
  selectedIds: ReadonlySet<string>;
};

// A row is partial when it is not selected and not covered by a selected
// folder, yet something beneath it is selected (design Decision 9, "Partial
// folder state"). The state is derived on every render and never stored, so
// deselecting the folder falls back to partial while its inner items remain.
// It is never promoted to selected because every loaded row is: the folder's
// full contents may not be loaded.
export const getPartialRowIds = ({
  ancestorIds,
  coveredIds,
  rowIds,
  selectedIds,
}: GetPartialRowIdsOptions): Set<string> =>
  new Set(
    rowIds.filter(
      (rowId) =>
        ancestorIds.has(rowId) &&
        !selectedIds.has(rowId) &&
        !coveredIds.has(rowId),
    ),
  );

/** Ancestor folder ids of every selected item, from each item's path ids. */
export const collectAncestorIds = (
  selectedPaths: ReadonlyArray<readonly string[] | undefined>,
): Set<string> => new Set(selectedPaths.flatMap((path) => path ?? []));
