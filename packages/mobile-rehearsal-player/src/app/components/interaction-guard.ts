import {
  Platform,
  type GestureResponderEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

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

const resolveWebTouchActionStyle = (
  touchAction: NonNullable<TouchActionStyle['touchAction']>,
): StyleProp<ViewStyle> | undefined => {
  if (Platform.OS !== 'web') {
    return undefined;
  }

  return { touchAction } as TouchActionStyle;
};

export const interactionGuardProps: InteractionGuardProps = {
  onTouchCancel: stopTouchPropagation,
  onTouchEnd: stopTouchPropagation,
  onTouchMove: stopTouchPropagation,
  onTouchStart: stopTouchPropagation,
};

export const buttonInteractionGuardStyle =
  resolveWebTouchActionStyle('manipulation');

export const continuousInteractionGuardStyle =
  resolveWebTouchActionStyle('none');
