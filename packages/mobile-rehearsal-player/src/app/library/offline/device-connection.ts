type NavigatorLike = { onLine?: boolean };

/**
 * The browser says it has no network. `onLine` can report true while Drive is
 * unreachable, so this only decides to try the stored copy first; a failed
 * fetch is still handled where it happens.
 */
export const isDeviceOffline = (
  navigatorApi: NavigatorLike | undefined = (
    globalThis as { navigator?: NavigatorLike }
  ).navigator,
): boolean => {
  return navigatorApi?.onLine === false;
};
