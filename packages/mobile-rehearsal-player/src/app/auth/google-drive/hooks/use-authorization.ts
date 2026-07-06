import {
  getDriveAuthorizationState,
  type DriveAuthorizationState,
} from '@org/google-drive';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  getGoogleAuthClientId,
  runtimeConfig,
} from '../../../../config/runtime';
import {
  clearDriveAuthorizationState,
  getDriveAuthorizationStatusCopy,
  persistDriveAuthorizationState,
  resolveDriveAuthorizationResult,
  restoreDriveAuthorizationState,
} from '../utils/authorization';
import {
  createAuthorizationSessionStore,
  type WebStorageLike,
} from '../utils/authorization-session-store';

WebBrowser.maybeCompleteAuthSession();

const FALLBACK_GOOGLE_CLIENT_ID = 'missing-google-client-id';

const resolveBrowserStorage = (): WebStorageLike | null => {
  try {
    return (
      (globalThis as { localStorage?: WebStorageLike }).localStorage ?? null
    );
  } catch {
    return null;
  }
};

const authorizationSessionStore = createAuthorizationSessionStore({
  platform: Platform.OS,
  secureStore: SecureStore,
  webStorage: resolveBrowserStorage(),
});

const createInitialAuthorizationState = (): DriveAuthorizationState => {
  return getDriveAuthorizationState({
    scope: runtimeConfig.google.driveScope,
  });
};

export const useGoogleDriveAuthorization = () => {
  const [authState, setAuthState] = useState<DriveAuthorizationState>(
    createInitialAuthorizationState,
  );
  const [isRestoring, setIsRestoring] = useState(true);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [lastIssue, setLastIssue] = useState<string | null>(null);

  const googleClientId = getGoogleAuthClientId();
  const googleAuthConfigured = Boolean(googleClientId);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId ?? FALLBACK_GOOGLE_CLIENT_ID,
    scopes: [runtimeConfig.google.driveScope],
    selectAccount: true,
  });

  useEffect(() => {
    let isCancelled = false;

    const restoreSession = async () => {
      try {
        const restoredState = await restoreDriveAuthorizationState(
          authorizationSessionStore,
          runtimeConfig.google.driveScope,
        );

        if (!isCancelled) {
          setAuthState(restoredState);
        }
      } finally {
        if (!isCancelled) {
          setIsRestoring(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const outcome = resolveDriveAuthorizationResult(
      response,
      runtimeConfig.google.driveScope,
    );

    if (!outcome) {
      return;
    }

    setIsAuthorizing(false);

    if (outcome.kind === 'dismissed') {
      return;
    }

    if (outcome.kind === 'failed') {
      setLastIssue(outcome.message);
      setAuthState((currentState) => {
        return getDriveAuthorizationState({
          accessToken: currentState.accessToken,
          expiresAt: currentState.expiresAt,
          scope: currentState.scope,
          error: outcome.message,
        });
      });
      return;
    }

    setLastIssue(null);
    setAuthState(outcome.state);
    setIsSavingSession(true);
    void persistDriveAuthorizationState(
      authorizationSessionStore,
      outcome.state,
    ).finally(() => {
      setIsSavingSession(false);
    });
  }, [response]);

  const startAuthorization = async () => {
    if (
      !googleAuthConfigured ||
      !request ||
      isRestoring ||
      isAuthorizing ||
      isSavingSession
    ) {
      return;
    }

    setLastIssue(null);
    setIsAuthorizing(true);

    try {
      await promptAsync();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Google Drive authorization failed.';

      setLastIssue(message);
      setAuthState((currentState) => {
        return getDriveAuthorizationState({
          accessToken: currentState.accessToken,
          expiresAt: currentState.expiresAt,
          scope: currentState.scope,
          error: message,
        });
      });
      setIsAuthorizing(false);
    }
  };

  const clearAuthorization = async () => {
    setLastIssue(null);
    setIsSavingSession(true);

    try {
      const nextState = await clearDriveAuthorizationState(
        authorizationSessionStore,
        runtimeConfig.google.driveScope,
      );
      setAuthState(nextState);
    } finally {
      setIsSavingSession(false);
    }
  };

  return {
    authState,
    canClearAuthorization:
      !isRestoring &&
      !isAuthorizing &&
      !isSavingSession &&
      authState.status !== 'unconfigured',
    canStartAuthorization:
      googleAuthConfigured &&
      Boolean(request) &&
      !isRestoring &&
      !isAuthorizing &&
      !isSavingSession,
    clearAuthorization,
    googleAuthConfigured,
    isBusy: isRestoring || isAuthorizing || isSavingSession,
    requestReady: Boolean(request),
    startAuthorization,
    statusCopy: getDriveAuthorizationStatusCopy(authState, {
      googleAuthConfigured,
      lastIssue,
    }),
  };
};
