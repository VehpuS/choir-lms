import {
  getDriveAuthorizationState,
  type DriveAuthorizationState,
} from '@org/google-drive';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

import { getGoogleAuthClientId, runtimeConfig } from '../../../config/runtime';
import {
  clearDriveAuthorizationState,
  getDriveAuthorizationStatusCopy,
  persistDriveAuthorizationState,
  resolveDriveAuthorizationResult,
  restoreDriveAuthorizationState,
  type AuthorizationSessionStore,
} from './authorization';

WebBrowser.maybeCompleteAuthSession();

const FALLBACK_GOOGLE_CLIENT_ID = 'missing-google-client-id';

const secureStoreSessionStore: AuthorizationSessionStore = {
  getItem(key) {
    return SecureStore.getItemAsync(key);
  },
  setItem(key, value) {
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem(key) {
    return SecureStore.deleteItemAsync(key);
  },
};

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
          secureStoreSessionStore,
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
      secureStoreSessionStore,
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
        secureStoreSessionStore,
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