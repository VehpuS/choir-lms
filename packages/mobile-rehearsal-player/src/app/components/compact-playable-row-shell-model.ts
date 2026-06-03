export type CompactPlayableRowShellVariant = 'card' | 'row';

export const COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING = 44;

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