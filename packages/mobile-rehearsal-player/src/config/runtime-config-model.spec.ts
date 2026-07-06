/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveRuntimeConfig } from './runtime-config-model.js';

describe('runtimeConfigModel', () => {
  it('prefers Expo extra config when it is available', () => {
    const runtimeConfig = resolveRuntimeConfig({
      env: {
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'env-web-client-id',
      },
      expoExtra: {
        mobileRehearsalPlayer: {
          google: {
            webClientId: 'expo-web-client-id',
          },
        },
      },
    });

    assert.equal(runtimeConfig.google.webClientId, 'expo-web-client-id');
  });

  it('falls back to EXPO_PUBLIC env values when Expo extra is unavailable', () => {
    const runtimeConfig = resolveRuntimeConfig({
      env: {
        EXPO_PUBLIC_APP_SCHEME: 'choirlms-web',
        EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: 'android-client-id',
        EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-client-id',
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client-id',
        EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER: 'com.choirlms.web',
      },
      expoExtra: undefined,
    });

    assert.equal(runtimeConfig.scheme, 'choirlms-web');
    assert.equal(runtimeConfig.iosBundleIdentifier, 'com.choirlms.web');
    assert.equal(runtimeConfig.google.iosClientId, 'ios-client-id');
    assert.equal(runtimeConfig.google.androidClientId, 'android-client-id');
    assert.equal(runtimeConfig.google.webClientId, 'web-client-id');
  });

  it('parses supported audio lists from EXPO_PUBLIC csv values', () => {
    const runtimeConfig = resolveRuntimeConfig({
      env: {
        EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_EXTENSIONS: 'mp3, wav ,ogg',
        EXPO_PUBLIC_GOOGLE_DRIVE_SUPPORTED_MIME_TYPES:
          'audio/mpeg, audio/wav ,audio/ogg',
      },
    });

    assert.deepEqual(runtimeConfig.supportedAudioExtensions, [
      'mp3',
      'wav',
      'ogg',
    ]);
    assert.deepEqual(runtimeConfig.supportedAudioMimeTypes, [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ]);
  });
});
