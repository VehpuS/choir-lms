/// <reference types="node" />

import type { ConfigContext, ExpoConfig } from 'expo/config';

import {
  DEFAULT_ANDROID_PACKAGE,
  DEFAULT_APP_SCHEME,
  DEFAULT_GOOGLE_DRIVE_SCOPE,
  DEFAULT_IOS_BUNDLE_IDENTIFIER,
  DEFAULT_SUPPORTED_AUDIO_EXTENSIONS,
  DEFAULT_SUPPORTED_AUDIO_MIME_TYPES,
} from './src/config/defaults';

const parseCsv = (value: string | undefined, fallback: string[]) => {
  if (!value) {
    return fallback;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const scheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? DEFAULT_APP_SCHEME;
  const iosBundleIdentifier =
    process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ??
    DEFAULT_IOS_BUNDLE_IDENTIFIER;
  const androidPackage =
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? DEFAULT_ANDROID_PACKAGE;
  const supportedAudioMimeTypes = parseCsv(
    process.env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES,
    DEFAULT_SUPPORTED_AUDIO_MIME_TYPES,
  );
  const supportedAudioExtensions = parseCsv(
    process.env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS,
    DEFAULT_SUPPORTED_AUDIO_EXTENSIONS,
  );

  return {
    ...config,
    name: 'Choir LMS',
    slug: 'mobile-rehearsal-player',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme,
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      bundleIdentifier: iosBundleIdentifier,
      infoPlist: {
        UIBackgroundModes: ['audio'],
      },
    },
    android: {
      package: androidPackage,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
        'android.permission.WAKE_LOCK',
      ],
    },
    web: {
      bundler: 'metro',
      favicon: './assets/images/favicon.png',
    },
    extra: {
      ...config.extra,
      mobileRehearsalPlayer: {
        scheme,
        iosBundleIdentifier,
        androidPackage,
        google: {
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
          androidClientId:
            process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
          driveScope: DEFAULT_GOOGLE_DRIVE_SCOPE,
        },
        supportedAudioMimeTypes,
        supportedAudioExtensions,
      },
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-web-browser',
      'expo-secure-store',
      'expo-dev-client',
    ],
  };
};
