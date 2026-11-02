import type { Playlist, Recording } from '@org/audio-library-models';
import { useState } from 'react';

import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
} from '../../playlists/utils/saved-playlist-view-model';
import {
  addRecordingsToPlaylist,
  createPlaylistWithRecordings,
  getAddedToPlaylistAcknowledgment,
  getPlaylistPickerTitle,
} from '../recording-playlist-actions';
import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';

type RecordingPlaylistPickerProps = {
  recordings: readonly Recording[];
  playlists: Playlist[];
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  onClose: () => void;
  /** Called once the recordings are in a playlist, with what to tell the user. */
  onAdded: (acknowledgment: BulkAcknowledgment) => void;
};

/**
 * The playlist sheet for recordings (rehearsal-recording design Decision 16):
 * pick a playlist or make a new one, shared by the Recordings panel, the
 * Library view and its bulk bar.
 */
export const RecordingPlaylistPicker = ({
  createPlaylist,
  onAdded,
  onClose,
  playlists,
  recordings,
  updatePlaylist,
}: RecordingPlaylistPickerProps) => {
  const [step, setStep] = useState<'selector' | 'create'>('selector');
  const [draftName, setDraftName] = useState('');
  const [issue, setIssue] = useState<PlaylistDraftIssue | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const finish = (playlist: Playlist | null) => {
    setIsMutating(false);

    if (playlist) {
      onAdded(
        getAddedToPlaylistAcknowledgment(recordings.length, playlist.name),
      );
      onClose();
    }
  };

  const select = async (playlist: Playlist) => {
    setIsMutating(true);
    finish(await updatePlaylist(addRecordingsToPlaylist(playlist, recordings)));
  };

  const create = async () => {
    const draft = buildSavedPlaylist({ name: draftName, ownerId: 'unused' });

    if (draft.issue) {
      setIssue(draft.issue);

      return;
    }

    setIsMutating(true);
    finish(
      await createPlaylist(createPlaylistWithRecordings(draftName, recordings)),
    );
  };

  return (
    <SavedTrackPlaylistMenuSurface
      createPlaylistIssue={issue}
      draftName={draftName}
      isMutating={isMutating}
      onClose={onClose}
      onDraftNameChange={(value) => {
        setIssue(null);
        setDraftName(value);
      }}
      onSelectPlaylist={(playlist) => void select(playlist)}
      onShowCreatePlaylist={() => setStep('create')}
      onShowPlaylistSelector={() => {
        setIssue(null);
        setStep('selector');
      }}
      onSubmitNewPlaylist={() => void create()}
      playlists={playlists}
      selectedLoop={null}
      selectedRecordingTitle={getPlaylistPickerTitle(recordings)}
      selectedSource={null}
      step={step}
    />
  );
};
