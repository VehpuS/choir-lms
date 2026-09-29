import type {
  SavedPlaylistSortField,
  SavedPlaylistSortState,
} from '../../components/saved-rehearsal-library-section/browse-playlist-cards-model';
import type {
  SavedSourceSortField,
  SavedSourceSortState,
} from '../../components/saved-rehearsal-library-section/browse-source-group-model';
import type {
  SavedLoopSortField,
  SavedLoopSortState,
} from '../../loops/utils/saved-loop-sort-model';
import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';
import type {
  LibraryFilesSearchScope,
  LibraryFilesSortDirection,
  LibraryFilesSortMode,
} from '../../saved-rehearsal-library/library-files-model';
import type {
  SavedTagsListSortField,
  SavedTagsListSortState,
} from '../../tags/components/saved-tags-list/model';
import type {
  LibrarySearchEntityFilter,
  TagFilterMatchMode,
} from '../utils/saved-library-search-view-model';

export type LibrarySearchFilterPopoverProps = {
  availableTagFilters: string[];
  currentFilesFolderName: string | null;
  entityFilter: LibrarySearchEntityFilter;
  filesSearchScope: LibraryFilesSearchScope;
  filesSortDirection: LibraryFilesSortDirection;
  filesSortMode: LibraryFilesSortMode;
  loopsSortState: SavedLoopSortState;
  onSelectEntityFilter: (value: LibrarySearchEntityFilter) => void;
  onSelectFilesSearchScope: (value: LibraryFilesSearchScope) => void;
  onSelectFilesSortMode: (value: LibraryFilesSortMode) => void;
  onSelectLoopsSortField: (value: SavedLoopSortField) => void;
  onSelectPlaylistsSortField: (value: SavedPlaylistSortField) => void;
  onSelectSourcesSortField: (value: SavedSourceSortField) => void;
  onSelectTagsSortField: (value: SavedTagsListSortField) => void;
  onToggleFilesSortDirection: () => void;
  onToggleLoopsSortDirection: () => void;
  onTogglePlaylistsSortDirection: () => void;
  onToggleSourcesSortDirection: () => void;
  onSelectTagFilterMatchMode: (value: TagFilterMatchMode) => void;
  onToggleTagFilter: (value: string) => void;
  onToggleTagsSortDirection: () => void;
  playlistsSortState: SavedPlaylistSortState;
  selectedTagFilters: string[];
  selectedView: SavedRehearsalLibraryView;
  sourcesSortState: SavedSourceSortState;
  tagFilterMatchMode: TagFilterMatchMode;
  tagsSortState: SavedTagsListSortState;
};
