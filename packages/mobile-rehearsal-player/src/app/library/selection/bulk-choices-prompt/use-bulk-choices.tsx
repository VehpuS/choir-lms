import type { ReactNode } from 'react';

import { BulkChoicesPrompt } from './index';
import { useBulkChoicesController } from './use-bulk-choices-controller';

/**
 * Settles the playlists-in-folders and repeated-items questions for a bulk
 * playback or playlist action: call `resolveChoices` before applying it and
 * render `prompt` somewhere in the surface. It resolves `null` on cancel.
 */
export const useBulkChoices = () => {
  const { cancel, confirm, request, resolveChoices } =
    useBulkChoicesController();
  const prompt: ReactNode = request ? (
    <BulkChoicesPrompt
      dueQuestions={request.dueQuestions}
      onCancel={cancel}
      onConfirm={confirm}
      playlistLinkCount={request.playlistLinkCount}
      repeatCount={request.repeatCount}
    />
  ) : null;

  return { prompt, resolveChoices };
};
