import {
  getDriveAuthorizationState,
  type DriveAuthorizationState,
} from '@org/google-drive';
import { isEmpty } from 'es-toolkit/compat';
import type { AuthSessionResult } from 'expo-auth-session';

export {
  getDriveAuthorizationStatusCopy,
  getDriveSessionDetails,
  getDriveSessionTriggerCopy,
} from './drive-session-copy';
export type {
  DriveAuthorizationStatusCopy,
  DriveSessionTriggerCopy,
} from './drive-session-copy';

export type AuthorizationSessionStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
};

type PersistedDriveAuthorizationState = {
  accessToken: string;
  expiresAt?: string;
  scope?: string;
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

type WebAuthLocation = {
  origin?: string;
  pathname?: string;
};

const DEFAULT_AUTH_FAILURE_MESSAGE = 'Google Drive authorization failed.';

export const DRIVE_AUTH_SESSION_KEY = 'choirlms.google-drive.authorization';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readOptionalString = (value: unknown) => {
  return typeof value === 'string' && !isEmpty(value) ? value : undefined;
};

const normalizeWebPathname = (value: string) => {
  if (isEmpty(value)) {
    return '/';
  }

  return value.startsWith('/') ? value : `/${value}`;
};

export const resolveWebAuthRedirectUri = (
  location: WebAuthLocation | null | undefined,
) => {
  if (typeof location?.origin !== 'string' || isEmpty(location.origin)) {
    return undefined;
  }

  if (typeof location.pathname !== 'string') {
    return undefined;
  }

  return `${location.origin}${normalizeWebPathname(location.pathname)}`;
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
