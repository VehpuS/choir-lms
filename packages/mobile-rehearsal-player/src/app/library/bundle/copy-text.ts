import { Platform, Share } from 'react-native';

export type CopyResult = 'copied' | 'shared' | 'failed';

/**
 * Puts text where the user can paste it into any chat app: the clipboard on
 * the web, the system share sheet (which has Copy) on a phone. The share sheet
 * stands in for a clipboard module so no dependency is added for this.
 */
export const copyText = async (text: string): Promise<CopyResult> => {
  try {
    const clipboard = (
      globalThis as {
        navigator?: { clipboard?: { writeText(text: string): Promise<void> } };
      }
    ).navigator?.clipboard;

    if (Platform.OS === 'web' && clipboard) {
      await clipboard.writeText(text);

      return 'copied';
    }

    await Share.share({ message: text });

    return 'shared';
  } catch {
    return 'failed';
  }
};
