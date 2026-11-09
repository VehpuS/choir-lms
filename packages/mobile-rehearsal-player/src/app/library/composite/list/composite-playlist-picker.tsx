import type { CompositeTrack, Playlist } from '@org/audio-library-models';
import { useState } from 'react';

import { SavedTrackPlaylistMenuSurface } from '../../playlists/components/saved-track-playlist-menu-surface';
import {
  buildSavedPlaylist,
  type PlaylistDraftIssue,
} from '../../playlists/utils/saved-playlist-view-model';
import type { BulkAcknowledgment } from '../../selection/bulk-playback-run';
import {
  addCompositeEntry,
  createPlaylistWithComposite,
  getCompositeAddedAcknowledgment,
} from './composite-playlist-actions';

type CompositePlaylistPickerProps = {
  composite: Pick<CompositeTrack, 'id' | 'name' | 'stems'>;
  playlists: Playlist[];
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  onClose: () => void;
  /** Called once the composite is in a playlist, with what to tell the user. */
  onAdded: (acknowledgment: BulkAcknowledgment) => void;
};

/** The playlist sheet for a composite: pick a playlist or make a new one. */
export const CompositePlaylistPicker = ({
  composite,
  createPlaylist,
  onAdded,
  onClose,
  playlists,
  updatePlaylist,
}: CompositePlaylistPickerProps) => {
  const [step, setStep] = useState<'selector' | 'create'>('selector');
  const [draftName, setDraftName] = useState('');
  const [issue, setIssue] = useState<PlaylistDraftIssue | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const finish = (playlist: Playlist | null) => {
    setIsMutating(false);

    if (playlist) {
      onAdded(getCompositeAddedAcknowledgment(composite.name, playlist.name));
      onClose();
    }
  };

  const select = async (playlist: Playlist) => {
    setIsMutating(true);
    finish(await updatePlaylist(addCompositeEntry(playlist, composite)));
  };

  const create = async () => {
    const draft = buildSavedPlaylist({ name: draftName, ownerId: 'unused' });

    if (draft.issue) {
      setIssue(draft.issue);

      return;
    }

    setIsMutating(true);
    finish(
      await createPlaylist(createPlaylistWithComposite(draftName, composite)),
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
      selectedItemTitle={composite.name}
      selectedLoop={null}
      selectedSource={null}
      step={step}
    />
  );
};
