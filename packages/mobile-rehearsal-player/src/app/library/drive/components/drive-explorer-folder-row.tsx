import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native';

import { appTheme } from '../../../utils/theme';
import { ExplorerListRow } from '../../components/explorer/index';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import type { DriveLibraryFolder } from '../utils/drive-library-view-model';
import { driveExplorerListStyles as styles } from './drive-explorer-list-styles';

type DriveExplorerFolderRowProps = {
  folder: DriveLibraryFolder;
  highlightQuery: string | null;
  isSelected?: boolean;
  metadataLabels: string[];
  onOpenFolder: (folder: DriveLibraryFolder) => void;
};

export const DriveExplorerFolderRow = ({
  folder,
  highlightQuery,
  isSelected,
  metadataLabels,
  onOpenFolder,
}: DriveExplorerFolderRowProps) => {
  const metadataLabel = metadataLabels.join(' • ');

  return (
    <ExplorerListRow
      active={isSelected}
      leadingIcon={
        <MaterialCommunityIcons
          color={appTheme.colors.secondaryText}
          name={
            isSelected === undefined
              ? 'folder-outline'
              : isSelected
                ? 'check-circle'
                : 'circle-outline'
          }
          size={22}
        />
      }
      metadata={
        metadataLabel ? (
          <Text numberOfLines={1} style={styles.folderMetadata}>
            {metadataLabel}
          </Text>
        ) : null
      }
      onPress={() => {
        onOpenFolder(folder);
      }}
      selected={isSelected}
      title={
        <SearchHighlightedText
          query={highlightQuery}
          style={styles.folderName}
          text={folder.name}
        />
      }
    />
  );
};
