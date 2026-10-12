import { AccessibilityInfo } from 'react-native';

// Whether a screen reader is running, so a success card is not auto-dismissed
// out from under someone listening to it.
export const isScreenReaderEnabled = () =>
  AccessibilityInfo.isScreenReaderEnabled();
