export type InteractionGuardPlatform =
  | 'android'
  | 'ios'
  | 'web'
  | 'windows'
  | 'macos';

export type InteractionGuardTouchAction = 'manipulation' | 'none';

export const shouldStopTouchPropagation = (
  platform: InteractionGuardPlatform,
) => {
  return platform !== 'web';
};

export const resolveInteractionGuardTouchAction = (
  platform: InteractionGuardPlatform,
  touchAction: InteractionGuardTouchAction,
) => {
  if (platform !== 'web') {
    return undefined;
  }

  return touchAction;
};
