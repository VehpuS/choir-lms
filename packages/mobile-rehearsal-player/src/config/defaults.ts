export const DEFAULT_APP_SCHEME = 'choirlms';
export const DEFAULT_ANDROID_PACKAGE = 'com.choirlms.mobile';
export const DEFAULT_IOS_BUNDLE_IDENTIFIER = 'com.choirlms.mobile';
export const DEFAULT_GOOGLE_DRIVE_SCOPE =
  'https://www.googleapis.com/auth/drive.readonly';
// Lets the app save a sheet music file to Drive; kept in step with the same
// constant in app.config.ts (a spec compares them).
export const DEFAULT_GOOGLE_DRIVE_WRITE_SCOPE =
  'https://www.googleapis.com/auth/drive.file';

export const DEFAULT_SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
];

export const DEFAULT_SUPPORTED_AUDIO_EXTENSIONS = [
  'mp3',
  'm4a',
  'wav',
  'aac',
  'flac',
  'ogg',
];
