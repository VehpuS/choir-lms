import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../../../utils/theme';
import { explorerStyles as styles } from './styles';

export type ExplorerBreadcrumbItem = {
  isCurrent?: boolean;
  key: string;
  label: string;
  onPress?: () => void;
};

type ExplorerBreadcrumbBarProps = {
  items: ExplorerBreadcrumbItem[];
};

type ExplorerListRowProps = {
  actions?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  leadingIcon: ReactNode;
  message?: ReactNode;
  metadata?: ReactNode;
  onPress?: () => void;
  overflowTrigger?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: ReactNode;
};

type ExplorerListSurfaceProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

type ExplorerNavigationBarProps = {
  canGoBack: boolean;
  eyebrow: string;
  onGoBack: () => void;
  title: string;
};

export const ExplorerNavigationBar = ({
  canGoBack,
  eyebrow,
  onGoBack,
  title,
}: ExplorerNavigationBarProps) => {
  return (
    <View style={styles.navigationBar}>
      <Pressable
        accessibilityLabel={
          canGoBack ? 'Go to parent folder' : 'Already at root'
        }
        accessibilityRole="button"
        disabled={!canGoBack}
        onPress={onGoBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && canGoBack ? styles.rowPressed : undefined,
          !canGoBack ? styles.backButtonDisabled : undefined,
        ]}
      >
        <MaterialCommunityIcons
          color={appTheme.colors.primaryText}
          name="chevron-left"
          size={22}
        />
      </Pressable>
      <View style={styles.navigationCopy}>
        <Text numberOfLines={1} style={styles.navigationEyebrow}>
          {eyebrow}
        </Text>
        <Text numberOfLines={1} style={styles.navigationTitle}>
          {title}
        </Text>
      </View>
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
      style={styles.breadcrumbBar}
    >
      {items.map((item, index) => {
        const isCurrent = item.isCurrent ?? index === items.length - 1;

        return (
          <View key={item.key} style={styles.breadcrumbItem}>
            {index > 0 ? (
              <Text style={styles.breadcrumbSeparator}>/</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isCurrent || !item.onPress}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.breadcrumbChip,
                isCurrent ? styles.breadcrumbChipCurrent : undefined,
                pressed && !isCurrent ? styles.rowPressed : undefined,
              ]}
            >
              <Text
                numberOfLines={1}
                style={
                  isCurrent
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
  return <View style={[styles.listSurface, style]}>{children}</View>;
};

export const ExplorerListRow = ({
  actions,
  active = false,
  disabled = false,
  leadingIcon,
  message,
  metadata,
  onPress,
  overflowTrigger,
  style,
  title,
}: ExplorerListRowProps) => {
  const isInteractive = !disabled && onPress !== undefined;
  const hasTrailingControls =
    actions !== null ||
    actions !== undefined ||
    overflowTrigger !== null ||
    overflowTrigger !== undefined;

  const rowBody = (
    <>
      <View style={styles.rowLeadingIcon}>{leadingIcon}</View>
      <View style={styles.rowCopy}>
        {title}
        {metadata}
        {message}
      </View>
    </>
  );

  const rowSurfaceStyles = [
    styles.row,
    active ? styles.rowActive : undefined,
    disabled ? styles.rowDisabled : undefined,
    style,
  ];

  if (!hasTrailingControls) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={!isInteractive}
        onPress={onPress}
        style={({ pressed }) => [
          ...rowSurfaceStyles,
          pressed && isInteractive ? styles.rowPressed : undefined,
        ]}
      >
        {rowBody}
      </Pressable>
    );
  }

  return (
    <View style={rowSurfaceStyles}>
      <Pressable
        accessibilityRole="button"
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
