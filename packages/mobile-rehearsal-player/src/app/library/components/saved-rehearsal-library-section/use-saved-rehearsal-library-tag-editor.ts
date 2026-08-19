import { useState } from 'react';

import type { RehearsalLibraryFolderNode } from '@org/audio-library-models';

import type { SavedRehearsalLibrarySectionProps } from './types';

type SaveFolderTags = (options: {
  folder: RehearsalLibraryFolderNode;
  tags: string[];
}) => Promise<{ didComplete: boolean }>;

export type TagEditorTarget =
  | {
      kind: 'folder';
      folder: RehearsalLibraryFolderNode;
    }
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
  saveFolderTags: SaveFolderTags;
  saveLoop: SavedRehearsalLibrarySectionProps['saveLoop'];
  saveSource: SavedRehearsalLibrarySectionProps['saveSource'];
  savedPlaylists: SavedRehearsalLibrarySectionProps['savedPlaylists'];
  updatePlaylist: SavedRehearsalLibrarySectionProps['updatePlaylist'];
};

export const resolveTagEditorTagsAndTitle = (
  target: TagEditorTarget,
): { tags: string[]; title: string } => {
  switch (target.kind) {
    case 'source':
      return {
        tags: target.source.tags ?? [],
        title: `Track tags • ${target.source.name}`,
      };
    case 'loop':
      return {
        tags: target.loop.tags ?? [],
        title: `Loop tags • ${target.loop.name}`,
      };
    case 'playlist':
      return {
        tags: target.playlist.tags ?? [],
        title: `Playlist tags • ${target.playlist.name}`,
      };
    case 'folder':
      return {
        tags: target.folder.tags ?? [],
        title: `Folder tags • ${target.folder.name}`,
      };
    case 'none':
      return { tags: [], title: '' };
  }
};

export const useSavedRehearsalLibraryTagEditor = ({
  saveFolderTags,
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

  const openFolderTagEditor = (folder: RehearsalLibraryFolderNode) => {
    setTagEditorTarget({
      kind: 'folder',
      folder,
    });
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
    } else if (tagEditorTarget.kind === 'folder') {
      didSave = (
        await saveFolderTags({
          folder: tagEditorTarget.folder,
          tags,
        })
      ).didComplete;
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

  const { tags, title } = resolveTagEditorTagsAndTitle(tagEditorTarget);

  return {
    closeTagEditor,
    isTagEditorSaving,
    isTagEditorVisible: tagEditorTarget.kind !== 'none',
    openFolderTagEditor,
    openLoopTagEditor,
    openPlaylistTagEditor,
    openSourceTagEditor,
    saveTagEdits,
    tags,
    title,
  };
};
