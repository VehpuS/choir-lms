import { aggregateRehearsalLibraryTags } from '@org/audio-library-runtime';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {
  computeBulkTagChange,
  getBulkTagAcknowledgment,
  getBulkTagBaseline,
  isBulkTagChangeEmpty,
  type BulkTagTarget,
} from '../components/tag-editor-sheet/bulk-tags';
import { TagEditorSheet } from '../components/tag-editor-sheet';
import { useLibrarySelectionServices } from './library-selection-services';

type UseBulkTagEditorOptions = {
  /** Called after the tags were written, so the surface can leave selection mode. */
  onCompleted: () => void;
  /** The selected entities, each once. Keep the array stable between renders. */
  targets: readonly BulkTagTarget[];
};

const MULTIPLE_ITEMS_DESCRIPTION =
  'Tags marked "some" are on only some of the selected items. Tap one to give it to all of them, or remove it to clear it from all.';

/**
 * `Edit tags` for a selection (task 9.9): the existing tag editor sheet in its
 * shared / mixed / added states, writing one batched change. Shared by every
 * Library selection surface.
 */
export const useBulkTagEditor = ({
  onCompleted,
  targets,
}: UseBulkTagEditorOptions) => {
  const services = useLibrarySelectionServices();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [issue, setIssue] = useState<{
    message: string;
    title: string;
  } | null>(null);
  const { collections, folders } = services;

  const baseline = useMemo(() => {
    const tagsOf = (target: BulkTagTarget) => {
      switch (target.kind) {
        case 'folder':
          return folders.find(({ id }) => id === target.id)?.tags;
        case 'loop':
          return collections.loops.find(({ id }) => id === target.id)?.tags;
        case 'playlist':
          return collections.playlists.find(({ id }) => id === target.id)?.tags;
        case 'track':
          return collections.sources.find(({ id }) => id === target.id)?.tags;
      }
    };

    return getBulkTagBaseline(targets.map(tagsOf));
  }, [collections, folders, targets]);
  const availableTagUsage = useMemo(
    () =>
      aggregateRehearsalLibraryTags({
        entityCollections: {
          loops: collections.loops,
          playlists: collections.playlists,
          sources: collections.sources,
        },
        folders,
      }),
    [collections, folders],
  );

  const close = useCallback(() => {
    if (!isSaving) {
      setIsOpen(false);
      setIssue(null);
    }
  }, [isSaving]);

  const save = useCallback(
    async (draftTags: string[], untouchedMixedTags: string[]) => {
      const change = computeBulkTagChange({
        baseline,
        draftTags,
        untouchedMixedTags,
      });

      if (isBulkTagChangeEmpty(change)) {
        setIsOpen(false);
        return;
      }

      setIsSaving(true);
      const result = await services.updateTags({ ...change, targets });

      setIsSaving(false);

      if (!result.didComplete) {
        setIssue(
          result.issue ?? {
            message: 'Nothing was changed.',
            title: 'Could not update tags',
          },
        );
        return;
      }

      setIsOpen(false);
      setIssue(null);
      services.acknowledge(
        getBulkTagAcknowledgment({ change, targetCount: targets.length }),
      );
      onCompleted();
    },
    [baseline, onCompleted, services, targets],
  );

  const node: ReactNode = (
    <TagEditorSheet
      availableTagUsage={availableTagUsage}
      description={MULTIPLE_ITEMS_DESCRIPTION}
      isSaving={isSaving}
      isVisible={isOpen}
      issue={issue}
      mixedTags={baseline.mixedTags}
      onClose={close}
      onSave={(tags, untouchedMixedTags) => {
        void save(tags, untouchedMixedTags);
      }}
      selectedCount={targets.length}
      tags={baseline.sharedTags}
      title={`Tags • ${targets.length} selected`}
    />
  );

  return {
    node,
    open: useCallback(() => {
      setIssue(null);
      setIsOpen(true);
    }, []),
  };
};
