import { SAVED_PLAYLIST_SORT_FIELD_OPTIONS } from '../../components/saved-rehearsal-library-section/browse-playlist-cards-model';
import { SAVED_SOURCE_SORT_FIELD_OPTIONS } from '../../components/saved-rehearsal-library-section/browse-source-group-model';
import { SortFieldChipRow } from '../../components/sort-field-chip-row';
import { SAVED_LOOP_SORT_FIELD_OPTIONS } from '../../loops/utils/saved-loop-sort-model';
import {
  SAVED_TAGS_LIST_SORT_FIELD_OPTIONS,
  getSavedTagsListSortDirectionToggleLabel,
} from '../../tags/components/saved-tags-list/model';
import { FILES_SORT_OPTIONS } from './library-search-filter-groups';
import type { LibrarySearchFilterPopoverProps } from './library-search-filter-popover-types';

type LibrarySearchSortBlockProps = Pick<
  LibrarySearchFilterPopoverProps,
  | 'filesSortDirection'
  | 'filesSortMode'
  | 'loopsSortState'
  | 'onSelectFilesSortMode'
  | 'onSelectLoopsSortField'
  | 'onSelectPlaylistsSortField'
  | 'onSelectSourcesSortField'
  | 'onSelectTagsSortField'
  | 'onToggleFilesSortDirection'
  | 'onToggleLoopsSortDirection'
  | 'onTogglePlaylistsSortDirection'
  | 'onToggleSourcesSortDirection'
  | 'onToggleTagsSortDirection'
  | 'playlistsSortState'
  | 'selectedView'
  | 'sourcesSortState'
  | 'tagsSortState'
>;

// The active view's sort block — the same kicker, direction toggle, and field
// chips for every view (screens 1c, 1d, 1j).
export const LibrarySearchSortBlock = (props: LibrarySearchSortBlockProps) => {
  switch (props.selectedView) {
    case 'files':
      return (
        <SortFieldChipRow
          direction={props.filesSortDirection}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            props.filesSortDirection,
          )}
          fieldOptions={FILES_SORT_OPTIONS}
          onSelectField={props.onSelectFilesSortMode}
          onToggleDirection={props.onToggleFilesSortDirection}
          selectedField={props.filesSortMode}
        />
      );
    case 'tracks':
      return (
        <SortFieldChipRow
          direction={props.sourcesSortState.direction}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            props.sourcesSortState.direction,
          )}
          fieldOptions={SAVED_SOURCE_SORT_FIELD_OPTIONS}
          onSelectField={props.onSelectSourcesSortField}
          onToggleDirection={props.onToggleSourcesSortDirection}
          selectedField={props.sourcesSortState.field}
        />
      );
    case 'loops':
      return (
        <SortFieldChipRow
          direction={props.loopsSortState.direction}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            props.loopsSortState.direction,
          )}
          fieldOptions={SAVED_LOOP_SORT_FIELD_OPTIONS}
          onSelectField={props.onSelectLoopsSortField}
          onToggleDirection={props.onToggleLoopsSortDirection}
          selectedField={props.loopsSortState.field}
        />
      );
    case 'playlists':
      return (
        <SortFieldChipRow
          direction={props.playlistsSortState.direction}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            props.playlistsSortState.direction,
          )}
          fieldOptions={SAVED_PLAYLIST_SORT_FIELD_OPTIONS}
          onSelectField={props.onSelectPlaylistsSortField}
          onToggleDirection={props.onTogglePlaylistsSortDirection}
          selectedField={props.playlistsSortState.field}
        />
      );
    case 'tags':
      return (
        <SortFieldChipRow
          direction={props.tagsSortState.direction}
          directionToggleAccessibilityLabel={getSavedTagsListSortDirectionToggleLabel(
            props.tagsSortState.direction,
          )}
          fieldOptions={SAVED_TAGS_LIST_SORT_FIELD_OPTIONS}
          onSelectField={props.onSelectTagsSortField}
          onToggleDirection={props.onToggleTagsSortDirection}
          selectedField={props.tagsSortState.field}
        />
      );
    default:
      return null;
  }
};
