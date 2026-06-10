import {
  getDriveAuthorizationState,
  type DriveAuthorizationState,
} from '@org/google-drive';
import { isEmpty } from 'es-toolkit/compat';
import type { AuthSessionResult } from 'expo-auth-session';

export type AuthorizationSessionStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
};

export type DriveAuthorizationStatusCopy = {
  title: string;
  message: string;
  actionLabel: string;
  tone: 'neutral' | 'warning' | 'error' | 'ready';
};

export type DriveSessionTriggerCopy = {
  body: string;
  status: string;
  title: string;
};

type PersistedDriveAuthorizationState = {
  accessToken: string;
  expiresAt?: string;
  scope?: string;
};

type DriveAuthorizationCopyOptions = {
  googleAuthConfigured: boolean;
  lastIssue?: string | null;
};

type DriveAuthorizationOutcome =
  | {
      kind: 'authorized';
      state: DriveAuthorizationState;
    }
  | {
      kind: 'failed';
      message: string;
    }
  | {
      kind: 'dismissed';
    };

type GoogleAuthTokenPayload = {
  accessToken: string;
  expiresIn?: number;
  issuedAt?: number;
  scope?: string;
};

type GoogleAuthSuccessPayload = {
  authentication: {
    accessToken: string;
    expiresIn?: number;
    issuedAt?: number;
    scope?: string;
  } | null;
  params: Record<string, string>;
};

const DEFAULT_AUTH_FAILURE_MESSAGE = 'Google Drive authorization failed.';

export const DRIVE_AUTH_SESSION_KEY = 'choirlms.google-drive.authorization';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readOptionalString = (value: unknown) => {
  return typeof value === 'string' && !isEmpty(value) ? value : undefined;
};

const resolveExpiresAt = (authentication: {
  expiresIn?: number;
  issuedAt?: number;
}) => {
  if (
    typeof authentication.expiresIn !== 'number' ||
    typeof authentication.issuedAt !== 'number'
  ) {
    return undefined;
  }

  return new Date(
    (authentication.issuedAt + authentication.expiresIn) * 1000,
  ).toISOString();
};

const toTokenPayload = (
  result: GoogleAuthSuccessPayload,
): GoogleAuthTokenPayload | null => {
  if (result.authentication?.accessToken) {
    return {
      accessToken: result.authentication.accessToken,
      expiresIn: result.authentication.expiresIn,
      issuedAt: result.authentication.issuedAt,
      scope: result.authentication.scope,
    };
  }

  if (typeof result.params.access_token === 'string') {
    const expiresIn =
      typeof result.params.expires_in === 'string'
        ? Number.parseInt(result.params.expires_in, 10)
        : undefined;

    return {
      accessToken: result.params.access_token,
      expiresIn: Number.isNaN(expiresIn ?? Number.NaN) ? undefined : expiresIn,
      issuedAt: Math.floor(Date.now() / 1000),
      scope: result.params.scope,
    };
  }

  return null;
};

export const createAuthorizedDriveState = (
  authentication: GoogleAuthTokenPayload,
  defaultScope: string,
) => {
  return getDriveAuthorizationState({
    accessToken: authentication.accessToken,
    expiresAt: resolveExpiresAt(authentication),
    scope: authentication.scope ?? defaultScope,
  });
};

export const resolveDriveAuthorizationResult = (
  result: AuthSessionResult | null,
  defaultScope: string,
): DriveAuthorizationOutcome | null => {
  if (!result) {
    return null;
  }

  if (result.type === 'success') {
    const authentication = toTokenPayload({
      authentication: result.authentication,
      params: result.params,
    });

    if (!authentication?.accessToken) {
      return {
        kind: 'failed',
        message: 'Google did not return a Drive access token.',
      };
    }

    return {
      kind: 'authorized',
      state: createAuthorizedDriveState(authentication, defaultScope),
    };
  }

  if (result.type === 'error') {
    return {
      kind: 'failed',
      message:
        result.error?.message ??
        result.params.error_description ??
        result.errorCode ??
        DEFAULT_AUTH_FAILURE_MESSAGE,
    };
  }

  return {
    kind: 'dismissed',
  };
};

export const restoreDriveAuthorizationState = async (
  store: AuthorizationSessionStore,
  defaultScope: string,
) => {
  const storedValue = await store.getItem(DRIVE_AUTH_SESSION_KEY);

  if (!storedValue) {
    return getDriveAuthorizationState({
      scope: defaultScope,
    });
  }

  try {
    const parsedValue = JSON.parse(storedValue) as unknown;

    if (!isRecord(parsedValue)) {
      return getDriveAuthorizationState({
        scope: defaultScope,
      });
    }

    return getDriveAuthorizationState({
      accessToken: readOptionalString(parsedValue.accessToken),
      expiresAt: readOptionalString(parsedValue.expiresAt),
      scope: readOptionalString(parsedValue.scope) ?? defaultScope,
    });
  } catch {
    return getDriveAuthorizationState({
      scope: defaultScope,
    });
  }
};

export const persistDriveAuthorizationState = async (
  store: AuthorizationSessionStore,
  state: DriveAuthorizationState,
) => {
  if (!state.accessToken) {
    await store.deleteItem(DRIVE_AUTH_SESSION_KEY);
    return;
  }

  const persistedState: PersistedDriveAuthorizationState = {
    accessToken: state.accessToken,
    expiresAt: state.expiresAt,
    scope: state.scope,
  };

  await store.setItem(DRIVE_AUTH_SESSION_KEY, JSON.stringify(persistedState));
};

export const clearDriveAuthorizationState = async (
  store: AuthorizationSessionStore,
  defaultScope: string,
) => {
  await store.deleteItem(DRIVE_AUTH_SESSION_KEY);

  return getDriveAuthorizationState({
    scope: defaultScope,
  });
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

const formatExpirationLabel = (expiresAt?: string) => {
  if (!expiresAt) {
    return 'Managed by token lifetime';
  }

  const parsedDate = new Date(expiresAt);

  if (Number.isNaN(parsedDate.valueOf())) {
    return 'Managed by token lifetime';
  }

  return parsedDate.toLocaleString();
};

export const getDriveSessionTriggerCopy = (
  statusCopy: DriveAuthorizationStatusCopy,
): DriveSessionTriggerCopy => {
  if (statusCopy.tone === 'ready') {
    return {
      body: 'Renew or forget this session here.',
      status: 'Connected',
      title: 'Drive connected',
    };
  }

  if (statusCopy.tone === 'warning') {
    return {
      body: 'Reconnect Google Drive here.',
      status: 'Needs attention',
      title: 'Session needs attention',
    };
  }

  if (statusCopy.tone === 'error') {
    return {
      body: 'Finish Google setup for this build.',
      status: 'Setup required',
      title: 'Drive unavailable',
    };
  }

  return {
    body: 'Connect Google Drive.',
    status: 'Connect',
    title: 'Connect Drive',
  };
};

export const getDriveSessionDetails = (
  state: DriveAuthorizationState,
  requestReady: boolean,
) => {
  return {
    expiry: formatExpirationLabel(state.expiresAt),
    request: requestReady ? 'Prepared' : 'Preparing',
    status:
      state.status === 'authorized'
        ? 'Connected'
        : state.status === 'expired'
          ? 'Expired'
          : state.status === 'attention-required'
            ? 'Needs attention'
            : 'Not connected',
  };
};