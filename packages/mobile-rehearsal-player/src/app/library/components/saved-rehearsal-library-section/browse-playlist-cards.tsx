import { SavedPlaylistCardsList } from '../../playlists/components/saved-playlist-section-cards';
import type { SavedPlaylistCard } from '../../playlists/utils/saved-playlist-card-view-model';
import type { PlaylistDraftIssue } from '../../playlists/utils/saved-playlist-view-model';
import type { SavedRehearsalLibrarySectionProps } from './types';

type BrowsePlaylistCardsProps = {
  canMutatePlaylists: boolean;
  isPlaylistMutating: boolean;
  loops: SavedRehearsalLibrarySectionProps['savedLoops'];
  openPlaylist: (playlistId: string) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  playlistCards: SavedPlaylistCard[];
  playlistState: {
    cardRenamePlaylistId: string | null;
    cardRenamePlaylistName: string;
    closeCardRenameDialog: () => void;
    handleDeletePlaylist: (playlistId: string) => void;
    handleRenamePlaylistCard: () => Promise<void>;
    openCardRenameDialog: (playlistId: string) => void;
    selectedCardRenameIssue: PlaylistDraftIssue | null;
    selectedPlaylist:
      | SavedRehearsalLibrarySectionProps['savedPlaylists'][number]
      | null;
    setCardRenamePlaylistName: (name: string) => void;
  };
  savedLibrarySources: SavedRehearsalLibrarySectionProps['savedLibrarySources'];
  savedPlaylists: SavedRehearsalLibrarySectionProps['savedPlaylists'];
  searchQuery: string | null;
  togglePlaylistPlayback: SavedRehearsalLibrarySectionProps['togglePlaylistPlayback'];
};

export const BrowsePlaylistCards = ({
  canMutatePlaylists,
  isPlaylistMutating,
  loops,
  openPlaylist,
  onOpenPlaylistTagEditor,
  playlistCards,
  playlistState,
  savedLibrarySources,
  savedPlaylists,
  searchQuery,
  togglePlaylistPlayback,
}: BrowsePlaylistCardsProps) => {
  return (
    <SavedPlaylistCardsList
      cardRenameIssue={playlistState.selectedCardRenameIssue}
      cardRenamePlaylistId={playlistState.cardRenamePlaylistId}
      cardRenamePlaylistName={playlistState.cardRenamePlaylistName}
      canMutatePlaylists={canMutatePlaylists}
      highlightQuery={searchQuery}
      isMutating={isPlaylistMutating}
      onBeginRenamePlaylist={playlistState.openCardRenameDialog}
      onCancelRenamePlaylist={playlistState.closeCardRenameDialog}
      onDeletePlaylist={playlistState.handleDeletePlaylist}
      onEditPlaylistTags={onOpenPlaylistTagEditor}
      onPlayPlaylist={(playlistId) => {
        const playlist = savedPlaylists.find((currentPlaylist) => {
          return currentPlaylist.id === playlistId;
        });

        if (!playlist) {
          return;
        }

        void togglePlaylistPlayback({
          loops,
          mode: 'ordered',
          playlist,
          sources: savedLibrarySources,
        });
      }}
      onRenamePlaylistNameChange={playlistState.setCardRenamePlaylistName}
      onSelectPlaylist={openPlaylist}
      onSubmitRenamePlaylist={() => {
        void playlistState.handleRenamePlaylistCard();
      }}
      playlistCards={playlistCards}
      selectedPlaylistId={playlistState.selectedPlaylist?.id ?? null}
    />
  );
};
