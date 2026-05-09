import Constants from 'expo-constants';

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
  scheme: 'choirlms',
  iosBundleIdentifier: 'com.choirlms.mobile',
  androidPackage: 'com.choirlms.mobile',
  google: {
    iosClientId: '',
    androidClientId: '',
    webClientId: '',
    driveScope: 'https://www.googleapis.com/auth/drive.readonly',
  },
  supportedAudioMimeTypes: [
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
    'audio/flac',
    'audio/ogg',
  ],
  supportedAudioExtensions: ['mp3', 'm4a', 'wav', 'aac', 'flac', 'ogg'],
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
      mobileConfig.google?.iosClientId ?? DEFAULT_RUNTIME_CONFIG.google.iosClientId,
    androidClientId:
      mobileConfig.google?.androidClientId ??
      DEFAULT_RUNTIME_CONFIG.google.androidClientId,
    webClientId:
      mobileConfig.google?.webClientId ?? DEFAULT_RUNTIME_CONFIG.google.webClientId,
    driveScope:
      mobileConfig.google?.driveScope ?? DEFAULT_RUNTIME_CONFIG.google.driveScope,
  },
  supportedAudioMimeTypes:
    mobileConfig.supportedAudioMimeTypes ??
    DEFAULT_RUNTIME_CONFIG.supportedAudioMimeTypes,
  supportedAudioExtensions:
    mobileConfig.supportedAudioExtensions ??
    DEFAULT_RUNTIME_CONFIG.supportedAudioExtensions,
};

export const hasGoogleAuthConfig = () => {
  return [
    runtimeConfig.google.iosClientId,
    runtimeConfig.google.androidClientId,
    runtimeConfig.google.webClientId,
  ].some(Boolean);
};