/// <reference types="node" />

import { compact, isEmpty, map, split } from 'es-toolkit/compat';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import path from 'node:path';

// Expo CLI evaluates app.config.ts directly in Node, so these defaults stay
// in this file instead of importing TypeScript modules from src/.
const DEFAULT_APP_SCHEME = 'choirlms';
const DEFAULT_ANDROID_PACKAGE = 'com.choirlms.mobile';
const DEFAULT_IOS_BUNDLE_IDENTIFIER = 'com.choirlms.mobile';
const DEFAULT_EAS_PROJECT_ID = 'b4ff1edf-46a7-4c71-a903-0a39ad6f7375';
const DEFAULT_GOOGLE_DRIVE_SCOPE =
  'https://www.googleapis.com/auth/drive.readonly';

const DEFAULT_SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
];

const DEFAULT_SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3',
  'm4a',
  'wav',
  'aac',
  'flac',
  'ogg',
];

const resolveAppAssetPath = (...pathSegments: string[]) => {
  return path.resolve(__dirname, ...pathSegments);
};

const parseCsv = (value: string | undefined, fallback: string[]) => {
  if (isEmpty(value)) {
    return fallback;
  }

  const items = compact(map(split(value, ','), (item) => item.trim()));

  return isEmpty(items) ? fallback : items;
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
    icon: resolveAppAssetPath('assets', 'images', 'icon.png'),
    scheme,
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
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
        foregroundImage: resolveAppAssetPath(
          'assets',
          'images',
          'adaptive-icon.png',
        ),
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
      favicon: resolveAppAssetPath('assets', 'images', 'favicon.png'),
    },
    extra: {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        projectId: DEFAULT_EAS_PROJECT_ID,
      },
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
          image: resolveAppAssetPath('assets', 'images', 'splash-icon.png'),
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
