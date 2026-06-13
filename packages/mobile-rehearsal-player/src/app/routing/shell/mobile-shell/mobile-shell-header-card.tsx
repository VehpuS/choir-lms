import { Text, View } from 'react-native';

import { DriveSessionMenu } from '../../../auth/google-drive/components/drive-session-menu';
import { useGoogleDriveAuthorization } from '../../../auth/google-drive/hooks/use-authorization';
import { styles } from '../mobile-shell-styles';

type MobileShellHeaderCardProps = {
  activeDestinationDescription: string;
  activeDestinationLabel: string;
  activeDestinationTitle: string;
  authorization: ReturnType<typeof useGoogleDriveAuthorization>;
  isSessionMenuVisible: boolean;
  onClearAuthorization: () => void;
  onStartAuthorization: () => void;
  onToggleSessionMenu: () => void;
};

export const MobileShellHeaderCard = ({
  activeDestinationDescription,
  activeDestinationLabel,
  activeDestinationTitle,
  authorization,
  isSessionMenuVisible,
  onClearAuthorization,
  onStartAuthorization,
  onToggleSessionMenu,
}: MobileShellHeaderCardProps) => {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerTopRow}>
        <Text style={styles.headerLabel} testID="active-destination-label">
          {activeDestinationLabel}
        </Text>
        <DriveSessionMenu
          authState={authorization.authState}
          canClearAuthorization={authorization.canClearAuthorization}
          canStartAuthorization={authorization.canStartAuthorization}
          isBusy={authorization.isBusy}
          isVisible={isSessionMenuVisible}
          onClearAuthorization={onClearAuthorization}
          onStartAuthorization={onStartAuthorization}
          onToggleVisibility={onToggleSessionMenu}
          requestReady={authorization.requestReady}
          statusCopy={authorization.statusCopy}
        />
      </View>
      <Text style={styles.headerTitle} testID="active-destination-title">
        {activeDestinationTitle}
      </Text>
      <Text style={styles.headerBody}>{activeDestinationDescription}</Text>
    </View>
  );
};
