import { Children, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { OutlinedActionButton } from '../../../components/outlined-action-button';
import { appTheme } from '../../../utils/theme';
import {
  getExplorerBackAccessibilityLabel,
  hasExplorerTrailingControls,
  interleaveExplorerRowSeparators,
  resolveExplorerBreadcrumbItems,
  resolveExplorerRowSelection,
  type ExplorerBreadcrumbItem,
  type ExplorerRowSelection,
} from './model';
import { explorerStyles as styles } from './styles';

const SELECTION_GLYPH_SIZE = 20;

type ExplorerBreadcrumbBarProps = {
  items: ExplorerBreadcrumbItem[];
};

type ExplorerListRowProps = {
  accessibilityLabel?: string;
  actions?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  leadingIcon: ReactNode;
  message?: ReactNode;
  metadata?: ReactNode;
  onPress?: () => void;
  overflowTrigger?: ReactNode;
  /** Multiple-selection wiring; rows without it are not selectable. */
  selection?: ExplorerRowSelection;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  title: ReactNode;
  /** Non-interactive mark after the copy, inside the row's tap target (a folder chevron). */
  trailingAccessory?: ReactNode;
};

type ExplorerListSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

type ExplorerNavigationBarProps = {
  actionLabel?: string;
  canGoBack: boolean;
  eyebrow: string;
  onAction?: () => void;
  onGoBack: () => void;
  title: string;
};

export const ExplorerNavigationBar = ({
  actionLabel,
  canGoBack,
  eyebrow,
  onAction,
  onGoBack,
  title,
}: ExplorerNavigationBarProps) => {
  return (
    <View style={styles.navigationBar}>
      <Pressable
        accessibilityLabel={getExplorerBackAccessibilityLabel(canGoBack)}
        accessibilityRole="button"
        disabled={!canGoBack}
        onPress={onGoBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && canGoBack ? styles.rowPressed : undefined,
          !canGoBack ? styles.backButtonDisabled : undefined,
        ]}
      >
        <AppIcon color={appTheme.colors.text} name="chevron-left" size={20} />
      </Pressable>
      <View style={styles.navigationCopy}>
        <Text numberOfLines={1} style={styles.navigationEyebrow}>
          {eyebrow}
        </Text>
        <Text numberOfLines={1} style={styles.navigationTitle}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        // A secondary header action (e.g. Drive's `Search results` return),
        // outlined in neutral so it reads apart from the back button's
        // parent-folder navigation without competing with primary actions.
        <OutlinedActionButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
};

export const ExplorerBreadcrumbBar = ({
  items,
}: ExplorerBreadcrumbBarProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.breadcrumbContent}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {resolveExplorerBreadcrumbItems(items).map((item, index) => {
        return (
          <View key={item.key} style={styles.breadcrumbItem}>
            {index > 0 ? (
              <Text style={styles.breadcrumbSeparator}>/</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={item.isDisabled}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.breadcrumbSegment,
                pressed && !item.isCurrent ? styles.rowPressed : undefined,
              ]}
            >
              <Text
                numberOfLines={1}
                style={
                  item.isCurrent
                    ? styles.breadcrumbLabelCurrent
                    : styles.breadcrumbLabel
                }
              >
                {item.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
};

export const ExplorerListSurface = ({
  children,
  style,
}: ExplorerListSurfaceProps) => {
  const rows = interleaveExplorerRowSeparators(
    Children.toArray(children),
    (index) => {
      return <View key={`separator-${index}`} style={styles.rowSeparator} />;
    },
  );

  return <View style={[styles.listSurface, style]}>{rows}</View>;
};

export const ExplorerListRow = ({
  accessibilityLabel,
  actions,
  active = false,
  disabled = false,
  leadingIcon,
  message,
  metadata,
  onPress: onRowPress,
  overflowTrigger,
  selected,
  selection,
  style,
  title,
  trailingAccessory,
}: ExplorerListRowProps) => {
  const resolvedSelection = resolveExplorerRowSelection(selection, onRowPress);
  const { onLongPress, onPress, role: pressableRole } = resolvedSelection;
  const isInteractive = !disabled && onPress !== undefined;
  const hasTrailingControls =
    !resolvedSelection.hidesTrailingControls &&
    hasExplorerTrailingControls(actions, overflowTrigger);
  const isSelected = resolvedSelection.glyph
    ? resolvedSelection.isMarked
    : selected;
  const selectionProps = {
    accessibilityRole: pressableRole,
    accessibilityState:
      isSelected === undefined ? undefined : { selected: isSelected },
    'aria-checked': resolvedSelection.ariaChecked,
    onLongPress: disabled ? undefined : onLongPress,
  };

  const rowBody = (
    <>
      <View style={styles.rowLeadingIcon}>
        {resolvedSelection.glyph ? (
          <AppIcon
            color={resolvedSelection.glyph.color}
            name={resolvedSelection.glyph.name}
            size={SELECTION_GLYPH_SIZE}
          />
        ) : (
          leadingIcon
        )}
      </View>
      <View style={styles.rowCopy}>
        {title}
        {metadata}
        {message}
      </View>
      {trailingAccessory}
    </>
  );

  const rowSurfaceStyles = [
    styles.row,
    disabled ? styles.rowDisabled : undefined,
    style,
  ];
  // Active rows are marked by a short accent line, never a background fill.
  const activeMark =
    active || resolvedSelection.isMarked ? (
      <View style={styles.rowActiveMark} />
    ) : null;

  if (!hasTrailingControls) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        {...selectionProps}
        disabled={!isInteractive}
        onPress={onPress}
        style={({ pressed }) => [
          ...rowSurfaceStyles,
          pressed && isInteractive ? styles.rowPressed : undefined,
        ]}
      >
        {activeMark}
        {rowBody}
      </Pressable>
    );
  }

  return (
    <View style={rowSurfaceStyles}>
      {activeMark}
      <Pressable
        accessibilityLabel={accessibilityLabel}
        {...selectionProps}
        disabled={!isInteractive}
        onPress={onPress}
        style={({ pressed }) => [
          styles.rowMainPressable,
          pressed && isInteractive ? styles.rowPressed : undefined,
        ]}
      >
        {rowBody}
      </Pressable>
      <View style={styles.rowActions}>
        {actions}
        {overflowTrigger}
      </View>
    </View>
  );
};
