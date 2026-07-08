import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PlayableItem } from '@org/audio-library-models';

import { appTheme } from '../../../utils/theme';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
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
      <View style={styles.navigationBar}>
        <Pressable
          accessibilityLabel={
            explorer.currentFolder.parentFolderId
              ? 'Go to parent folder'
              : 'Already at Files root'
          }
          accessibilityRole="button"
          disabled={!explorer.currentFolder.parentFolderId}
          onPress={() => {
            files.goToParentFolder();
          }}
          style={({ pressed }) => [
            styles.backButton,
            pressed && explorer.currentFolder.parentFolderId
              ? styles.rowPressed
              : undefined,
            !explorer.currentFolder.parentFolderId
              ? styles.backButtonDisabled
              : undefined,
          ]}
        >
          <MaterialCommunityIcons
            color={appTheme.colors.primaryText}
            name="chevron-left"
            size={22}
          />
        </Pressable>
        <View style={styles.navigationCopy}>
          <Text numberOfLines={1} style={styles.navigationEyebrow}>
            Current folder
          </Text>
          <Text numberOfLines={1} style={styles.navigationTitle}>
            {explorer.currentFolder.name}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.breadcrumbContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.breadcrumbBar}
      >
        {explorer.breadcrumbs.map((breadcrumb, index) => {
          const isCurrent = index === explorer.breadcrumbs.length - 1;

          return (
            <View key={breadcrumb.folderId} style={styles.breadcrumbItem}>
              {index > 0 ? (
                <Text style={styles.breadcrumbSeparator}>/</Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                disabled={isCurrent}
                onPress={() => {
                  files.goToFolder(breadcrumb.folderId);
                }}
                style={({ pressed }) => [
                  styles.breadcrumbChip,
                  isCurrent ? styles.breadcrumbChipCurrent : undefined,
                  pressed && !isCurrent ? styles.rowPressed : undefined,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={
                    isCurrent
                      ? styles.breadcrumbLabelCurrent
                      : styles.breadcrumbLabel
                  }
                >
                  {breadcrumb.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.listSurface}>
        {explorer.rows.map((row) => {
          const active = isRowActive(activePlayableItem, row);
          const disabled =
            (row.kind === 'track' && !row.isPlayable) ||
            (row.kind === 'loop' && row.playableItem === null);

          return (
            <Pressable
              accessibilityRole="button"
              disabled={disabled}
              key={row.kind === 'folder' ? row.folder.id : row.fileLink.id}
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
              style={({ pressed }) => [
                styles.row,
                active ? styles.rowActive : undefined,
                pressed && !disabled ? styles.rowPressed : undefined,
                disabled ? styles.rowDisabled : undefined,
              ]}
            >
              <View style={styles.rowLeadingIcon}>
                <MaterialCommunityIcons
                  color={active ? '#173229' : appTheme.colors.secondaryText}
                  name={getRowIconName(row)}
                  size={22}
                />
              </View>
              <View style={styles.rowCopy}>
                <Text numberOfLines={1} style={styles.rowTitle}>
                  {row.label}
                </Text>
                <Text numberOfLines={1} style={styles.rowSupportingLabel}>
                  {row.supportingLabel}
                </Text>
                {'message' in row && row.message ? (
                  <Text numberOfLines={2} style={styles.rowMessage}>
                    {row.message}
                  </Text>
                ) : null}
              </View>
              <View style={styles.rowTrailing}>
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
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  backButtonDisabled: {
    opacity: 0.5,
  },
  breadcrumbBar: {
    maxHeight: 42,
  },
  breadcrumbChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  breadcrumbChipCurrent: {
    backgroundColor: '#173229',
    borderColor: '#173229',
  },
  breadcrumbContent: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  breadcrumbLabelCurrent: {
    color: '#fff8ef',
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbSeparator: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  listSurface: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navigationCopy: {
    flex: 1,
    gap: 2,
  },
  navigationEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  navigationTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    backgroundColor: '#fffcf6',
  },
  rowActive: {
    borderColor: '#6f9c8c',
    backgroundColor: '#e6f0eb',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowDisabled: {
    opacity: 0.82,
  },
  rowLeadingIcon: {
    width: 28,
    alignItems: 'center',
  },
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
  rowPressed: {
    opacity: 0.88,
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
  rowTrailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  surface: {
    gap: 12,
  },
});
