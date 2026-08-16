export const resolveIsViewSwitcherLocked = (options: {
  isDetailViewOpen: boolean;
  isFilesPlaylistRenameOpen: boolean;
  isLoopBuilderOpen: boolean;
  isPlaylistCardRenameOpen: boolean;
  isPlaylistCreateDialogOpen: boolean;
  isPlaylistDetailRenameOpen: boolean;
  isTagEditorOpen: boolean;
}): boolean => {
  return (
    options.isDetailViewOpen ||
    options.isFilesPlaylistRenameOpen ||
    options.isLoopBuilderOpen ||
    options.isPlaylistCardRenameOpen ||
    options.isPlaylistCreateDialogOpen ||
    options.isPlaylistDetailRenameOpen ||
    options.isTagEditorOpen
  );
};
