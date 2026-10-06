import type { AppIconName } from '../../components/app-icon';

// Visible bulk actions before the rest move into the overflow sheet (design
// Decision 9, fixed at task 9.0: three outlined actions plus overflow).
export const MAX_VISIBLE_BULK_ACTIONS = 3;

export type BulkAction = {
  /** Why the action cannot run for this selection; shown when it is chosen. */
  disabledReason?: string;
  icon?: AppIconName;
  id: string;
  isDisabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'destructive' | 'neutral';
};

export type SplitBulkActions = {
  overflow: BulkAction[];
  visible: BulkAction[];
};

/**
 * Actions keep the order the surface resolved them in: the first three stay on
 * the bar and the remainder go to the overflow sheet.
 */
export const splitBulkActions = (
  actions: readonly BulkAction[],
  maxVisible: number = MAX_VISIBLE_BULK_ACTIONS,
): SplitBulkActions => ({
  overflow: actions.slice(maxVisible),
  visible: actions.slice(0, maxVisible),
});

export type BulkActionPressOutcome =
  | { kind: 'run' }
  | { kind: 'explain'; message: string };

const FALLBACK_DISABLED_MESSAGE = 'This action is not available right now.';

/**
 * A disabled action stays pressable so choosing it can say why it cannot run,
 * instead of looking broken.
 */
export const resolveBulkActionPress = (
  action: BulkAction,
): BulkActionPressOutcome =>
  action.isDisabled
    ? {
        kind: 'explain',
        message: action.disabledReason ?? FALLBACK_DISABLED_MESSAGE,
      }
    : { kind: 'run' };
