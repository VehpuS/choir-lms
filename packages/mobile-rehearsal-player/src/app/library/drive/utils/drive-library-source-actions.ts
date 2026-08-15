export type DriveLibrarySourceActionPlacement = 'inline' | 'menu';

export type DriveLibrarySourceAction = {
  accessibilityLabel?: string;
  disabled?: boolean;
  iconName?: 'pause' | 'play';
  label: string;
  onPress: () => void;
  placement: DriveLibrarySourceActionPlacement;
  tone?: 'destructive' | 'neutral' | 'primary';
};

export const getCompactPlaybackActionIconName = (
  label: string,
): NonNullable<DriveLibrarySourceAction['iconName']> => {
  return label === 'Pause' ? 'pause' : 'play';
};

export const resolveDriveLibrarySourceActionPlacement = (
  action: DriveLibrarySourceAction,
): DriveLibrarySourceActionPlacement => {
  return action.placement;
};

/**
 * Menu-item tone always downgrades `primary` to `secondary`: primary tone is
 * reserved for the inline playback action's button styling, matching the
 * Files-view overflow menu's `toOptionsMenuAction` behavior so no menu item
 * renders as a highlighted primary pill or jumps ahead of the shared
 * rehearsal/organize/destructive ordering.
 */
export const resolveDriveLibrarySourceMenuTone = (
  tone: DriveLibrarySourceAction['tone'],
): 'destructive' | 'secondary' => {
  if (tone === 'destructive') {
    return 'destructive';
  }

  return 'secondary';
};
