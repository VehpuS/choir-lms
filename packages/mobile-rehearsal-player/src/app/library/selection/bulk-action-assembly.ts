import type { BulkAction } from './bulk-action-model';
import type {
  BulkActionId,
  ResolvedBulkAction,
} from './bulk-action-resolution';

export type BulkActionHandlers = Partial<Record<BulkActionId, () => void>>;

export const QUEUE_NEEDS_PLAYBACK_REASON =
  'Start playing something first, then add to its queue.';

const QUEUE_ACTIONS: ReadonlySet<BulkActionId> = new Set([
  'add-to-queue',
  'play-next',
]);

/**
 * Joins the pure resolution (which actions, enabled or not) with the surface's
 * handlers. An action with no handler yet is left off the bar rather than
 * shown dead, and the queue actions are disabled while nothing is playing,
 * since there is no queue to join (design Decision 10).
 */
export const assembleBulkActions = (options: {
  canQueue: boolean;
  handlers: BulkActionHandlers;
  resolved: readonly ResolvedBulkAction[];
}): BulkAction[] =>
  options.resolved.flatMap((action) => {
    const handler = options.handlers[action.id];

    if (!handler) {
      return [];
    }

    const isQueueBlocked = QUEUE_ACTIONS.has(action.id) && !options.canQueue;
    const disabledReason = action.isDisabled
      ? action.disabledReason
      : isQueueBlocked
        ? QUEUE_NEEDS_PLAYBACK_REASON
        : undefined;

    return [
      {
        ...(disabledReason === undefined ? {} : { disabledReason }),
        id: action.id,
        isDisabled: action.isDisabled || isQueueBlocked,
        label: action.label,
        onPress: handler,
        tone: action.tone,
      },
    ];
  });
