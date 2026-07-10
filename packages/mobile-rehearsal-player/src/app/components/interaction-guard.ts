import {
  Platform,
  type GestureResponderEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import {
  resolveInteractionGuardTouchAction,
  shouldStopTouchPropagation,
} from './interaction-guard-model';

type TouchActionStyle = ViewStyle & {
  touchAction?: 'manipulation' | 'none';
};

type InteractionGuardProps = Pick<
  ViewProps,
  'onTouchCancel' | 'onTouchEnd' | 'onTouchMove' | 'onTouchStart'
>;

const stopTouchPropagation = (event: GestureResponderEvent) => {
  event.stopPropagation();
};

const resolveInteractionGuardStyle = (
  touchAction: NonNullable<TouchActionStyle['touchAction']>,
): StyleProp<ViewStyle> | undefined => {
  const resolvedTouchAction = resolveInteractionGuardTouchAction(
    Platform.OS,
    touchAction,
  );

  if (!resolvedTouchAction) {
    return undefined;
  }

  return { touchAction: resolvedTouchAction } as TouchActionStyle;
};

export const interactionGuardProps: InteractionGuardProps =
  shouldStopTouchPropagation(Platform.OS)
    ? {
        onTouchCancel: stopTouchPropagation,
        onTouchEnd: stopTouchPropagation,
        onTouchMove: stopTouchPropagation,
        onTouchStart: stopTouchPropagation,
      }
    : {};

export const buttonInteractionGuardStyle =
  resolveInteractionGuardStyle('manipulation');

export const continuousInteractionGuardStyle =
  resolveInteractionGuardStyle('none');
