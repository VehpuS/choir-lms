import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  resolveRuntimeConfig,
  type RuntimeConfig,
  type RuntimeConfigShape,
  type RuntimeEnv,
} from './runtime-config-model';

export const runtimeConfig: RuntimeConfig = {
  ...resolveRuntimeConfig({
    env: process.env as RuntimeEnv,
    expoExtra: (Constants.expoConfig?.extra ?? undefined) as
      | RuntimeConfigShape
      | undefined,
  }),
};

export type GoogleAuthPlatform = 'ios' | 'android' | 'web';

export const getGoogleAuthClientId = (
  platform: GoogleAuthPlatform = Platform.OS === 'ios' ||
  Platform.OS === 'android'
    ? Platform.OS
    : 'web',
) => {
  if (platform === 'ios') {
    return runtimeConfig.google.iosClientId;
  }

  if (platform === 'android') {
    return runtimeConfig.google.androidClientId;
  }

  return runtimeConfig.google.webClientId;
};

export const hasGoogleAuthConfig = (platform?: GoogleAuthPlatform) => {
  return Boolean(getGoogleAuthClientId(platform));
};
