import { MaterialCommunityIcons } from '@expo/vector-icons';
import { map } from 'es-toolkit/compat';
import { useMemo, useState } from 'react';
import { Pressable, Text } from 'react-native';

import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { appTheme } from '../../../utils/theme';
import {
  ExplorerListRow,
  ExplorerListSurface,
} from '../../components/explorer/index';
import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import {
  resolveDriveLibrarySourceActionPlacement,
  type DriveLibrarySourceAction,
} from '../utils/drive-library-source-actions';
import {
  getFolderMetadataLabels,
  getSourceMetadataLabels,
  getSourceStatusMessage,
  type DriveLibraryFolder,
  type DriveLibrarySource,
} from '../utils/drive-library-view-model';

import type { DriveDiscoveryExplorerRow } from './drive-discovery-panel-model';
import { driveExplorerListStyles as styles } from './drive-explorer-list-styles';
import {
  DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
  driveLibrarySourceGroupStyles as sourceGroupStyles,
} from './drive-library-source-group-styles';

type DriveExplorerListProps = {
  getActions: (source: DriveLibrarySource) => DriveLibrarySourceAction[] | null;
  getMessage: (source: DriveLibrarySource) => string | undefined;
  highlightQuery?: string | null;
  onOpenFolder: (folder: DriveLibraryFolder) => void;
  rows: DriveDiscoveryExplorerRow[];
};

const getActionButtonStyle = (action: DriveLibrarySourceAction) => {
  return action.tone === 'primary'
    ? sourceGroupStyles.actionButtonPrimary
    : sourceGroupStyles.actionButtonNeutral;
};

const getMenuActionLabel = (action: DriveLibrarySourceAction) => {
  if (action.label === '...' && action.accessibilityLabel) {
    return action.accessibilityLabel;
  }

  return action.label;
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

const DriveExplorerFolderRow = ({
  folder,
  onOpenFolder,
}: {
  folder: DriveLibraryFolder;
  onOpenFolder: (folder: DriveLibraryFolder) => void;
}) => {
  const metadataLabel = getFolderMetadataLabels(folder).join(' • ');
  return (
    <ExplorerListRow
      leadingIcon={
        <MaterialCommunityIcons
          color={appTheme.colors.secondaryText}
          name="folder-outline"
          size={22}
        />
      }
      metadata={
        metadataLabel ? (
          <Text numberOfLines={1} style={styles.folderMetadata}>
            {metadataLabel}
          </Text>
        ) : null
      }
      onPress={() => {
        onOpenFolder(folder);
      }}
      title={<Text style={styles.folderName}>{folder.name}</Text>}
    />
  );
};

const DriveExplorerSourceRow = ({
  getActions,
  getMessage,
  highlightQuery,
  source,
}: {
  getActions: DriveExplorerListProps['getActions'];
  getMessage: DriveExplorerListProps['getMessage'];
  highlightQuery?: string | null;
  source: DriveLibrarySource;
}) => {
  const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
  const isPlayable = source.availability.status === 'available';
  const actions = useMemo(() => {
    if (!isPlayable) {
      return [];
    }

    return getActions(source) ?? [];
  }, [getActions, isPlayable, source]);
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
  const primaryPlaybackAction = inlineActions.find((action) => {
    return action.iconName !== undefined;
  });
  const externalMessage = isPlayable ? getMessage(source) : undefined;
  const sourceMessage = externalMessage ?? getSourceStatusMessage(source);
  const metadataLabel = getSourceMetadataLabels(source, {
    includeUpdatedDate: Boolean(highlightQuery),
  }).join(' • ');

  return (
    <>
      <ExplorerListRow
        actions={map(inlineActions, (action, index) => {
          if (action.iconName) {
            return (
              <CompactPlaybackAction
                accessibilityLabel={action.accessibilityLabel ?? action.label}
                disabled={action.disabled}
                iconName={action.iconName}
                key={`${source.id}:${action.accessibilityLabel ?? action.label}:${index}`}
                onPress={action.onPress}
                variant="inline"
              />
            );
          }

          return (
            <Pressable
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              accessibilityRole="button"
              {...interactionGuardProps}
              disabled={action.disabled}
              key={`${source.id}:${action.accessibilityLabel ?? action.label}:${index}`}
              onPress={action.onPress}
              style={({ pressed }) => [
                sourceGroupStyles.actionButton,
                getActionButtonStyle(action),
                buttonInteractionGuardStyle,
                pressed && !action.disabled
                  ? sourceGroupStyles.actionButtonPressed
                  : undefined,
                action.disabled
                  ? sourceGroupStyles.actionButtonDisabled
                  : undefined,
              ]}
            >
              <Text
                style={[
                  sourceGroupStyles.actionButtonLabel,
                  action.tone === 'primary'
                    ? sourceGroupStyles.actionButtonPrimaryLabel
                    : sourceGroupStyles.actionButtonNeutralLabel,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          );
        })}
        disabled={!isPlayable}
        leadingIcon={
          <MaterialCommunityIcons
            color={appTheme.colors.secondaryText}
            name="music-note-outline"
            size={22}
          />
        }
        message={
          sourceMessage ? (
            <Text
              numberOfLines={2}
              style={
                externalMessage
                  ? styles.sourceErrorMessage
                  : styles.sourceMessage
              }
            >
              {sourceMessage}
            </Text>
          ) : null
        }
        metadata={
          metadataLabel ? (
            <Text numberOfLines={1} style={styles.sourceMetadata}>
              {metadataLabel}
            </Text>
          ) : null
        }
        onPress={
          primaryPlaybackAction && !primaryPlaybackAction.disabled
            ? primaryPlaybackAction.onPress
            : undefined
        }
        overflowTrigger={
          menuActions.length > 0 ? (
            <OverflowMenuTrigger
              accessibilityLabel="Source options"
              iconColor={DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT}
              onPress={() => {
                setIsOptionsMenuVisible(true);
              }}
              style={styles.rowOverflowTrigger}
            />
          ) : null
        }
        title={
          <SearchHighlightedText
            query={highlightQuery ?? null}
            style={styles.sourceName}
            text={source.name}
          />
        }
      />
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
    </>
  );
};

export const DriveExplorerList = ({
  getActions,
  getMessage,
  highlightQuery,
  onOpenFolder,
  rows,
}: DriveExplorerListProps) => {
  return (
    <ExplorerListSurface>
      {rows.map((row) => {
        if (row.kind === 'folder') {
          return (
            <DriveExplorerFolderRow
              folder={row.folder}
              key={row.key}
              onOpenFolder={onOpenFolder}
            />
          );
        }

        return (
          <DriveExplorerSourceRow
            getActions={getActions}
            getMessage={getMessage}
            highlightQuery={highlightQuery}
            key={row.key}
            source={row.source}
          />
        );
      })}
    </ExplorerListSurface>
  );
};
