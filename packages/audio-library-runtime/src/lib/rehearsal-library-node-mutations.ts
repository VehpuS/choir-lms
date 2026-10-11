import {
  withResolvedTagAddedAt,
  type RehearsalLibraryFileLinkNode,
  type RehearsalLibraryFileTree,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import { hasCanonicalEntity } from './practice-repository-storage';
import {
  assertValidRehearsalLibraryFileLinkMutation,
  assertValidRehearsalLibraryFolderMutation,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  upsertRehearsalLibraryFileLinkNode,
  upsertRehearsalLibraryFolderNode,
  type RehearsalLibraryEntityCollections,
} from './rehearsal-library-files';

/**
 * Validates one folder mutation against `tree` and returns the next tree
 * without persisting it. Shared by the single-node save and the batched save
 * so both enforce the same rules.
 */
export const applyRehearsalLibraryFolderMutation = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  folder: RehearsalLibraryFolderNode;
  tree: RehearsalLibraryFileTree;
}): RehearsalLibraryFileTree => {
  const { entityCollections, folder, tree } = options;

  if (folder.id === REHEARSAL_LIBRARY_ROOT_FOLDER_ID) {
    throw new Error('The root library folder cannot be mutated.');
  }

  if (folder.parentFolderId === null) {
    throw new Error('Non-root library folders must reference a parent folder.');
  }

  if (
    !tree.folders.some((existingFolder) => {
      return existingFolder.id === folder.parentFolderId;
    })
  ) {
    throw new Error(
      `The parent folder "${folder.parentFolderId}" does not exist.`,
    );
  }

  assertValidRehearsalLibraryFolderMutation({
    entityCollections,
    folder,
    tree,
  });

  const priorFolder = tree.folders.find((existingFolder) => {
    return existingFolder.id === folder.id;
  });

  return upsertRehearsalLibraryFolderNode(tree, {
    ...withResolvedTagAddedAt(
      folder,
      priorFolder?.tagAddedAt,
      new Date().toISOString(),
    ),
    createdAt: priorFolder?.createdAt ?? folder.createdAt,
  });
};

/** The file-link counterpart of `applyRehearsalLibraryFolderMutation`. */
export const applyRehearsalLibraryFileLinkMutation = (options: {
  entityCollections: RehearsalLibraryEntityCollections;
  fileLink: RehearsalLibraryFileLinkNode;
  tree: RehearsalLibraryFileTree;
}): RehearsalLibraryFileTree => {
  const { entityCollections, fileLink, tree } = options;

  if (!tree.folders.some((folder) => folder.id === fileLink.parentFolderId)) {
    throw new Error(
      `The parent folder "${fileLink.parentFolderId}" does not exist.`,
    );
  }

  if (!hasCanonicalEntity(entityCollections, fileLink)) {
    throw new Error(
      `The ${fileLink.entityKind} entity "${fileLink.entityId}" is not available in the saved library.`,
    );
  }

  assertValidRehearsalLibraryFileLinkMutation({
    entityCollections,
    fileLink,
    tree,
  });

  return {
    ...tree,
    fileLinks: upsertRehearsalLibraryFileLinkNode(tree, fileLink).fileLinks,
  };
};
