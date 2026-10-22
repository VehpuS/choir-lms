export type AllowSavingState = 'needs-permission' | 'declined' | 'ready';

export type AllowSavingStep =
  | { state: 'ready' }
  | {
      actionLabel: string;
      message: string;
      state: 'needs-permission' | 'declined';
      title: string;
    };

type AllowSavingInput = {
  hasWriteAccess: boolean;
  /** True once the user has been through the permission screen this session. */
  hasAskedForPermission: boolean;
};

export const ALLOW_SAVING_TITLE = 'Allow saving to Drive';

/**
 * What the save flow shows before it can upload. Reading never needs the
 * write permission, so a session without it still opens files and only lands
 * here when the user starts a save.
 */
export const describeAllowSavingStep = ({
  hasAskedForPermission,
  hasWriteAccess,
}: AllowSavingInput): AllowSavingStep => {
  if (hasWriteAccess) {
    return { state: 'ready' };
  }

  if (hasAskedForPermission) {
    return {
      actionLabel: 'Try again',
      message:
        'The permission to save files was not granted, so nothing was saved. Everything you could open before still opens. Try again and keep the box for saving files ticked.',
      state: 'declined',
      title: 'Saving to Drive was not allowed',
    };
  }

  return {
    actionLabel: 'Allow saving',
    message:
      'The app can only read your Drive today. Saving lets it add the file you choose to a folder you pick, and it can only change files it added itself.',
    state: 'needs-permission',
    title: ALLOW_SAVING_TITLE,
  };
};
