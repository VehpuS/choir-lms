import type { ViewStyle } from 'react-native';

import { appTheme } from '../../../utils/theme';

export type ModalSurfacePlacement = 'bottom' | 'center';

type ModalSurfaceLayout = Pick<
  ViewStyle,
  'alignItems' | 'justifyContent' | 'padding'
>;

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
