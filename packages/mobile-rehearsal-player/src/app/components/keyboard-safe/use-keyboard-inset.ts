/**
 * How tall the soft keyboard is over the bottom of the window. Native iOS and
 * Android handle the keyboard themselves (`KeyboardAvoidingView`, the window
 * resizing), so there is nothing to add; the web version is
 * `use-keyboard-inset.web.ts`.
 */
export const useKeyboardInset = (): number => 0;
