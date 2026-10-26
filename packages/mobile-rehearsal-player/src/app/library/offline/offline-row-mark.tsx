import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../components/app-icon';
import { appTheme } from '../../utils/theme';
import { DOWNLOADING_OFFLINE_LABEL } from '../components/saved-item-menu/saved-item-requests';
import type { OfflineState } from './offline-state-store';

const MARK_ICON_SIZE = 14;
export const KEPT_OFFLINE_ACCESSIBILITY_LABEL = 'Kept offline';

/** What a row's meta line says about the file's offline copy, if anything. */
export const OfflineRowMarkView = ({ state }: { state: OfflineState }) => {
  if (state === 'kept') {
    return (
      <View
        accessibilityLabel={KEPT_OFFLINE_ACCESSIBILITY_LABEL}
        accessible
        style={styles.mark}
      >
        <AppIcon
          color={appTheme.colors.accentText}
          name="offline-kept"
          size={MARK_ICON_SIZE}
        />
      </View>
    );
  }

  if (state === 'downloading') {
    return <Text style={styles.text}>{DOWNLOADING_OFFLINE_LABEL}</Text>;
  }

  return null;
};

/**
 * The `leading` content for a row's meta line, or undefined when the file
 * has no mark (a meta line adds its separator for any leading content).
 */
export const resolveOfflineRowLeading = (state: OfflineState) => {
  return state === 'kept' || state === 'downloading' ? (
    <OfflineRowMarkView state={state} />
  ) : undefined;
};

const styles = StyleSheet.create({
  mark: {
    // Sits on the meta line's text baseline.
    transform: [{ translateY: 2 }],
  },
  text: {
    color: appTheme.colors.accentText,
    fontSize: 13,
  },
});
