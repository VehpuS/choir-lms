import type { ViewStyle } from 'react-native';

import { appTheme } from '../../../utils/theme';

export type ModalSurfacePlacement = 'bottom' | 'center';

type ModalSurfaceLayout = Pick<
  ViewStyle,
  'alignItems' | 'justifyContent' | 'padding'
>;

// A sheet or dialog never grows past the screen: its scroll area shrinks to
// fit (and scrolls) instead of the whole surface running off the top, which
// left the title and first rows out of reach on a short screen. The strip left
// over stays a backdrop the user can tap to dismiss.
const BOTTOM_SURFACE_MAX_HEIGHT = '92%';
const CENTER_SURFACE_MAX_HEIGHT = '88%';

export const resolveModalSurfaceMaxHeight = (
  placement: ModalSurfacePlacement,
): ViewStyle['maxHeight'] => {
  return placement === 'center'
    ? CENTER_SURFACE_MAX_HEIGHT
    : BOTTOM_SURFACE_MAX_HEIGHT;
};

export const resolveModalSurfaceLayout = (
  placement: ModalSurfacePlacement,
): ModalSurfaceLayout => {
  if (placement === 'center') {
    return {
      alignItems: 'center',
      justifyContent: 'center',
      padding: appTheme.space.screenInset,
    };
  }

  return {
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    padding: 0,
  };
};
