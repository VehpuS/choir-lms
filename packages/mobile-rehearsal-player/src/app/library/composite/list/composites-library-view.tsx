import {
  resolveCompositePlayableItem,
  type DriveAudioSource,
  type PlayableItem,
} from '@org/audio-library-models';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { EqualizerMark } from '../../../components/equalizer-mark';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { RowMetaLine } from '../../../components/row-meta-line';
import { appTheme } from '../../../utils/theme';
import {
  ExplorerListRow,
  ExplorerListSurface,
} from '../../components/explorer';
import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import {
  isSavedTrackPlaybackActive,
  type SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import { LibraryFilesConfirmationDialog } from '../../selection/library-files-confirmation-dialog';
import {
  compositeCapabilities,
  resolveCompositeAvailability,
} from '../composite-capabilities';
import {
  getCompositeStore,
  useComposites,
} from '../store/composite-store-instance';
import {
  buildDeleteCompositeDialog,
  resolveCompositeRowMenu,
} from './composite-row-actions';
import { CompositeRenameSheet } from './composite-rename-sheet';
import {
  COMPOSITES_EMPTY_HINT,
  COMPOSITES_EMPTY_TITLE,
  buildCompositeLibraryRows,
  type CompositeLibraryRow,
} from './composites-library-model';

type CompositesLibraryViewProps = {
  activePlayableItem: PlayableItem | null;
  canQueueAsNext: boolean;
  playbackState: SavedTrackPlaybackState | undefined;
  queuePlayableItemNext: (item: PlayableItem) => void;
  queuePlayableItemUpNext: (item: PlayableItem) => void;
  searchQuery: string | null;
  sources: readonly DriveAudioSource[];
  togglePlayableItemPlayback: (item: PlayableItem) => Promise<void>;
};

/**
 * The Library `Composites` view (composite-tracks 7.1): a row per composite
 * with its badge and length, a tap that plays it, and an options menu. Built
 * like the Tracks rows; a composite is its own item, not one of its stems.
 */
export const CompositesLibraryView = ({
  activePlayableItem,
  canQueueAsNext,
  playbackState,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  searchQuery,
  sources,
  togglePlayableItemPlayback,
}: CompositesLibraryViewProps) => {
  const composites = useComposites();
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const library = useMemo(() => ({ sources }), [sources]);
  const availability = resolveCompositeAvailability(compositeCapabilities());
  const rows = useMemo(
    () =>
      buildCompositeLibraryRows({ composites, library, query: searchQuery }),
    [composites, library, searchQuery],
  );
  const findComposite = (id: string | null) =>
    composites.find((composite) => composite.id === id);
  const itemFor = (row: CompositeLibraryRow) => {
    const composite = findComposite(row.id);

    return composite ? resolveCompositePlayableItem(composite, library) : null;
  };

  if (composites.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{COMPOSITES_EMPTY_TITLE}</Text>
        <Text style={styles.emptyHint}>{COMPOSITES_EMPTY_HINT}</Text>
      </View>
    );
  }

  const renaming = findComposite(renameId);
  const deleting = findComposite(deleteId);

  return (
    <View style={styles.group}>
      {availability.available ? null : (
        <Text style={styles.emptyHint}>{availability.message}</Text>
      )}
      <ExplorerListSurface>
        {rows.map((row) => {
          const item = itemFor(row);
          const isActive =
            item !== null &&
            isSavedTrackPlaybackActive(activePlayableItem, item);
          const isPlaying = isActive && playbackState === 'playing';
          const menu = resolveCompositeRowMenu({
            isPlayable: item !== null && availability.available,
            canQueueAsNext,
            onPlayNext: () => item && queuePlayableItemNext(item),
            onAddToQueue: () => item && queuePlayableItemUpNext(item),
            onRename: () => setRenameId(row.id),
            onDelete: () => setDeleteId(row.id),
          });

          return (
            <View key={row.id}>
              <ExplorerListRow
                actions={isPlaying ? <EqualizerMark /> : null}
                disabled={item === null || !availability.available}
                leadingIcon={
                  <AppIcon
                    color={
                      isActive
                        ? appTheme.colors.accentText
                        : appTheme.colors.textFaint
                    }
                    name="tune-variant"
                    size={18}
                  />
                }
                metadata={
                  <RowMetaLine
                    text={[row.badge, row.meta].filter(Boolean).join(' · ')}
                  />
                }
                onPress={() => {
                  if (item) {
                    void togglePlayableItemPlayback(item);
                  }
                }}
                overflowTrigger={
                  <OverflowMenuTrigger
                    accessibilityLabel={`${row.name} options`}
                    onPress={() => setMenuId(row.id)}
                    style={styles.overflow}
                  />
                }
                title={
                  <SearchHighlightedText
                    numberOfLines={1}
                    query={searchQuery}
                    style={[styles.title, isActive ? styles.titleActive : null]}
                    text={row.name}
                  />
                }
              />
              <OptionsMenuSheet
                actions={menu.map((action) => ({
                  ...action,
                  onPress: () => {
                    setMenuId(null);
                    action.onPress();
                  },
                }))}
                isVisible={menuId === row.id}
                onClose={() => setMenuId(null)}
                title={row.name}
              />
            </View>
          );
        })}
      </ExplorerListSurface>
      {renaming ? (
        <CompositeRenameSheet
          currentName={renaming.name}
          onCancel={() => setRenameId(null)}
          onSave={(name) => {
            setRenameId(null);
            void getCompositeStore().rename(renaming.id, name);
          }}
        />
      ) : null}
      <LibraryFilesConfirmationDialog
        content={
          deleting
            ? buildDeleteCompositeDialog({
                name: deleting.name,
                stemCount: deleting.stems.length,
              })
            : null
        }
        isMutating={false}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleting) {
            void getCompositeStore().remove(deleting.id);
          }
          setDeleteId(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { gap: appTheme.space.sm, paddingVertical: appTheme.space.lg },
  emptyHint: { ...appTheme.type.rowMeta, color: appTheme.colors.textMuted },
  emptyTitle: { ...appTheme.type.rowTitle, color: appTheme.colors.text },
  group: { gap: appTheme.space.md },
  overflow: { position: 'relative', right: 0, top: 0 },
  title: { ...appTheme.type.rowTitle, color: appTheme.colors.text },
  titleActive: { color: appTheme.colors.accentText },
});
