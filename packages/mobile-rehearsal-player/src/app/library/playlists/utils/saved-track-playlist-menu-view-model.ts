import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { getSourceMetadataLabels } from '../../drive/utils/drive-library-view-model';

export type SavedTrackPlaylistMenuStep = 'hidden' | 'selector' | 'create';

export type SavedTrackPlaylistMenuState = {
  draftName: string;
  selectedLoopId: string | null;
  selectedSourceId: string | null;
  step: SavedTrackPlaylistMenuStep;
};

export type SavedTrackPlaylistMenuAction =
  | {
      type: 'open';
      sourceId: string;
    }
  | {
      type: 'open-loop-selector';
      loopId: string;
    }
  | {
      type: 'close';
    }
  | {
      type: 'open-selector';
    }
  | {
      type: 'open-create';
    }
  | {
      type: 'cancel-create';
    }
  | {
      type: 'update-draft';
      value: string;
    };

export type SavedTrackContextMenuCopy = {
  detailLabel: string;
  locationLabel: string;
  title: string;
};

export const getSavedTrackPlaylistMenuInitialState =
  (): SavedTrackPlaylistMenuState => {
    return {
      draftName: '',
      selectedLoopId: null,
      selectedSourceId: null,
      step: 'hidden',
    };
  };

export const reduceSavedTrackPlaylistMenuState = (
  state: SavedTrackPlaylistMenuState,
  action: SavedTrackPlaylistMenuAction,
): SavedTrackPlaylistMenuState => {
  switch (action.type) {
    case 'open': {
      return {
        draftName: '',
        selectedLoopId: null,
        selectedSourceId: action.sourceId,
        step: 'selector',
      };
    }

    case 'open-loop-selector': {
      return {
        draftName: '',
        selectedLoopId: action.loopId,
        selectedSourceId: null,
        step: 'selector',
      };
    }

    case 'close': {
      return getSavedTrackPlaylistMenuInitialState();
    }

    case 'open-selector': {
      if (!state.selectedSourceId && !state.selectedLoopId) {
        return getSavedTrackPlaylistMenuInitialState();
      }

      return {
        ...state,
        draftName: '',
        step: 'selector',
      };
    }

    case 'open-create': {
      if (!state.selectedSourceId && !state.selectedLoopId) {
        return state;
      }

      return {
        ...state,
        draftName: '',
        step: 'create',
      };
    }

    case 'cancel-create': {
      if (!state.selectedSourceId && !state.selectedLoopId) {
        return getSavedTrackPlaylistMenuInitialState();
      }

      return {
        ...state,
        draftName: '',
        step: 'selector',
      };
    }

    case 'update-draft': {
      if (state.step !== 'create') {
        return state;
      }

      return {
        ...state,
        draftName: action.value,
      };
    }
  }
};

export const getSavedTrackContextMenuCopy = (
  source: DriveLibrarySource,
): SavedTrackContextMenuCopy => {
  const detailMetadata = getSourceMetadataLabels(source).filter((label) => {
    return label !== source.locationLabel;
  });

  return {
    detailLabel: ['Saved track', ...detailMetadata.slice(0, 2)].join(' • '),
    locationLabel: source.locationLabel ?? 'Drive location unavailable',
    title: source.name,
  };
};
