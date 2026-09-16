import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';

export type DriveSearchSelectionContext = {
  location: Pick<DriveBrowseLocation, 'id' | 'kind' | 'rootKind'>;
  query: string;
};

export type DriveSearchSelectionState = {
  contextKey: string | null;
  excludedResultIds: string[];
  isActive: boolean;
  isReviewReady: boolean;
  isSelectingAll: boolean;
  selectedResults: DriveDiscoveryResult[];
};

type SynchronizeDriveSearchSelectionOptions = {
  context: DriveSearchSelectionContext | null;
  isComplete: boolean;
  isLoading: boolean;
  results: DriveDiscoveryResult[];
};

export const createDriveSearchSelectionContextKey = (
  context: DriveSearchSelectionContext | null,
) => {
  if (context === null) {
    return null;
  }

  return [
    context.location.rootKind,
    context.location.kind,
    context.location.id,
    context.query.trim().toLocaleLowerCase(),
  ].join(':');
};

export const createDriveSearchSelectionState = (
  context: DriveSearchSelectionContext | null = null,
): DriveSearchSelectionState => ({
  contextKey: createDriveSearchSelectionContextKey(context),
  excludedResultIds: [],
  isActive: false,
  isReviewReady: false,
  isSelectingAll: false,
  selectedResults: [],
});

export const enterDriveSearchSelection = (
  state: DriveSearchSelectionState,
): DriveSearchSelectionState => ({
  ...state,
  isActive: state.contextKey !== null,
  isReviewReady: false,
});

export const cancelDriveSearchSelection = (
  state: DriveSearchSelectionState,
): DriveSearchSelectionState => ({
  ...state,
  excludedResultIds: [],
  isActive: false,
  isReviewReady: false,
  isSelectingAll: false,
  selectedResults: [],
});

export const continueDriveSearchSelection = (
  state: DriveSearchSelectionState,
): DriveSearchSelectionState => ({
  ...state,
  isReviewReady:
    state.isActive && !state.isSelectingAll && state.selectedResults.length > 0,
});

export const toggleDriveSearchSelectionResult = (
  state: DriveSearchSelectionState,
  result: DriveDiscoveryResult,
): DriveSearchSelectionState => {
  if (!state.isActive || state.isReviewReady) {
    return state;
  }

  const isSelected = state.selectedResults.some(({ id }) => id === result.id);
  const excludedResultIds = state.isSelectingAll
    ? isSelected
      ? [...state.excludedResultIds, result.id]
      : state.excludedResultIds.filter((id) => id !== result.id)
    : state.excludedResultIds;

  return {
    ...state,
    excludedResultIds,
    selectedResults: isSelected
      ? state.selectedResults.filter(({ id }) => id !== result.id)
      : [...state.selectedResults, result],
  };
};

export const selectAllDriveSearchResults = (
  state: DriveSearchSelectionState,
  options: Pick<
    SynchronizeDriveSearchSelectionOptions,
    'isLoading' | 'results'
  >,
): DriveSearchSelectionState => {
  if (state.contextKey === null) {
    return state;
  }

  return {
    ...state,
    excludedResultIds: [],
    isActive: true,
    isReviewReady: false,
    isSelectingAll: options.isLoading,
    selectedResults: options.results,
  };
};

export const synchronizeDriveSearchSelection = (
  state: DriveSearchSelectionState,
  options: SynchronizeDriveSearchSelectionOptions,
): DriveSearchSelectionState => {
  const contextKey = createDriveSearchSelectionContextKey(options.context);

  if (contextKey !== state.contextKey) {
    return createDriveSearchSelectionState(options.context);
  }

  if (!state.isSelectingAll) {
    return state;
  }

  if (!options.isLoading && !options.isComplete) {
    return {
      ...state,
      excludedResultIds: [],
      isSelectingAll: false,
      selectedResults: [],
    };
  }

  return {
    ...state,
    isSelectingAll: options.isLoading,
    selectedResults: options.results.filter(
      ({ id }) => !state.excludedResultIds.includes(id),
    ),
  };
};
