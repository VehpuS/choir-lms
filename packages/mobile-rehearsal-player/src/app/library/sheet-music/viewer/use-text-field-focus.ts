/**
 * Whether a text field has focus. Only the web has a soft keyboard that
 * resizes the window under the viewer; the web file (`.web.ts`) answers it.
 */
export const useIsTextFieldFocused = (): boolean => false;
