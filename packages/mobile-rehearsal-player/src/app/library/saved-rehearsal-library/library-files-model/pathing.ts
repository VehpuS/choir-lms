import type {
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type {
  LibraryFilesBreadcrumb,
  LibraryFilesSearchOptions,
} from './types';

export const buildFoldersById = (tree: RehearsalLibraryFileTree) => {
  return new Map(
    tree.folders.map((folder) => {
      return [folder.id, folder] as const;
    }),
  );
};

export const buildLibraryFolderPathLabel = (
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>,
  folder: RehearsalLibraryFolderNode,
) => {
  const labels = [folder.name];
  let parentFolderId = folder.parentFolderId;

  while (parentFolderId) {
    const parentFolder = foldersById.get(parentFolderId);

    if (!parentFolder) {
      break;
    }

    labels.unshift(parentFolder.name);
    parentFolderId = parentFolder.parentFolderId;
  }

  return labels.join(' / ');
};

export const buildBreadcrumbs = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>;
}): LibraryFilesBreadcrumb[] => {
  const breadcrumbs: LibraryFilesBreadcrumb[] = [];
  let currentFolder: RehearsalLibraryFolderNode | undefined =
    options.currentFolder;

  while (currentFolder) {
    breadcrumbs.unshift({
      folderId: currentFolder.id,
      label: currentFolder.name,
    });

    currentFolder = currentFolder.parentFolderId
      ? options.foldersById.get(currentFolder.parentFolderId)
      : undefined;
  }

  return breadcrumbs;
};

export const buildScopedFolderIds = (options: {
  currentFolder: RehearsalLibraryFolderNode;
  searchScope: LibraryFilesSearchOptions['searchScope'];
  tree: RehearsalLibraryFileTree;
}) => {
  if (options.searchScope === 'all-files') {
    return new Set(
      options.tree.folders.map((folder) => {
        return folder.id;
      }),
    );
  }

  const scopedFolderIds = new Set<string>();
  const pendingFolderIds = [options.currentFolder.id];

  while (pendingFolderIds.length > 0) {
    const nextFolderId = pendingFolderIds.pop();

    if (!nextFolderId || scopedFolderIds.has(nextFolderId)) {
      continue;
    }

    scopedFolderIds.add(nextFolderId);

    for (const folder of options.tree.folders) {
      if (folder.parentFolderId === nextFolderId) {
        pendingFolderIds.push(folder.id);
      }
    }
  }

  return scopedFolderIds;
};

export const prefixContainingPath = (options: {
  currentFolderId: string;
  foldersById: ReadonlyMap<string, RehearsalLibraryFolderNode>;
  parentFolderId: string | null;
  supportingLabel: string;
}) => {
  if (
    !options.parentFolderId ||
    options.parentFolderId === options.currentFolderId
  ) {
    return options.supportingLabel;
  }

  const containingFolder = options.foldersById.get(options.parentFolderId);

  if (!containingFolder) {
    return options.supportingLabel;
  }

  return `${buildLibraryFolderPathLabel(options.foldersById, containingFolder)} • ${options.supportingLabel}`;
};
