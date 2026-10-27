import type { DriveAuthorizationState } from '@org/google-drive';

export type DriveAuthorizationStatusCopy = {
  title: string;
  message: string;
  actionLabel: string;
  tone: 'neutral' | 'warning' | 'error' | 'ready';
};

export type DriveSessionTriggerCopy = {
  status: string;
  title: string;
};

type DriveAuthorizationCopyOptions = {
  googleAuthConfigured: boolean;
  lastIssue?: string | null;
};

export const getDriveAuthorizationStatusCopy = (
  state: DriveAuthorizationState,
  options: DriveAuthorizationCopyOptions,
): DriveAuthorizationStatusCopy => {
  const issueMessage = options.lastIssue ?? state.error ?? null;

  if (!options.googleAuthConfigured) {
    return {
      title: 'Google credentials are missing for this build',
      message:
        'Add the platform-specific Google client ID in the Expo runtime configuration before attempting Drive sign-in.',
      actionLabel: 'Credentials required',
      tone: 'error',
    };
  }

  if (state.status === 'authorized') {
    return {
      title: 'Google Drive is connected',
      message:
        'This device has an active read-only Drive session, so browsing, search, and saved-library playback are ready.',
      actionLabel: 'Refresh authorization',
      tone: 'ready',
    };
  }

  if (state.status === 'expired') {
    return {
      title: 'Google Drive authorization expired',
      message:
        'Reconnect your Google account to restore rehearsal library access before playback begins.',
      actionLabel: 'Reconnect Google Drive',
      tone: 'warning',
    };
  }

  if (state.status === 'attention-required') {
    return {
      title: 'Google Drive needs attention',
      message:
        issueMessage ??
        'The current Drive authorization is no longer usable. Reconnect to continue.',
      actionLabel: 'Reconnect Google Drive',
      tone: 'warning',
    };
  }

  if (issueMessage) {
    return {
      title: 'Google Drive sign-in did not complete',
      message: issueMessage,
      actionLabel: 'Connect Google Drive',
      tone: 'warning',
    };
  }

  return {
    title: 'Connect Google Drive',
    message:
      'Sign in with Google and grant read-only Drive access to unlock your rehearsal library.',
    actionLabel: 'Connect Google Drive',
    tone: 'neutral',
  };
};

export const getDriveSessionTriggerCopy = (
  statusCopy: DriveAuthorizationStatusCopy,
): DriveSessionTriggerCopy => {
  if (statusCopy.tone === 'ready') {
    return {
      status: 'Connected',
      title: 'Drive connected',
    };
  }

  if (statusCopy.tone === 'warning') {
    return {
      status: 'Needs attention',
      title: 'Session needs attention',
    };
  }

  if (statusCopy.tone === 'error') {
    return {
      status: 'Setup required',
      title: 'Drive unavailable',
    };
  }

  return {
    status: 'Connect',
    title: 'Connect Drive',
  };
};
