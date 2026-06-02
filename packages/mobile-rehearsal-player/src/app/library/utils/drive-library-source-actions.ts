export type DriveLibrarySourceActionPlacement = 'inline' | 'menu';

export type DriveLibrarySourceAction = {
  accessibilityLabel?: string;
  disabled?: boolean;
  iconName?: 'pause' | 'play';
  label: string;
  onPress: () => void;
  placement?: DriveLibrarySourceActionPlacement;
  tone?: 'destructive' | 'neutral' | 'primary';
  variant?: 'button' | 'icon' | 'menu';
};

const REMOVE_LABEL_MATCHER = /^remove/i;

export const resolveDriveLibrarySourceActionPlacement = (
  action: DriveLibrarySourceAction,
): DriveLibrarySourceActionPlacement => {
  if (action.placement) {
    return action.placement;
  }

  if (
    action.variant === 'menu' ||
    action.variant === 'icon' ||
    action.tone === 'destructive' ||
    REMOVE_LABEL_MATCHER.test(action.label)
  ) {
    return 'menu';
  }

  return 'inline';
};
