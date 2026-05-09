import type { ConfigContext, ExpoConfig } from 'expo/config';

const DEFAULT_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
];

const DEFAULT_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg'];

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
  const scheme = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'choirlms';
  const iosBundleIdentifier =
    process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER ?? 'com.choirlms.mobile';
  const androidPackage =
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? 'com.choirlms.mobile';
  const supportedAudioMimeTypes = parseCsv(
    process.env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES,
    DEFAULT_AUDIO_MIME_TYPES
  );
  const supportedAudioExtensions = parseCsv(
    process.env.EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS,
    DEFAULT_AUDIO_EXTENSIONS
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
          driveScope: 'https://www.googleapis.com/auth/drive.readonly',
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