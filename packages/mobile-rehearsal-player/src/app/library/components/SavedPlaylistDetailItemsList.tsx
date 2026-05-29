import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Playlist } from '@org/audio-library-models';
import { Pressable, Text, View } from 'react-native';

import { getSavedPlaylistDetailRemoveActionPresentation } from '../utils/saved-playlist-detail-view-model';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';

type PlaylistEntry = Playlist['items'][number];

const getRowStatusLabel = (options: {
  isCurrentEntry: boolean;
  isPlayable: boolean;
}) => {
  if (options.isCurrentEntry) {
    return 'Playing';
  }

  if (options.isPlayable) {
    return 'Tap to play';
  }

  return 'Unavailable';
};

export const SavedPlaylistDetailItemsList = (props: {
  currentPlaylistEntryId: string | null;
  detailEntries: PlaylistEntry[];
  getItemDetailLabel: (entry: PlaylistEntry) => string;
  isEditMode: boolean;
  isItemPlayable: (entry: PlaylistEntry) => boolean;
  isMutating: boolean;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPlayPlaylistEntry: (entryId: string) => void;
  onRemoveItem: (entryId: string) => void;
}) => {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        {props.isEditMode ? 'Edit items' : 'Current items'} (
        {props.detailEntries.length})
      </Text>
      {props.detailEntries.length === 0 ? (
        <Text style={styles.emptyMessage}>
          This playlist is empty. Return to Library, add saved tracks or loops
          there, then come back here to review the running order.
        </Text>
      ) : (
        <View style={styles.groupItems}>
          {props.detailEntries.map((entry, index) => {
            const isCurrentEntry = props.currentPlaylistEntryId === entry.id;
            const isPlayable = props.isItemPlayable(entry);
            const removeActionPresentation =
              getSavedPlaylistDetailRemoveActionPresentation(props.isEditMode);

            return (
              <View
                key={entry.id}
                style={[
                  styles.itemCard,
                  isCurrentEntry ? styles.itemCardActive : undefined,
                  !isPlayable ? styles.itemCardUnavailable : undefined,
                ]}
              >
                <View style={styles.itemTopRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={props.isMutating || !isPlayable}
                    onPress={() => {
                      if (props.isEditMode) {
                        return;
                      }

                      props.onPlayPlaylistEntry(entry.id);
                    }}
                    style={({ pressed }) => [
                      styles.itemPressable,
                      styles.itemPressableContent,
                      pressed && !props.isMutating && isPlayable
                        ? styles.actionButtonPressed
                        : undefined,
                    ]}
                  >
                    <View style={styles.itemHeaderRow}>
                      <Text style={styles.itemTitle}>
                        {index + 1}. {entry.title}
                      </Text>
                      <Text
                        style={
                          isCurrentEntry
                            ? styles.itemStatusActive
                            : isPlayable
                              ? styles.itemStatusReady
                              : styles.itemStatusUnavailable
                        }
                      >
                        {props.isEditMode
                          ? 'Edit'
                          : getRowStatusLabel({ isCurrentEntry, isPlayable })}
                      </Text>
                    </View>
                    <Text style={styles.itemMetadata}>
                      {props.getItemDetailLabel(entry)}
                    </Text>
                  </Pressable>

                  {removeActionPresentation.isIconOnly ? (
                    <Pressable
                      accessibilityLabel={`Remove ${entry.title} from playlist`}
                      accessibilityRole="button"
                      disabled={props.isMutating}
                      onPress={() => {
                        props.onRemoveItem(entry.id);
                      }}
                      style={({ pressed }) => [
                        styles.destructiveIconButton,
                        styles.inlineRowIconButton,
                        pressed && !props.isMutating
                          ? styles.actionButtonPressed
                          : undefined,
                        props.isMutating
                          ? styles.actionButtonDisabled
                          : undefined,
                      ]}
                    >
                      <MaterialCommunityIcons
                        color="#1f1c17"
                        name="trash-can-outline"
                        size={16}
                      />
                    </Pressable>
                  ) : null}
                </View>

                {props.isEditMode ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      disabled={props.isMutating || index === 0}
                      onPress={() => {
                        props.onMoveItem(index, index - 1);
                      }}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && !props.isMutating && index > 0
                          ? styles.actionButtonPressed
                          : undefined,
                        props.isMutating || index === 0
                          ? styles.actionButtonDisabled
                          : undefined,
                      ]}
                    >
                      <Text style={styles.secondaryButtonLabel}>Move up</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        props.isMutating ||
                        index === props.detailEntries.length - 1
                      }
                      onPress={() => {
                        props.onMoveItem(index, index + 1);
                      }}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed &&
                        !props.isMutating &&
                        index < props.detailEntries.length - 1
                          ? styles.actionButtonPressed
                          : undefined,
                        props.isMutating ||
                        index === props.detailEntries.length - 1
                          ? styles.actionButtonDisabled
                          : undefined,
                      ]}
                    >
                      <Text style={styles.secondaryButtonLabel}>Move down</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remove ${entry.title} from playlist`}
                      accessibilityRole="button"
                      disabled={props.isMutating}
                      onPress={() => {
                        props.onRemoveItem(entry.id);
                      }}
                      style={({ pressed }) => [
                        styles.destructiveButton,
                        pressed && !props.isMutating
                          ? styles.actionButtonPressed
                          : undefined,
                        props.isMutating
                          ? styles.actionButtonDisabled
                          : undefined,
                      ]}
                    >
                      <Text style={styles.destructiveButtonLabel}>Remove</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
