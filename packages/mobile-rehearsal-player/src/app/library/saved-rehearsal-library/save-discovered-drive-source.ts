import type { DriveDiscoveredAudioSource } from '@org/google-drive';

type SaveDiscoveredDriveSourceOptions = {
  consumePendingFolderId: () => string | null;
  linkSourceToFolder: (options: {
    entityId: string;
    entityKind: 'track';
    parentFolderId: string;
  }) => Promise<boolean>;
  rootFolderId: string | null;
  saveSource: (source: DriveDiscoveredAudioSource) => Promise<boolean>;
  source: DriveDiscoveredAudioSource;
};

export const saveDiscoveredDriveSource = async (
  options: SaveDiscoveredDriveSourceOptions,
) => {
  const didSave = await options.saveSource(options.source);

  if (!didSave) {
    return false;
  }

  const pendingFolderId = options.consumePendingFolderId();

  if (!pendingFolderId || pendingFolderId === options.rootFolderId) {
    return true;
  }

  return options.linkSourceToFolder({
    entityId: options.source.id,
    entityKind: 'track',
    parentFolderId: pendingFolderId,
  });
};
