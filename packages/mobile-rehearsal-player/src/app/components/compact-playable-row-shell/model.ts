export type CompactPlayableRowShellVariant = 'card' | 'row';

import { appTheme } from '../../utils/theme';

// Leaves room for the top-right 44pt overflow trigger and its inset.
export const COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING =
  appTheme.space.touchTarget + appTheme.space.xxs;

export const getCompactPlayableRowShellLayout = ({
  hasOverflowTrigger,
  variant,
}: {
  hasOverflowTrigger: boolean;
  variant: CompactPlayableRowShellVariant;
}) => {
  if (variant === 'card') {
    return {
      overflowPlacement: 'top-right' as const,
      titleTrailingPadding: hasOverflowTrigger
        ? COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING
        : 0,
    };
  }

  return {
    overflowPlacement: 'trailing-actions' as const,
    titleTrailingPadding: 0,
  };
};
