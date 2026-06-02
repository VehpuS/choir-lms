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
import {
  resolveDriveLibrarySourceActionPlacement,
  type DriveLibrarySourceAction,
} from '../utils/drive-library-source-actions';
import { OptionsMenuSheet } from './OptionsMenuSheet';
import { SearchHighlightedText } from './SearchHighlightedText';
import {
  DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
  driveLibrarySourceGroupStyles as styles,
} from './drive-library-source-group-styles';

type DriveLibrarySourceGroupProps = {
  getAction?: (source: DriveLibrarySource) => DriveLibrarySourceAction | null;
  getActions?: (
    source: DriveLibrarySource,
  ) => DriveLibrarySourceAction[] | null;
  getMessage?: (source: DriveLibrarySource) => string | undefined;
  highlightQuery?: string | null;
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
  highlightQuery,
  source,
}: {
  getAction?: DriveLibrarySourceGroupProps['getAction'];
  getActions?: DriveLibrarySourceGroupProps['getActions'];
  getMessage?: DriveLibrarySourceGroupProps['getMessage'];
  highlightQuery?: string | null;
  source: DriveLibrarySource;
}) => {
  const singleAction = getAction?.(source) ?? null;
  const actions = getActions?.(source) ?? (singleAction ? [singleAction] : []);
  const inlineActions = useMemo(() => {
    return actions.filter((action) => {
      return resolveDriveLibrarySourceActionPlacement(action) === 'inline';
    });
  }, [actions]);
  const menuActions = useMemo(() => {
    return actions.filter((action) => {
      return resolveDriveLibrarySourceActionPlacement(action) === 'menu';
    });
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
        <SearchHighlightedText
          query={highlightQuery ?? null}
          style={styles.sourceName}
          text={source.name}
        />
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
              if (action.iconName) {
                return (
                  <Pressable
                    accessibilityLabel={
                      action.accessibilityLabel ?? action.label
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: action.disabled,
                    }}
                    disabled={action.disabled}
                    key={`${source.id}:${action.accessibilityLabel ?? action.label}:${index}`}
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      styles.iconButton,
                      pressed && !action.disabled
                        ? styles.actionButtonPressed
                        : undefined,
                      action.disabled ? styles.actionButtonDisabled : undefined,
                    ]}
                  >
                    <MaterialCommunityIcons
                      color={DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT}
                      name={action.iconName}
                      size={18}
                    />
                  </Pressable>
                );
              }

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
  highlightQuery,
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
              highlightQuery={highlightQuery}
              key={source.id}
              source={source}
            />
          );
        })}
      </View>
    </View>
  );
};
