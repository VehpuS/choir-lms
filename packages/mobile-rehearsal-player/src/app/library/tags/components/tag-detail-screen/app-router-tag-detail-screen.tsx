import type {
  PlayableItem,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type { RehearsalLibraryEntityCollections } from '@org/audio-library-runtime';

import type { DriveSessionMenuController } from '../../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { SavedRehearsalLibraryView } from '../../../saved-rehearsal-library/detail-mode';
import type { ShellDestinationKey } from '../../../../routing/shell/shell-model';
import { TagDetailScreen } from './index';

type AppRouterTagDetailScreenProps = {
  authorization: DriveSessionMenuController;
  entityCollections: RehearsalLibraryEntityCollections;
  fileLinks: RehearsalLibraryFileLinkNode[];
  folders: RehearsalLibraryFolderNode[];
  onOpenLibraryFolder: (folderId: string) => void;
  onPlayItems: (items: PlayableItem[]) => void;
  onSelectTag: (tag: string | null) => void;
  requestDestination: (destination: ShellDestinationKey) => void;
  requestLibraryView: (view: SavedRehearsalLibraryView) => void;
  requestPlaylistDetail: (playlistId: string) => void;
  tag: string;
};

export const AppRouterTagDetailScreen = ({
  authorization,
  entityCollections,
  fileLinks,
  folders,
  onOpenLibraryFolder,
  onPlayItems,
  onSelectTag,
  requestDestination,
  requestLibraryView,
  requestPlaylistDetail,
  tag,
}: AppRouterTagDetailScreenProps) => {
  return (
    <TagDetailScreen
      authorization={authorization}
      entityCollections={entityCollections}
      fileLinks={fileLinks}
      folders={folders}
      onClose={() => {
        onSelectTag(null);
      }}
      onOpenFolder={(folderId) => {
        onSelectTag(null);
        onOpenLibraryFolder(folderId);
        requestDestination('library');
        requestLibraryView('files');
      }}
      onOpenPlaylist={(playlistId) => {
        onSelectTag(null);
        requestDestination('library');
        requestPlaylistDetail(playlistId);
      }}
      onPlayMatches={onPlayItems}
      tag={tag}
    />
  );
};
