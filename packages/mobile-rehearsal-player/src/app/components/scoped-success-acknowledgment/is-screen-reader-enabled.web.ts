// react-native-web answers `true` to `AccessibilityInfo.isScreenReaderEnabled()`
// unconditionally (a browser cannot tell), which switched auto-dismiss off for
// every web visitor. Report `false` instead: a keyboard or screen-reader user
// who moves focus onto the card still pauses the timer through its
// focus / blur handling in `useScopedSuccessAcknowledgment`.
export const isScreenReaderEnabled = () => Promise.resolve(false);
