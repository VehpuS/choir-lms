import type { MarkerSection, NamedLoop } from '@org/audio-library-models';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { buildNamedLoop } from '../../loops/utils/saved-loop-view-model';

type CreateSectionLoopsOptions = {
  now?: string;
  ownerId: string;
  /** The library's save operation: resolves true when the loop was saved. */
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  sections: readonly MarkerSection[];
  source: DriveLibrarySource;
};

/**
 * Saves each section as a loop (no tags) through the library's own save
 * operation, in order, so validation and storage are the editor's. Loops
 * created together share a timestamp, so each id also carries its position.
 * Stops at the first failure and reports it; loops saved before it stay.
 */
export const createSectionLoops = async ({
  now = new Date().toISOString(),
  ownerId,
  saveLoop,
  sections,
  source,
}: CreateSectionLoopsOptions): Promise<boolean> => {
  for (const [index, section] of sections.entries()) {
    const { loop } = buildNamedLoop({
      createId: (sourceId, createdAt) =>
        `loop:${sourceId}:${createdAt}:${index}`,
      endMs: section.endMs,
      loopName: section.name,
      now,
      ownerId,
      source,
      startMs: section.startMs,
    });

    if (!loop || !(await saveLoop(loop))) {
      return false;
    }
  }

  return true;
};
