import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import type { PlayableItem } from '@org/audio-library-models';

import { appTheme } from '../../../utils/theme';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import {
  ExplorerBreadcrumbBar,
  ExplorerListRow,
  ExplorerListSurface,
  ExplorerNavigationBar,
} from '../explorer';
import { FeedbackCard } from '../feedback-card';

type SavedRehearsalLibraryFilesViewProps = {
  activePlayableItem: PlayableItem | null;
  files: UseLibraryFilesResult;
  onOpenPlaylist: (playlistId: string) => void;
  onTogglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  onToggleSourcePlayback: (source: DriveLibrarySource) => Promise<void>;
};

const getRowIconName = (
  row: NonNullable<UseLibraryFilesResult['explorer']>['rows'][number],
) => {
  switch (row.kind) {
    case 'folder':
      return 'folder-outline' as const;
    case 'loop':
      return 'repeat' as const;
    case 'playlist':
      return 'playlist-music-outline' as const;
    default:
      return 'music-note-outline' as const;
  }
};

const isRowActive = (
  activePlayableItem: PlayableItem | null,
  row: NonNullable<UseLibraryFilesResult['explorer']>['rows'][number],
) => {
  if (!activePlayableItem) {
    return false;
  }

  if (row.kind === 'track') {
    return (
      activePlayableItem.kind === 'track' &&
      activePlayableItem.sourceId === row.source.id
    );
  }

  if (row.kind === 'loop') {
    return (
      activePlayableItem.kind === 'loop' &&
      activePlayableItem.loopId === row.loop.id
    );
  }

  if (row.kind === 'playlist') {
    return activePlayableItem.playlistId === row.playlist.id;
  }

  return false;
};

export const SavedRehearsalLibraryFilesView = ({
  activePlayableItem,
  files,
  onOpenPlaylist,
  onTogglePlayableItemPlayback,
  onToggleSourcePlayback,
}: SavedRehearsalLibraryFilesViewProps) => {
  const explorer = files.explorer;

  if (files.isLoading && !explorer) {
    return (
      <FeedbackCard
        message="Reading the saved Library Files structure from this device."
        title="Loading Files"
        tone="neutral"
      />
    );
  }

  if (files.issue && !explorer) {
    return (
      <FeedbackCard
        message={files.issue.message}
        title={files.issue.title}
        tone="error"
      />
    );
  }

  if (!explorer) {
    return null;
  }

  return (
    <View style={styles.surface}>
      {files.issue ? (
        <FeedbackCard
          message={files.issue.message}
          size="compact"
          title={files.issue.title}
          tone="error"
        />
      ) : null}
      <ExplorerNavigationBar
        canGoBack={Boolean(explorer.currentFolder.parentFolderId)}
        eyebrow="Current folder"
        onGoBack={() => {
          files.goToParentFolder();
        }}
        title={explorer.currentFolder.name}
      />
      <ExplorerBreadcrumbBar
        items={explorer.breadcrumbs.map((breadcrumb, index) => {
          const isCurrent = index === explorer.breadcrumbs.length - 1;

          return {
            isCurrent,
            key: breadcrumb.folderId,
            label: breadcrumb.label,
            onPress: isCurrent
              ? undefined
              : () => {
                  files.goToFolder(breadcrumb.folderId);
                },
          };
        })}
      />
      <ExplorerListSurface>
        {explorer.rows.map((row) => {
          const active = isRowActive(activePlayableItem, row);
          const disabled =
            (row.kind === 'track' && !row.isPlayable) ||
            (row.kind === 'loop' && row.playableItem === null);

          return (
            <ExplorerListRow
              active={active}
              disabled={disabled}
              key={row.kind === 'folder' ? row.folder.id : row.fileLink.id}
              leadingIcon={
                <MaterialCommunityIcons
                  color={active ? '#173229' : appTheme.colors.secondaryText}
                  name={getRowIconName(row)}
                  size={22}
                />
              }
              message={
                'message' in row && row.message ? (
                  <Text numberOfLines={2} style={styles.rowMessage}>
                    {row.message}
                  </Text>
                ) : null
              }
              metadata={
                <Text numberOfLines={1} style={styles.rowSupportingLabel}>
                  {row.supportingLabel}
                </Text>
              }
              onPress={() => {
                if (row.kind === 'folder') {
                  files.openFolder(row.folder.id);
                  return;
                }

                if (row.kind === 'track') {
                  void onToggleSourcePlayback(row.source);
                  return;
                }

                if (row.kind === 'loop') {
                  if (!row.playableItem) {
                    return;
                  }

                  void onTogglePlayableItemPlayback(row.playableItem);
                  return;
                }

                onOpenPlaylist(row.playlist.id);
              }}
              overflowTrigger={
                <View
                  accessible={false}
                  pointerEvents="none"
                  style={styles.rowMenuPlaceholder}
                >
                  <MaterialCommunityIcons
                    color={appTheme.colors.secondaryText}
                    name="dots-vertical"
                    size={20}
                  />
                </View>
              }
              title={
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {row.label}
                </Text>
              }
            />
          );
        })}
      </ExplorerListSurface>
    </View>
  );
};

const styles = StyleSheet.create({
  rowMenuPlaceholder: {
    minWidth: 38,
    minHeight: 38,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
    opacity: 0.56,
  },
  rowMessage: {
    color: '#9a4d2d',
    fontSize: 12,
    lineHeight: 17,
  },
  rowSupportingLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  surface: {
    gap: 12,
  },
});
