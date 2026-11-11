import type { ViewStyle } from 'react-native';

import { appTheme } from '../../../utils/theme';

export type ModalSurfacePlacement = 'bottom' | 'center';

/**
 * How a bottom sheet is shown. `side-sheet` is the wide-short layout's version
 * of it: a full-height panel against the trailing edge, so a short window does
 * not clip its list.
 */
export type ModalSurfacePresentation = 'default' | 'side-sheet';

// Wide enough for a menu row or a form field, narrow enough to leave the
// content visible behind the scrim.
export const SIDE_SHEET_WIDTH = 380;

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
  presentation: ModalSurfacePresentation = 'default',
): ViewStyle['maxHeight'] => {
  if (presentation === 'side-sheet') {
    return '100%';
  }

  return placement === 'center'
    ? CENTER_SURFACE_MAX_HEIGHT
    : BOTTOM_SURFACE_MAX_HEIGHT;
};

// iOS does not resize a screen for the keyboard, so a sheet anchored to the
// bottom (or a dialog centered in the screen) would sit under it. Padding the
// bottom by the keyboard's height lifts the surface above it and shrinks the
// room the height cap works from, so the scroll area gives way and the footer
// stays visible. Android resizes its window itself and the web has no
// on-screen keyboard to cover anything, so neither needs it.
export const resolveKeyboardAvoidingBehavior = (
  platform: string,
): 'padding' | undefined => {
  return platform === 'ios' ? 'padding' : undefined;
};

export const resolveModalSurfaceLayout = (
  placement: ModalSurfacePlacement,
  presentation: ModalSurfacePresentation = 'default',
): ModalSurfaceLayout => {
  if (presentation === 'side-sheet') {
    return { alignItems: 'flex-end', justifyContent: 'flex-start', padding: 0 };
  }

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

/** The size of a side sheet: a fixed width and the whole height. */
export const resolveSideSheetSurfaceStyle = (): ViewStyle => {
  return { height: '100%', maxWidth: '100%', width: SIDE_SHEET_WIDTH };
};
