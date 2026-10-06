import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { RowMetaLine } from '../../../components/row-meta-line';
import { appTheme } from '../../../utils/theme';
import { ExplorerListRow } from '../../components/explorer/index';
import { OptionsMenuSheet } from '../../components/options-menu-sheet';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import {
  resolveDriveLibrarySourceActionPlacement,
  type DriveLibrarySourceAction,
} from '../utils/drive-library-source-actions';
import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import {
  DRIVE_ROW_LEADING_GLYPH_SIZE,
  DRIVE_ROW_PILL_HIT_SLOP,
  DRIVE_ROW_TITLE_LINES,
  driveExplorerListStyles as styles,
} from './drive-explorer-list-styles';
import type { ExplorerRowSelection } from '../../components/explorer/model';
import { getDriveRowSavePillAppearance } from './drive-row-save-pill-model';

// A full, untruncated file name in the options sheet title, so long Drive
// names stay readable even though the row title stops at two lines.
const FULL_TITLE_NUMBER_OF_LINES = 0;

type DriveExplorerSourceRowProps = {
  getActions: (source: DriveLibrarySource) => DriveLibrarySourceAction[] | null;
  getMessage: (source: DriveLibrarySource) => string | undefined;
  highlightQuery?: string | null;
  metadataLabels: string[];
  selection?: ExplorerRowSelection;
  source: DriveLibrarySource;
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

const getLeadingGlyph = (isPlayable: boolean) => {
  return {
    color: appTheme.colors.icon,
    name: isPlayable
      ? ('music-note-outline' as const)
      : ('file-outline' as const),
  };
};

const PILL_CHECK_ICON_SIZE = 13;

const DriveRowSavePill = ({ action }: { action: DriveLibrarySourceAction }) => {
  const appearance = getDriveRowSavePillAppearance(action);
  const isAccent = appearance.tone === 'accent';
  const labelColor = isAccent
    ? appTheme.colors.accentText
    : appTheme.colors.textSecondary;

  return (
    <Pressable
      accessibilityHint={action.accessibilityHint}
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityRole="button"
      {...interactionGuardProps}
      disabled={action.disabled}
      hitSlop={DRIVE_ROW_PILL_HIT_SLOP}
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.pill,
        isAccent ? styles.pillAccent : styles.pillNeutral,
        buttonInteractionGuardStyle,
        pressed && !action.disabled ? styles.pillPressed : undefined,
        action.disabled ? styles.pillDisabled : undefined,
      ]}
    >
      {appearance.showsCheck ? (
        <AppIcon color={labelColor} name="check" size={PILL_CHECK_ICON_SIZE} />
      ) : null}
      <Text numberOfLines={1} style={[styles.pillLabel, { color: labelColor }]}>
        {action.label}
      </Text>
    </Pressable>
  );
};

// An Add audio row (screen 1e): glyph, a title that wraps to two lines before
// ellipsizing, the muted meta line, then an always-present trailing cluster —
// preview ring, a fixed-width Save / ✓ Saved toggle, and an overflow menu.
export const DriveExplorerSourceRow = ({
  getActions,
  getMessage,
  highlightQuery,
  metadataLabels,
  selection,
  source,
}: DriveExplorerSourceRowProps) => {
  const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
  const isSelectionMode = selection?.isActive ?? false;
  const isSelected = isSelectionMode && selection?.isSelected;
  const isPlayable = source.availability.status === 'available';
  const actions = useMemo(() => {
    return isSelectionMode ? [] : (getActions(source) ?? []);
  }, [getActions, isSelectionMode, source]);
  const inlineActions = actions.filter((action) => {
    return resolveDriveLibrarySourceActionPlacement(action) === 'inline';
  });
  const menuActions = actions.filter((action) => {
    return resolveDriveLibrarySourceActionPlacement(action) === 'menu';
  });
  const playbackAction = inlineActions.find((action) => {
    return action.iconName !== undefined;
  });
  const saveAction = inlineActions.find((action) => {
    return action.iconName === undefined;
  });
  const externalMessage = isPlayable ? getMessage(source) : undefined;
  const metadataLabel = metadataLabels.join(' · ');
  const leadingGlyph = getLeadingGlyph(isPlayable);

  return (
    <>
      <ExplorerListRow
        actions={
          playbackAction || saveAction ? (
            <View style={styles.trailingActions}>
              {playbackAction?.iconName ? (
                <CompactPlaybackAction
                  accessibilityLabel={
                    playbackAction.accessibilityLabel ?? playbackAction.label
                  }
                  disabled={playbackAction.disabled}
                  iconName={playbackAction.iconName}
                  onPress={playbackAction.onPress}
                  variant="row"
                />
              ) : null}
              {saveAction ? <DriveRowSavePill action={saveAction} /> : null}
            </View>
          ) : null
        }
        disabled={!isPlayable && !isSelectionMode}
        leadingIcon={
          <AppIcon
            color={leadingGlyph.color}
            name={leadingGlyph.name}
            size={DRIVE_ROW_LEADING_GLYPH_SIZE}
          />
        }
        message={
          externalMessage ? (
            <Text numberOfLines={2} style={styles.sourceErrorMessage}>
              {externalMessage}
            </Text>
          ) : null
        }
        metadata={metadataLabel ? <RowMetaLine text={metadataLabel} /> : null}
        onPress={
          playbackAction && !playbackAction.disabled
            ? playbackAction.onPress
            : undefined
        }
        overflowTrigger={
          menuActions.length > 0 ? (
            <OverflowMenuTrigger
              accessibilityLabel={`${source.name} options`}
              onPress={() => {
                setIsOptionsMenuVisible(true);
              }}
              style={styles.rowOverflowTrigger}
            />
          ) : null
        }
        selection={selection}
        title={
          <SearchHighlightedText
            numberOfLines={DRIVE_ROW_TITLE_LINES}
            query={highlightQuery ?? null}
            style={[styles.rowTitle, isSelected && styles.rowTitleSelected]}
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
        titleNumberOfLines={FULL_TITLE_NUMBER_OF_LINES}
      />
    </>
  );
};
