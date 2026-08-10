export const shouldShowSavedLoopBrowseContent = (options: {
  isBuilderFocused: boolean;
  isTrackLoopDetailVisible: boolean;
}) => {
  return !options.isBuilderFocused && !options.isTrackLoopDetailVisible;
};
