import type { DriveAuthorizationState } from '@org/google-drive';
import { StyleSheet, View } from 'react-native';

import type { DriveAuthorizationStatusCopy } from '../../utils/authorization';
import { DriveSessionMenuPanel } from './drive-session-menu-panel';
import { DriveSessionMenuTrigger } from './drive-session-menu-trigger';

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