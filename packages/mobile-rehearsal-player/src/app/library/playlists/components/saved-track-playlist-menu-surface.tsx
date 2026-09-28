import type { NamedLoop, Playlist } from '@org/audio-library-models';
import { ScrollView, TextInput, View } from 'react-native';

import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { BottomSheetSurface } from '../../components/bottom-sheet-surface';
import { FeedbackCard } from '../../components/feedback-card';
import {
  MenuGroup,
  MenuRow,
} from '../../components/options-menu-sheet/menu-group';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { PlaylistDraftIssue } from '../utils/saved-playlist-view-model';
import {
  getSavedTrackContextMenuCopy,
  type SavedTrackPlaylistMenuState,
} from '../utils/saved-track-playlist-menu-view-model';
import { savedTrackPlaylistMenuSurfaceStyles as styles } from './saved-track-playlist-menu-surface-styles';

import { appTheme } from '../../../utils/theme';

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
          <MenuGroup>
            <MenuRow
              align="leading"
              disabled={isMutating}
              label="New playlist…"
              onPress={onShowCreatePlaylist}
              tone="accent"
            />
          </MenuGroup>
          {playlists.length > 0 ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.playlistList}
            >
              <MenuGroup>
                {playlists.map((playlist) => {
                  return (
                    <MenuRow
                      align="leading"
                      disabled={isMutating}
                      key={playlist.id}
                      label={playlist.name}
                      meta={getPlaylistItemCountLabel(playlist)}
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
              message="Create one to add this item."
              size="compact"
              title="No playlists yet"
            />
          )}

          <MenuGroup>
            <MenuRow
              disabled={isMutating}
              label="Cancel"
              onPress={onClose}
              tone="cancel"
            />
          </MenuGroup>
        </>
      ) : (
        <>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={onDraftNameChange}
            placeholder="Wednesday rehearsal"
            placeholderTextColor={appTheme.colors.textFaint}
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

          <View style={styles.actionRow}>
            <OutlinedActionButton
              disabled={isMutating}
              fill
              label="Cancel"
              onPress={onShowPlaylistSelector}
            />
            <OutlinedActionButton
              disabled={isMutating}
              fill
              label={isMutating ? 'Creating playlist…' : 'Create'}
              onPress={onSubmitNewPlaylist}
              variant="accent"
            />
          </View>
        </>
      )}
    </BottomSheetSurface>
  );
};
