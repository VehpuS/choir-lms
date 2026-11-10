export type CopyResult = 'copied' | 'failed';

/**
 * Puts text on the clipboard so the user can paste it into any chat app.
 * `expo-clipboard` is loaded on demand: it covers the web and both phones, and
 * keeps the native module out of anything that only imports this file.
 */
export const copyText = async (text: string): Promise<CopyResult> => {
  try {
    const { setStringAsync } = await import('expo-clipboard');

    return (await setStringAsync(text)) ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
};
