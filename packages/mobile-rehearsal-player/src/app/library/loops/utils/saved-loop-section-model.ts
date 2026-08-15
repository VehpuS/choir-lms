export const shouldShowSavedLoopBrowseContent = (options: {
  isBrowseListSuppressed: boolean;
  isBuilderFocused: boolean;
  isTrackLoopDetailVisible: boolean;
}) => {
  return (
    !options.isBuilderFocused &&
    !options.isTrackLoopDetailVisible &&
    !options.isBrowseListSuppressed
  );
};
