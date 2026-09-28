import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

const { colors, space } = appTheme;

const LEADING_GLYPH_SLOT = 20;
const ACTIVE_MARK_WIDTH = 2;
const ACTIVE_MARK_HEIGHT = 16;
const BREADCRUMB_FONT_SIZE = 11.5;

// Explorer anatomy from screen 1b: a 44pt outlined back button beside a
// kicker-over-title folder block, a plain-text breadcrumb trail, and flat
// rows divided by hairlines — no card per row and no card around the list.
export const explorerStyles = StyleSheet.create({
  backButton: {
    width: space.touchTarget,
    height: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderButton,
    borderRadius: appTheme.radius.md,
  },
  backButtonDisabled: {
    opacity: 0.4,
  },
  breadcrumbContent: {
    alignItems: 'center',
    paddingRight: space.xxs,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbLabel: {
    color: colors.accentText,
    fontSize: BREADCRUMB_FONT_SIZE,
  },
  breadcrumbLabelCurrent: {
    color: colors.text,
    fontSize: BREADCRUMB_FONT_SIZE,
  },
  // Visually a line of text; the segment keeps a 44pt tap height.
  breadcrumbSegment: {
    minHeight: space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.xxs,
  },
  breadcrumbSeparator: {
    color: colors.textMuted,
    fontSize: BREADCRUMB_FONT_SIZE,
    paddingHorizontal: space.xxs,
  },
  listSurface: {},
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  navigationAction: {
    minHeight: space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.xxs,
  },
  navigationActionLabel: {
    ...appTheme.type.button,
    color: colors.accentText,
  },
  navigationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  navigationEyebrow: {
    ...appTheme.type.kicker,
    color: colors.textMuted,
  },
  navigationTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
  },
  row: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 11,
  },
  rowActiveMark: {
    position: 'absolute',
    left: -space.sm,
    top: '50%',
    width: ACTIVE_MARK_WIDTH,
    height: ACTIVE_MARK_HEIGHT,
    marginTop: -ACTIVE_MARK_HEIGHT / 2,
    borderRadius: ACTIVE_MARK_WIDTH,
    backgroundColor: colors.accent,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowDisabled: {
    opacity: 0.6,
  },
  rowLeadingIcon: {
    width: LEADING_GLYPH_SLOT,
    alignItems: 'center',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: colors.hairline,
  },
});
