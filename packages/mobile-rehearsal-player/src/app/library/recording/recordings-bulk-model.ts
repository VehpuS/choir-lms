import type {
  DriveAudioSource,
  NamedLoop,
  PlayableItem,
  Recording,
} from '@org/audio-library-models';
import { partition } from 'es-toolkit';

import type { BulkAcknowledgment } from '../selection/bulk-playback-run';
import {
  resolveRecordingOfflineAction,
  type RecordingOfflineAction,
  type RecordingOfflineContext,
} from './recording-offline';
import { resolveRecordingPlayback } from './recording-playback-item';

/**
 * What the Library `Recordings` view's bulk bar offers for a selection
 * (rehearsal-recording design Decision 15): `Play next` and `Add to queue`
 * for the recordings that can still play, the one offline action for their
 * tracks, and `Delete`. `Add to playlist` opens the playlist sheet (task 8.4) and `Export` with the export dialog (task 10.3).
 */

export const NO_QUEUE_REASON = 'Start playing something to use the queue.';
export const NOTHING_PLAYABLE_REASON =
  'None of the selected recordings can play: their tracks are no longer in your library.';

export type RecordingsBulkActionId =
  | 'play-next'
  | 'add-to-queue'
  | 'add-to-playlist'
  | 'offline'
  | 'delete';

export type RecordingsBulkAction = {
  id: RecordingsBulkActionId;
  label: string;
  isDisabled?: boolean;
  disabledReason?: string;
  tone?: 'destructive';
};

export type RecordingsBulkInput = {
  selected: readonly Recording[];
  canQueue: boolean;
  library: {
    sources: readonly DriveAudioSource[];
    loops: readonly NamedLoop[];
  };
  offline: RecordingOfflineContext;
};

export type RecordingsBulkModel = {
  actions: RecordingsBulkAction[];
  /** The selected recordings that can play, in selection order. */
  playable: PlayableItem[];
  /** Selected recordings whose track or loop left the library. */
  leftOutCount: number;
  offline: RecordingOfflineAction;
};

const countLabel = (count: number) =>
  `${count} ${count === 1 ? 'recording' : 'recordings'}`;

export const getRecordingsBulkModel = (
  input: RecordingsBulkInput,
): RecordingsBulkModel => {
  const resolutions = input.selected.map((recording) =>
    resolveRecordingPlayback(recording, input.library),
  );
  const [available] = partition(resolutions, (r) => r.kind === 'item');
  const playable = available.flatMap((r) =>
    r.kind === 'item' ? [r.item] : [],
  );
  const queueReason = !input.canQueue
    ? NO_QUEUE_REASON
    : playable.length === 0
      ? NOTHING_PLAYABLE_REASON
      : undefined;
  const offline = resolveRecordingOfflineAction(input.selected, input.offline);
  const queueAction = (
    id: 'play-next' | 'add-to-queue',
    label: string,
  ): RecordingsBulkAction => ({
    id,
    label,
    isDisabled: queueReason !== undefined,
    disabledReason: queueReason,
  });

  return {
    actions: [
      queueAction('play-next', 'Play next'),
      queueAction('add-to-queue', 'Add to queue'),
      { id: 'add-to-playlist', label: 'Add to playlist' },
      {
        id: 'offline',
        label: offline.label,
        isDisabled: offline.disabled,
        disabledReason: offline.note,
      },
      { id: 'delete', label: 'Delete', tone: 'destructive' },
    ],
    playable,
    leftOutCount: input.selected.length - playable.length,
    offline,
  };
};

const leftOutNote = (count: number) =>
  count === 0
    ? ''
    : ` ${countLabel(count)} left out: the track is no longer in your library.`;

export const getRecordingsQueueAcknowledgment = (
  action: 'play-next' | 'add-to-queue',
  model: Pick<RecordingsBulkModel, 'playable' | 'leftOutCount'>,
): BulkAcknowledgment => {
  const items = countLabel(model.playable.length);
  const note = leftOutNote(model.leftOutCount);

  return action === 'play-next'
    ? {
        title: 'Playing next',
        message: `${items} will play next, in order.${note}`,
      }
    : {
        title: 'Added to queue',
        message: `${items} added to the end of the queue.${note}`,
      };
};

export const getDeleteRecordingsTitle = (count: number) =>
  `Delete ${countLabel(count)}?`;

export const getRecordingsDeletedAcknowledgment = (
  count: number,
): BulkAcknowledgment => ({
  title: 'Recordings deleted',
  message: `${countLabel(count)} removed from this device. Copies already on Drive stay there.`,
});
