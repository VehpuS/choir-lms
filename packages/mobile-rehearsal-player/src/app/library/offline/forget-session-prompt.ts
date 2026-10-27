import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types';
import { formatByteSize } from './format-byte-size';

export const FORGET_SESSION_COPY = {
  cancelLabel: 'Cancel',
  clearLabel: 'Clear offline files',
  keepLabel: 'Keep offline files',
  title: 'Forget this session?',
} as const;

export type ForgetSessionPrompt = {
  message: string;
  title: string;
};

/**
 * What signing out of Drive asks when files are stored on this device, or
 * `null` when nothing is stored and there is nothing to decide.
 */
export const getForgetSessionPrompt = (
  entries: readonly AudioStoreEntry[],
): ForgetSessionPrompt | null => {
  if (entries.length === 0) {
    return null;
  }

  const totalBytes = entries.reduce((total, entry) => {
    return total + entry.sizeBytes;
  }, 0);
  const files = entries.length === 1 ? '1 file' : `${entries.length} files`;

  return {
    message: `${files} (${formatByteSize(totalBytes)}) stored offline. Keep them to play without a session, or clear them from this device.`,
    title: FORGET_SESSION_COPY.title,
  };
};
