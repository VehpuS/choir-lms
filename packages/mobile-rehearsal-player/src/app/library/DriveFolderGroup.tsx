import { map } from 'es-toolkit/compat';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getFolderMetadataLabels,
  type DriveLibraryFolder,
} from './drive-library-view-model';

type DriveFolderGroupProps = {
  folders: DriveLibraryFolder[];
  onOpenFolder: (folder: DriveLibraryFolder) => void;
  title: string;
};

const BORDER_COLOR = '#d6d1c4';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

const DriveFolderCard = ({
  folder,
  onOpenFolder,
}: {
  folder: DriveLibraryFolder;
  onOpenFolder: (folder: DriveLibraryFolder) => void;
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        onOpenFolder(folder);
      }}
      style={({ pressed }) => [
        styles.folderCard,
        pressed ? styles.folderCardPressed : undefined,
      ]}
    >
      <View style={styles.folderCopy}>
        <Text style={styles.folderName}>{folder.name}</Text>
        <Text style={styles.folderMetadata}>
          {getFolderMetadataLabels(folder).join(' • ')}
        </Text>
      </View>
      <Text style={styles.folderAction}>Open folder</Text>
    </Pressable>
  );
};

export const DriveFolderGroup = ({
  folders,
  onOpenFolder,
  title,
}: DriveFolderGroupProps) => {
  if (folders.length === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupItems}>
        {map(folders, (folder) => {
          return (
            <DriveFolderCard
              key={folder.id}
              folder={folder}
              onOpenFolder={onOpenFolder}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    gap: 12,
  },
  groupTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  groupItems: {
    gap: 12,
  },
  folderCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
  folderCardPressed: {
    opacity: 0.88,
  },
  folderCopy: {
    gap: 8,
  },
  folderName: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  folderMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  folderAction: {
    color: '#173229',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
