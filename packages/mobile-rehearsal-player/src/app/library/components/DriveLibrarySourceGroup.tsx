import { MaterialCommunityIcons } from '@expo/vector-icons';
import { map } from 'es-toolkit/compat';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  getSourceAvailabilityLabel,
  getSourceMetadataLabels,
  getSourceStatusMessage,
  type DriveLibrarySource,
} from '../utils/drive-library-view-model';
import { OptionsMenuSheet } from './OptionsMenuSheet';
import {
  DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
  driveLibrarySourceGroupStyles as styles,
} from './drive-library-source-group-styles';

export type DriveLibrarySourceAction = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: 'destructive' | 'neutral' | 'primary';
  variant?: 'button' | 'icon' | 'menu';
};

type DriveLibrarySourceGroupProps = {
  getAction?: (source: DriveLibrarySource) => DriveLibrarySourceAction | null;
  getActions?: (
    source: DriveLibrarySource,
  ) => DriveLibrarySourceAction[] | null;
  getMessage?: (source: DriveLibrarySource) => string | undefined;
  sources: DriveLibrarySource[];
  title: string;
};

const getActionButtonStyle = (action: DriveLibrarySourceAction) => {
  return action.tone === 'primary'
    ? styles.actionButtonPrimary
    : styles.actionButtonNeutral;
};

const getActionButtonLabelStyle = (action: DriveLibrarySourceAction) => {
  return action.tone === 'primary'
    ? styles.actionButtonPrimaryLabel
    : styles.actionButtonNeutralLabel;
};

const getMenuTone = (tone: DriveLibrarySourceAction['tone']) => {
  if (tone === 'primary') {
    return 'primary' as const;
  }

  if (tone === 'destructive') {
    return 'destructive' as const;
  }

  return 'secondary' as const;
};

const REMOVE_LABEL_MATCHER = /^remove/i;

const isMenuAction = (action: DriveLibrarySourceAction) => {
  return (
    action.variant === 'menu' ||
    action.variant === 'icon' ||
    action.tone === 'destructive' ||
    REMOVE_LABEL_MATCHER.test(action.label)
  );
};

const getMenuActionLabel = (action: DriveLibrarySourceAction) => {
  if (action.label === '...' && action.accessibilityLabel) {
    return action.accessibilityLabel;
  }

  return action.label;
};

const getAvailabilityBadgeStyle = (source: DriveLibrarySource) => {
  if (source.availability.status === 'available') {
    return styles.badgeReady;
  }

  if (source.availability.status === 'unsupported') {
    return styles.badgeWarning;
  }

  return styles.badgeError;
};

const getAvailabilityLabelStyle = (source: DriveLibrarySource) => {
  if (source.availability.status === 'available') {
    return styles.badgeReadyLabel;
  }

  if (source.availability.status === 'unsupported') {
    return styles.badgeWarningLabel;
  }

  return styles.badgeErrorLabel;
};

const DriveLibrarySourceCard = ({
  getAction,
  getActions,
  getMessage,
  source,
}: {
  getAction?: DriveLibrarySourceGroupProps['getAction'];
  getActions?: DriveLibrarySourceGroupProps['getActions'];
  getMessage?: DriveLibrarySourceGroupProps['getMessage'];
  source: DriveLibrarySource;
}) => {
  const singleAction = getAction?.(source) ?? null;
  const actions = getActions?.(source) ?? (singleAction ? [singleAction] : []);
  const inlineActions = useMemo(() => {
    return actions.filter((action) => !isMenuAction(action));
  }, [actions]);
  const menuActions = useMemo(() => {
    return actions.filter((action) => isMenuAction(action));
  }, [actions]);
  const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);

  const externalMessage = getMessage?.(source);
  const metadataLabel = getSourceMetadataLabels(source).join(' • ');
  const statusMessage = externalMessage ?? getSourceStatusMessage(source);
  const isErrorMessage = externalMessage !== undefined;

  return (
    <View style={styles.sourceCard}>
      {menuActions.length > 0 ? (
        <Pressable
          accessibilityLabel="Source options"
          accessibilityRole="button"
          onPress={() => {
            setIsOptionsMenuVisible(true);
          }}
          style={({ pressed }) => [
            styles.iconButton,
            styles.topRightMenuButton,
            pressed ? styles.actionButtonPressed : undefined,
          ]}
        >
          <MaterialCommunityIcons
            color={DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT}
            name="dots-vertical"
            size={18}
          />
        </Pressable>
      ) : null}
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceName}>{source.name}</Text>
        <View style={styles.sourceControls}>
          <View style={[styles.badge, getAvailabilityBadgeStyle(source)]}>
            <Text
              style={[styles.badgeLabel, getAvailabilityLabelStyle(source)]}
            >
              {getSourceAvailabilityLabel(source)}
            </Text>
          </View>
          {inlineActions.map(
            (action: DriveLibrarySourceAction, index: number) => {
              return (
                <Pressable
                  accessibilityLabel={action.accessibilityLabel ?? action.label}
                  accessibilityRole="button"
                  disabled={action.disabled}
                  key={`${source.id}:${action.accessibilityLabel ?? action.label}:${index}`}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    styles.actionButton,
                    getActionButtonStyle(action),
                    pressed && !action.disabled
                      ? styles.actionButtonPressed
                      : undefined,
                    action.disabled ? styles.actionButtonDisabled : undefined,
                  ]}
                >
                  <Text
                    style={[
                      styles.actionButtonLabel,
                      getActionButtonLabelStyle(action),
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            },
          )}
        </View>
      </View>
      <Text style={styles.sourceMetadata}>{metadataLabel}</Text>
      {statusMessage ? (
        <Text
          style={
            isErrorMessage ? styles.sourceErrorMessage : styles.sourceMessage
          }
        >
          {statusMessage}
        </Text>
      ) : null}
      <OptionsMenuSheet
        actions={menuActions.map((action, index) => {
          return {
            disabled: action.disabled,
            id: `${source.id}:${action.accessibilityLabel ?? action.label}:${index}`,
            label: getMenuActionLabel(action),
            onPress: () => {
              setIsOptionsMenuVisible(false);
              action.onPress();
            },
            tone: getMenuTone(action.tone),
          };
        })}
        isVisible={isOptionsMenuVisible}
        onClose={() => {
          setIsOptionsMenuVisible(false);
        }}
        title={source.name}
      />
    </View>
  );
};

export const DriveLibrarySourceGroup = ({
  getAction,
  getActions,
  getMessage,
  sources,
  title,
}: DriveLibrarySourceGroupProps) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.groupItems}>
        {map(sources, (source) => {
          return (
            <DriveLibrarySourceCard
              getAction={getAction}
              getActions={getActions}
              getMessage={getMessage}
              key={source.id}
              source={source}
            />
          );
        })}
      </View>
    </View>
  );
};
