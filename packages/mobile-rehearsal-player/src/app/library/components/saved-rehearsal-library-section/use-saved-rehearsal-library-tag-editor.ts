import { useState } from 'react';

import type { SavedRehearsalLibrarySectionProps } from './types';

type TagEditorTarget =
  | {
      kind: 'loop';
      loop: SavedRehearsalLibrarySectionProps['savedLoops'][number];
    }
  | {
      kind: 'playlist';
      playlist: SavedRehearsalLibrarySectionProps['savedPlaylists'][number];
    }
  | {
      kind: 'source';
      source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number];
    }
  | {
      kind: 'none';
    };

type UseSavedRehearsalLibraryTagEditorOptions = {
  saveLoop: SavedRehearsalLibrarySectionProps['saveLoop'];
  saveSource: SavedRehearsalLibrarySectionProps['saveSource'];
  savedPlaylists: SavedRehearsalLibrarySectionProps['savedPlaylists'];
  updatePlaylist: SavedRehearsalLibrarySectionProps['updatePlaylist'];
};

export const useSavedRehearsalLibraryTagEditor = ({
  saveLoop,
  saveSource,
  savedPlaylists,
  updatePlaylist,
}: UseSavedRehearsalLibraryTagEditorOptions) => {
  const [tagEditorTarget, setTagEditorTarget] = useState<TagEditorTarget>({
    kind: 'none',
  });
  const [isTagEditorSaving, setIsTagEditorSaving] = useState(false);

  const closeTagEditor = () => {
    if (isTagEditorSaving) {
      return;
    }

    setTagEditorTarget({ kind: 'none' });
  };

  const openLoopTagEditor = (
    loop: SavedRehearsalLibrarySectionProps['savedLoops'][number],
  ) => {
    setTagEditorTarget({
      kind: 'loop',
      loop,
    });
  };

  const openSourceTagEditor = (
    source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number],
  ) => {
    setTagEditorTarget({
      kind: 'source',
      source,
    });
  };

  const openPlaylistTagEditor = (playlistId: string) => {
    const playlist = savedPlaylists.find((currentPlaylist) => {
      return currentPlaylist.id === playlistId;
    });

    if (!playlist) {
      return;
    }

    setTagEditorTarget({
      kind: 'playlist',
      playlist,
    });
  };

  const saveTagEdits = async (tags: string[]) => {
    if (tagEditorTarget.kind === 'none') {
      return;
    }

    setIsTagEditorSaving(true);

    let didSave = false;

    if (tagEditorTarget.kind === 'source') {
      didSave = await saveSource({
        ...tagEditorTarget.source,
        tags,
      });
    } else if (tagEditorTarget.kind === 'loop') {
      didSave = await saveLoop({
        ...tagEditorTarget.loop,
        tags,
      });
    } else {
      didSave =
        (await updatePlaylist({
          ...tagEditorTarget.playlist,
          tags,
        })) !== null;
    }

    setIsTagEditorSaving(false);

    if (didSave) {
      setTagEditorTarget({ kind: 'none' });
    }
  };

  const tags =
    tagEditorTarget.kind === 'none'
      ? []
      : tagEditorTarget.kind === 'source'
        ? (tagEditorTarget.source.tags ?? [])
        : tagEditorTarget.kind === 'loop'
          ? (tagEditorTarget.loop.tags ?? [])
          : (tagEditorTarget.playlist.tags ?? []);
  const title =
    tagEditorTarget.kind === 'none'
      ? ''
      : tagEditorTarget.kind === 'source'
        ? `Track tags • ${tagEditorTarget.source.name}`
        : tagEditorTarget.kind === 'loop'
          ? `Loop tags • ${tagEditorTarget.loop.name}`
          : `Playlist tags • ${tagEditorTarget.playlist.name}`;

  return {
    closeTagEditor,
    isTagEditorSaving,
    isTagEditorVisible: tagEditorTarget.kind !== 'none',
    openLoopTagEditor,
    openPlaylistTagEditor,
    openSourceTagEditor,
    saveTagEdits,
    tags,
    title,
  };
};
