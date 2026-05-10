import Constants from 'expo-constants';
import { Platform } from 'react-native';

import {
  DEFAULT_ANDROID_PACKAGE,
  DEFAULT_APP_SCHEME,
  DEFAULT_GOOGLE_DRIVE_SCOPE,
  DEFAULT_IOS_BUNDLE_IDENTIFIER,
  DEFAULT_SUPPORTED_AUDIO_EXTENSIONS,
  DEFAULT_SUPPORTED_AUDIO_MIME_TYPES,
} from './defaults';

type RuntimeGoogleConfig = {
  iosClientId: string;
  androidClientId: string;
  webClientId: string;
  driveScope: string;
};

type RuntimeConfigShape = {
  mobileRehearsalPlayer?: {
    scheme?: string;
    iosBundleIdentifier?: string;
    androidPackage?: string;
    google?: Partial<RuntimeGoogleConfig>;
    supportedAudioMimeTypes?: string[];
    supportedAudioExtensions?: string[];
  };
};

export type RuntimeConfig = {
  scheme: string;
  iosBundleIdentifier: string;
  androidPackage: string;
  google: RuntimeGoogleConfig;
  supportedAudioMimeTypes: string[];
  supportedAudioExtensions: string[];
};

const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  scheme: DEFAULT_APP_SCHEME,
  iosBundleIdentifier: DEFAULT_IOS_BUNDLE_IDENTIFIER,
  androidPackage: DEFAULT_ANDROID_PACKAGE,
  google: {
    iosClientId: '',
    androidClientId: '',
    webClientId: '',
    driveScope: DEFAULT_GOOGLE_DRIVE_SCOPE,
  },
  supportedAudioMimeTypes: DEFAULT_SUPPORTED_AUDIO_MIME_TYPES,
  supportedAudioExtensions: DEFAULT_SUPPORTED_AUDIO_EXTENSIONS,
};

const mobileConfig =
  ((Constants.expoConfig?.extra ?? {}) as RuntimeConfigShape)
    .mobileRehearsalPlayer ?? {};

export const runtimeConfig: RuntimeConfig = {
  scheme: mobileConfig.scheme ?? DEFAULT_RUNTIME_CONFIG.scheme,
  iosBundleIdentifier:
    mobileConfig.iosBundleIdentifier ??
    DEFAULT_RUNTIME_CONFIG.iosBundleIdentifier,
  androidPackage:
    mobileConfig.androidPackage ?? DEFAULT_RUNTIME_CONFIG.androidPackage,
  google: {
    iosClientId:
      mobileConfig.google?.iosClientId ??
      DEFAULT_RUNTIME_CONFIG.google.iosClientId,
    androidClientId:
      mobileConfig.google?.androidClientId ??
      DEFAULT_RUNTIME_CONFIG.google.androidClientId,
    webClientId:
      mobileConfig.google?.webClientId ??
      DEFAULT_RUNTIME_CONFIG.google.webClientId,
    driveScope:
      mobileConfig.google?.driveScope ??
      DEFAULT_RUNTIME_CONFIG.google.driveScope,
  },
  supportedAudioMimeTypes:
    mobileConfig.supportedAudioMimeTypes ??
    DEFAULT_RUNTIME_CONFIG.supportedAudioMimeTypes,
  supportedAudioExtensions:
    mobileConfig.supportedAudioExtensions ??
    DEFAULT_RUNTIME_CONFIG.supportedAudioExtensions,
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
