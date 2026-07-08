import type { NamedLoop, Playlist } from '@org/audio-library-models';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import { FeedbackCard } from '../../components/feedback-card';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { PlaylistDraftIssue } from '../utils/saved-playlist-view-model';
import {
  getSavedTrackContextMenuCopy,
  type SavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model';
import { savedTrackPlaylistMenuSurfaceStyles as styles } from './saved-track-playlist-menu-surface-styles';

type SavedTrackPlaylistMenuSurfaceProps = {
  createPlaylistIssue: PlaylistDraftIssue | null;
  draftName: string;
  isMutating: boolean;
  onClose: () => void;
  onDraftNameChange: (value: string) => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  onShowCreatePlaylist: () => void;
  onShowPlaylistSelector: () => void;
  onSubmitNewPlaylist: () => void;
  playlists: Playlist[];
  selectedLoop: NamedLoop | null;
  selectedSource: DriveLibrarySource | null;
  step: SavedTrackPlaylistMenuState['step'];
};

const getPlaylistItemCountLabel = (playlist: Playlist) => {
  const itemCount = playlist.items.length;

  return `${itemCount} item${itemCount === 1 ? '' : 's'}`;
};

export const SavedTrackPlaylistMenuSurface = ({
  createPlaylistIssue,
  draftName,
  isMutating,
  onClose,
  onDraftNameChange,
  onSelectPlaylist,
  onShowCreatePlaylist,
  onShowPlaylistSelector,
  onSubmitNewPlaylist,
  playlists,
  selectedLoop,
  selectedSource,
  step,
}: SavedTrackPlaylistMenuSurfaceProps) => {
  if (step === 'hidden' || (!selectedSource && !selectedLoop)) {
    return null;
  }

  const menuCopy = selectedSource
    ? getSavedTrackContextMenuCopy(selectedSource)
    : {
        title: selectedLoop?.name ?? 'Saved loop',
      };

  return (
    <BottomSheetSurface
      isVisible
      onClose={onClose}
      title={step === 'selector' ? menuCopy.title : 'New playlist'}
    >
      {step === 'selector' ? (
        <>
          {playlists.length > 0 ? (
            <ScrollView
              contentContainerStyle={styles.playlistListContent}
              keyboardShouldPersistTaps="handled"
              style={styles.playlistList}
            >
              {playlists.map((playlist) => {
                return (
                  <Pressable
                    accessibilityRole="button"
                    {...interactionGuardProps}
                    disabled={isMutating}
                    key={playlist.id}
                    onPress={() => {
                      onSelectPlaylist(playlist);
                    }}
                    style={({ pressed }) => [
                      styles.playlistRow,
                      buttonInteractionGuardStyle,
                      pressed && !isMutating ? styles.buttonPressed : undefined,
                      isMutating ? styles.buttonDisabled : undefined,
                    ]}
                  >
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistMetadata}>
                      {getPlaylistItemCountLabel(playlist)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <FeedbackCard
              message="Create one to add this item."
              size="compact"
              title="No playlists yet"
            />
          )}

          <View style={styles.actionColumn}>
            <Pressable
              accessibilityRole="button"
              {...interactionGuardProps}
              disabled={isMutating}
              onPress={onShowCreatePlaylist}
              style={({ pressed }) => [
                styles.secondaryAction,
                buttonInteractionGuardStyle,
                pressed && !isMutating ? styles.buttonPressed : undefined,
                isMutating ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>+ New playlist</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              {...interactionGuardProps}
              disabled={isMutating}
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryAction,
                buttonInteractionGuardStyle,
                pressed && !isMutating ? styles.buttonPressed : undefined,
                isMutating ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>Cancel</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={onDraftNameChange}
            placeholder="Wednesday rehearsal"
            placeholderTextColor="#857b6c"
            returnKeyType="done"
            style={styles.nameInput}
            value={draftName}
          />

          {createPlaylistIssue ? (
            <FeedbackCard
              message={createPlaylistIssue.message}
              size="compact"
              title={createPlaylistIssue.title}
              tone="error"
            />
          ) : null}

          <View style={styles.actionColumn}>
            <Pressable
              accessibilityRole="button"
              {...interactionGuardProps}
              disabled={isMutating}
              onPress={onSubmitNewPlaylist}
              style={({ pressed }) => [
                styles.primaryAction,
                buttonInteractionGuardStyle,
                pressed && !isMutating ? styles.buttonPressed : undefined,
                isMutating ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.primaryActionLabel}>
                {isMutating ? 'Creating playlist…' : 'Create'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              {...interactionGuardProps}
              disabled={isMutating}
              onPress={onShowPlaylistSelector}
              style={({ pressed }) => [
                styles.secondaryAction,
                buttonInteractionGuardStyle,
                pressed && !isMutating ? styles.buttonPressed : undefined,
                isMutating ? styles.buttonDisabled : undefined,
              ]}
            >
              <Text style={styles.secondaryActionLabel}>Cancel</Text>
            </Pressable>
          </View>
        </>
      )}
    </BottomSheetSurface>
  );
};
