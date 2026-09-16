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
  getSourceStatusMessage,
  type DriveLibraryFolder,
  type DriveLibrarySource,
} from '../utils/drive-library-view-model';

import type { DriveDiscoveryExplorerRow } from './drive-discovery-panel-model';
import { DriveExplorerFolderRow } from './drive-explorer-folder-row';
import { driveExplorerListStyles as styles } from './drive-explorer-list-styles';
import { getDriveExplorerRowSelectionState } from './drive-explorer-row-model';
import {
  DRIVE_LIBRARY_SOURCE_PRIMARY_TEXT,
  driveLibrarySourceGroupStyles as sourceGroupStyles,
} from './drive-library-source-group-styles';

type DriveExplorerListProps = {
  getActions: (source: DriveLibrarySource) => DriveLibrarySourceAction[] | null;
  getMessage: (source: DriveLibrarySource) => string | undefined;
  highlightQuery?: string | null;
  isSelectionMode?: boolean;
  onOpenFolder: (folder: DriveLibraryFolder) => void;
  onToggleSelection?: (row: DriveDiscoveryExplorerRow) => void;
  rows: DriveDiscoveryExplorerRow[];
  selectedResultIds?: ReadonlySet<string>;
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
  return tone === 'primary'
    ? ('primary' as const)
    : tone === 'destructive'
      ? ('destructive' as const)
      : ('secondary' as const);
};

const DriveExplorerSourceRow = ({
  getActions,
  getMessage,
  highlightQuery,
  isSelected,
  onToggleSelection,
  metadataLabels,
  source,
}: {
  getActions: DriveExplorerListProps['getActions'];
  getMessage: DriveExplorerListProps['getMessage'];
  highlightQuery?: string | null;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  metadataLabels: string[];
  source: DriveLibrarySource;
}) => {
  const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
  const isPlayable = source.availability.status === 'available';
  const actions = useMemo(() => {
    if (!isPlayable || onToggleSelection) {
      return [];
    }

    return getActions(source) ?? [];
  }, [getActions, isPlayable, onToggleSelection, source]);
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
  const metadataLabel = metadataLabels.join(' • ');

  return (
    <>
      <ExplorerListRow
        active={isSelected}
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
        disabled={!isPlayable && !onToggleSelection}
        leadingIcon={
          <MaterialCommunityIcons
            color={appTheme.colors.secondaryText}
            name={
              isSelected === undefined
                ? 'music-note-outline'
                : isSelected
                  ? 'check-circle'
                  : 'circle-outline'
            }
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
          onToggleSelection ??
          (primaryPlaybackAction && !primaryPlaybackAction.disabled
            ? primaryPlaybackAction.onPress
            : undefined)
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
        selected={isSelected}
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
  isSelectionMode = false,
  onOpenFolder,
  onToggleSelection,
  rows,
  selectedResultIds,
}: DriveExplorerListProps) => {
  return (
    <ExplorerListSurface>
      {rows.map((row) => {
        const isSelected = getDriveExplorerRowSelectionState({
          isSelectionMode,
          row,
          selectedResultIds,
        });
        const onSelect =
          isSelectionMode && onToggleSelection
            ? () => onToggleSelection(row)
            : undefined;

        if (row.kind === 'folder') {
          return (
            <DriveExplorerFolderRow
              folder={row.folder}
              highlightQuery={row.highlightQuery}
              isSelected={isSelected}
              key={row.key}
              metadataLabels={row.metadataLabels}
              onOpenFolder={onSelect ?? onOpenFolder}
            />
          );
        }

        return (
          <DriveExplorerSourceRow
            getActions={getActions}
            getMessage={getMessage}
            highlightQuery={row.highlightQuery ?? highlightQuery}
            isSelected={isSelected}
            key={row.key}
            metadataLabels={row.metadataLabels}
            onToggleSelection={onSelect}
            source={row.source}
          />
        );
      })}
    </ExplorerListSurface>
  );
};
