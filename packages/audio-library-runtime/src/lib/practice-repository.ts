import type {
  DriveAudioSource,
  NamedLoop,
  Playlist,
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

export type PracticeRepository = {
  listSources(ownerId: string): Promise<DriveAudioSource[]>;
  saveSource(
    ownerId: string,
    source: DriveAudioSource,
  ): Promise<DriveAudioSource[]>;
  deleteSource(ownerId: string, sourceId: string): Promise<DriveAudioSource[]>;
  listLoops(ownerId: string): Promise<NamedLoop[]>;
  saveLoop(loop: NamedLoop): Promise<NamedLoop[]>;
  deleteLoop(ownerId: string, loopId: string): Promise<NamedLoop[]>;
  listPlaylists(ownerId: string): Promise<Playlist[]>;
  savePlaylist(playlist: Playlist): Promise<Playlist[]>;
  deletePlaylist(ownerId: string, playlistId: string): Promise<Playlist[]>;
  listLibraryFileTree(ownerId: string): Promise<RehearsalLibraryFileTree>;
  saveLibraryFolderNode(
    ownerId: string,
    folder: RehearsalLibraryFolderNode,
  ): Promise<RehearsalLibraryFileTree>;
  saveLibraryFileLink(
    ownerId: string,
    fileLink: RehearsalLibraryFileLinkNode,
  ): Promise<RehearsalLibraryFileTree>;
  deleteLibraryFileLink(
    ownerId: string,
    fileLinkId: string,
  ): Promise<RehearsalLibraryFileTree>;
  deleteLibraryFolderNode(
    ownerId: string,
    folderId: string,
  ): Promise<RehearsalLibraryFileTree>;
};
