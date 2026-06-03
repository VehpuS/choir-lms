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

export const resolveDriveLibrarySourceActionPlacement = (
  action: DriveLibrarySourceAction,
): DriveLibrarySourceActionPlacement => {
  return action.placement;
};
