import type { DriveAuthorizationState } from '@org/google-drive';
import { StyleSheet, View } from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../../utils/authorization';
import { settingsNavigationStore } from '../../../../screens/settings/settings-navigation-store';
import { DriveSessionMenuPanel } from './drive-session-menu-panel';
import { DriveSessionMenuTrigger } from './drive-session-menu-trigger';
import { useEscapeToDismiss } from './use-escape-to-dismiss';

type DriveSessionMenuProps = {
  authState: DriveAuthorizationState;
  canClearAuthorization: boolean;
  canStartAuthorization: boolean;
  isBusy: boolean;
  isVisible: boolean;
  onClearAuthorization: () => void;
  onStartAuthorization: () => void;
  onToggleVisibility: () => void;
  requestReady: boolean;
  statusCopy: DriveAuthorizationStatusCopy;
};

export const DriveSessionMenu = ({
  authState,
  canClearAuthorization,
  canStartAuthorization,
  isBusy,
  isVisible,
  onClearAuthorization,
  onStartAuthorization,
  onToggleVisibility,
  requestReady,
  statusCopy,
}: DriveSessionMenuProps) => {
  useEscapeToDismiss(isVisible, onToggleVisibility);

  return (
    <View style={styles.container}>
      <DriveSessionMenuTrigger
        isVisible={isVisible}
        onToggleVisibility={onToggleVisibility}
        tone={statusCopy.tone}
      />

      {isVisible ? (
        <DriveSessionMenuPanel
          authState={authState}
          canClearAuthorization={canClearAuthorization}
          canStartAuthorization={canStartAuthorization}
          isBusy={isBusy}
          onClearAuthorization={onClearAuthorization}
          onOpenSettings={() => {
            // The menu is open, so toggling closes it before Settings shows.
            onToggleVisibility();
            settingsNavigationStore.open();
          }}
          onStartAuthorization={onStartAuthorization}
          requestReady={requestReady}
          statusCopy={statusCopy}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 30,
  },
});
