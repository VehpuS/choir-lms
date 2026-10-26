import type { Playlist } from '@org/audio-library-models';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { appTheme } from '../../utils/theme';
import { BottomSheetSurface } from '../components/bottom-sheet-surface';
import { FeedbackCard } from '../components/feedback-card';
import {
  MenuGroup,
  MenuRow,
} from '../components/options-menu-sheet/menu-group';
import type { PlaylistDraftIssue } from '../playlists/utils/saved-playlist-view-model';
import { darkScrollbarStyle } from '../../components/dark-scrollbar';

const PLAYLIST_LIST_MAX_HEIGHT = 280;

const formatEntryCount = (playlist: Playlist) =>
  `${playlist.items.length} ${playlist.items.length === 1 ? 'item' : 'items'}`;

const formatAlreadyHeldMeta = (playlist: Playlist, heldCount: number) =>
  heldCount > 0
    ? `${formatEntryCount(playlist)} · ${heldCount} already in it`
    : formatEntryCount(playlist);

type BulkPlaylistTargetSheetProps = {
  /** How many of the selected items a playlist already holds. */
  getAlreadyHeldCount: (playlist: Playlist) => number;
  /** Playlists in the selection itself: adding them to themselves would double them. */
  blockedPlaylistIds: ReadonlySet<string>;
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  onClose: () => void;
  onSelectPlaylist: (playlist: Playlist) => void;
  playlists: readonly Playlist[];
  selectedCountLabel: string;
};

// `Add to playlist` for a selection: pick the playlist the effective items are
// appended to. Creating a new one is `Save as playlist`.
export const BulkPlaylistTargetSheet = ({
  blockedPlaylistIds,
  getAlreadyHeldCount,
  isMutating,
  isVisible,
  issue,
  onClose,
  onSelectPlaylist,
  playlists,
  selectedCountLabel,
}: BulkPlaylistTargetSheetProps) => (
  <BottomSheetSurface
    eyebrow={selectedCountLabel}
    isVisible={isVisible}
    onClose={onClose}
    title="Add to playlist"
  >
    {playlists.length > 0 ? (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={[darkScrollbarStyle, styles.playlistList]}
      >
        <MenuGroup>
          {playlists.map((playlist) => {
            const isBlocked = blockedPlaylistIds.has(playlist.id);

            return (
              <MenuRow
                align="leading"
                disabled={isMutating || isBlocked}
                icon="playlist-music-outline"
                key={playlist.id}
                label={playlist.name}
                meta={
                  isBlocked
                    ? 'In the selection'
                    : formatAlreadyHeldMeta(
                        playlist,
                        getAlreadyHeldCount(playlist),
                      )
                }
                onPress={() => {
                  onSelectPlaylist(playlist);
                }}
              />
            );
          })}
        </MenuGroup>
      </ScrollView>
    ) : (
      <FeedbackCard
        message={'Use "Save as playlist" to make one from this selection.'}
        size="compact"
        title="No playlists yet"
      />
    )}
    {issue ? (
      <FeedbackCard
        message={issue.message}
        size="compact"
        title={issue.title}
        tone="error"
      />
    ) : null}
    <MenuGroup>
      <MenuRow
        disabled={isMutating}
        label="Cancel"
        onPress={onClose}
        tone="cancel"
      />
    </MenuGroup>
  </BottomSheetSurface>
);

type BulkPlaylistNameSheetProps = {
  draftName: string;
  isMutating: boolean;
  isVisible: boolean;
  issue: PlaylistDraftIssue | null;
  onChangeName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  selectedCountLabel: string;
};

// `Save as playlist`: names the playlist, with the same validation as every
// other place a playlist is created.
export const BulkPlaylistNameSheet = ({
  draftName,
  isMutating,
  isVisible,
  issue,
  onChangeName,
  onClose,
  onSubmit,
  selectedCountLabel,
}: BulkPlaylistNameSheetProps) => (
  <BottomSheetSurface
    eyebrow={selectedCountLabel}
    isVisible={isVisible}
    onClose={onClose}
    title="Save as playlist"
  >
    <TextInput
      accessibilityLabel="Playlist name"
      autoCapitalize="sentences"
      autoCorrect={false}
      autoFocus
      onChangeText={onChangeName}
      onSubmitEditing={onSubmit}
      placeholder="Wednesday rehearsal"
      placeholderTextColor={appTheme.colors.textFaint}
      returnKeyType="done"
      style={styles.nameInput}
      value={draftName}
    />
    {issue ? (
      <FeedbackCard
        message={issue.message}
        size="compact"
        title={issue.title}
        tone="error"
      />
    ) : null}
    <View style={styles.actionRow}>
      <OutlinedActionButton
        disabled={isMutating}
        fill
        label="Cancel"
        onPress={onClose}
      />
      <OutlinedActionButton
        disabled={isMutating}
        fill
        label={isMutating ? 'Creating playlist…' : 'Create'}
        onPress={onSubmit}
        variant="accent"
      />
    </View>
  </BottomSheetSurface>
);

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: appTheme.space.xs,
  },
  nameInput: {
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: appTheme.space.md,
    borderWidth: 1,
    borderColor: appTheme.colors.borderChip,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.surface,
    color: appTheme.colors.text,
    fontSize: appTheme.type.input.fontSize,
  },
  playlistList: {
    maxHeight: PLAYLIST_LIST_MAX_HEIGHT,
  },
});
