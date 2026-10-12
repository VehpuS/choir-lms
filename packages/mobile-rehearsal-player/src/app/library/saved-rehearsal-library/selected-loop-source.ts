// The loop builder remembers which saved track it was opened for. If that
// track is removed by any path (the single flow, a bulk removal, deleting its
// last folder link), the remembered id must go too; otherwise saving the same
// Drive track again would reopen the builder on its own. While the library is
// still loading its list is empty, which says nothing about the track.
export const isSelectedLoopSourceStale = (options: {
  isLibraryLoading: boolean;
  savedSourceIds: readonly string[];
  selectedLoopSourceId: string | null;
}): boolean =>
  options.selectedLoopSourceId !== null &&
  !options.isLibraryLoading &&
  !options.savedSourceIds.includes(options.selectedLoopSourceId);
