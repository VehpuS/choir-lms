import type { RehearsalLibraryFileTree } from '@org/audio-library-models';

export type FolderChoice = {
  id: string;
  name: string;
  /** 0 for the library root; nested folders are indented by this. */
  depth: number;
};

/** Every library folder in tree order with its depth, for the destination chooser. */
export const buildFolderChoices = (
  tree: RehearsalLibraryFileTree,
): FolderChoice[] => {
  const children = new Map<string, typeof tree.folders>();

  for (const folder of tree.folders) {
    if (folder.parentFolderId !== null) {
      children.set(folder.parentFolderId, [
        ...(children.get(folder.parentFolderId) ?? []),
        folder,
      ]);
    }
  }

  const root = tree.folders.find((folder) => folder.id === tree.rootFolderId);
  const walk = (parentId: string, depth: number): FolderChoice[] =>
    (children.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((folder) => [
        { id: folder.id, name: folder.name, depth },
        ...walk(folder.id, depth + 1),
      ]);

  return [
    { id: tree.rootFolderId, name: root?.name ?? 'Library', depth: 0 },
    ...walk(tree.rootFolderId, 1),
  ];
};
