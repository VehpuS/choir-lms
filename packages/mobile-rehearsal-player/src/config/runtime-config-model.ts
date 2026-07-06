import { compact, isEmpty, map, split } from 'es-toolkit/compat';

import {
  DEFAULT_ANDROID_PACKAGE,
  DEFAULT_APP_SCHEME,
  DEFAULT_GOOGLE_DRIVE_SCOPE,
  DEFAULT_IOS_BUNDLE_IDENTIFIER,
  DEFAULT_SUPPORTED_AUDIO_EXTENSIONS,
  DEFAULT_SUPPORTED_AUDIO_MIME_TYPES,
} from './defaults';

type RuntimeGoogleConfig = {
  androidClientId: string;
  driveScope: string;
  iosClientId: string;
  webClientId: string;
};

export type RuntimeConfigShape = {
  mobileRehearsalPlayer?: {
    androidPackage?: string;
    google?: Partial<RuntimeGoogleConfig>;
    iosBundleIdentifier?: string;
    scheme?: string;
    supportedAudioExtensions?: string[];
    supportedAudioMimeTypes?: string[];
  };
};

export type RuntimeConfig = {
  androidPackage: string;
  google: RuntimeGoogleConfig;
  iosBundleIdentifier: string;
  scheme: string;
  supportedAudioExtensions: string[];
  supportedAudioMimeTypes: string[];
};

export type RuntimeEnv = {
  EXPO_PUBLIC_ANDROID_PACKAGE?: string;
  EXPO_PUBLIC_APP_SCHEME?: string;
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS?: string;
  EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES?: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
  EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER?: string;
};

// Expo only inlines EXPO_PUBLIC_* values for direct property access. Building
// this object with explicit reads keeps the web export from falling back to an
// empty runtime process.env object in production.
export const readExpoPublicRuntimeEnv = (): RuntimeEnv => {
  return {
    EXPO_PUBLIC_ANDROID_PACKAGE: process.env.EXPO_PUBLIC_ANDROID_PACKAGE,
    EXPO_PUBLIC_APP_SCHEME: process.env.EXPO_PUBLIC_APP_SCHEME,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS:
      process.env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS,
    EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES:
      process.env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER:
      process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER,
  };
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

const parseCsv = (value: string | undefined, fallback: string[]) => {
  if (isEmpty(value)) {
    return fallback;
  }

  const items = compact(map(split(value, ','), (item) => item.trim()));

  return isEmpty(items) ? fallback : items;
};

export const resolveRuntimeConfig = (options: {
  env?: RuntimeEnv;
  expoExtra?: RuntimeConfigShape;
}): RuntimeConfig => {
  const env = options.env ?? {};
  const mobileConfig = options.expoExtra?.mobileRehearsalPlayer ?? {};

  return {
    scheme:
      mobileConfig.scheme ??
      env.EXPO_PUBLIC_APP_SCHEME ??
      DEFAULT_RUNTIME_CONFIG.scheme,
    iosBundleIdentifier:
      mobileConfig.iosBundleIdentifier ??
      env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ??
      DEFAULT_RUNTIME_CONFIG.iosBundleIdentifier,
    androidPackage:
      mobileConfig.androidPackage ??
      env.EXPO_PUBLIC_ANDROID_PACKAGE ??
      DEFAULT_RUNTIME_CONFIG.androidPackage,
    google: {
      iosClientId:
        mobileConfig.google?.iosClientId ??
        env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ??
        DEFAULT_RUNTIME_CONFIG.google.iosClientId,
      androidClientId:
        mobileConfig.google?.androidClientId ??
        env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ??
        DEFAULT_RUNTIME_CONFIG.google.androidClientId,
      webClientId:
        mobileConfig.google?.webClientId ??
        env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??
        DEFAULT_RUNTIME_CONFIG.google.webClientId,
      driveScope:
        mobileConfig.google?.driveScope ??
        DEFAULT_RUNTIME_CONFIG.google.driveScope,
    },
    supportedAudioMimeTypes:
      mobileConfig.supportedAudioMimeTypes ??
      parseCsv(
        env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES,
        DEFAULT_RUNTIME_CONFIG.supportedAudioMimeTypes,
      ),
    supportedAudioExtensions:
      mobileConfig.supportedAudioExtensions ??
      parseCsv(
        env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS,
        DEFAULT_RUNTIME_CONFIG.supportedAudioExtensions,
      ),
  };
};
