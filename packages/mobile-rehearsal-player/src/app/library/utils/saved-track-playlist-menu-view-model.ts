import type { DriveLibrarySource } from './drive-library-view-model';
import { getSourceMetadataLabels } from './drive-library-view-model';

export type SavedTrackPlaylistMenuStep =
  | 'hidden'
  | 'menu'
  | 'selector'
  | 'create';

export type SavedTrackPlaylistMenuState = {
  draftName: string;
  selectedSourceId: string | null;
  step: SavedTrackPlaylistMenuStep;
};

export type SavedTrackPlaylistMenuAction =
  | {
      type: 'open';
      sourceId: string;
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

export const getSavedTrackPlaylistMenuInitialState = (): SavedTrackPlaylistMenuState => {
  return {
    draftName: '',
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
        selectedSourceId: action.sourceId,
        step: 'menu',
      };
    }

    case 'close': {
      return getSavedTrackPlaylistMenuInitialState();
    }

    case 'open-selector': {
      if (!state.selectedSourceId) {
        return getSavedTrackPlaylistMenuInitialState();
      }

      return {
        ...state,
        draftName: '',
        step: 'selector',
      };
    }

    case 'open-create': {
      if (!state.selectedSourceId) {
        return state;
      }

      return {
        ...state,
        draftName: '',
        step: 'create',
      };
    }

    case 'cancel-create': {
      if (!state.selectedSourceId) {
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