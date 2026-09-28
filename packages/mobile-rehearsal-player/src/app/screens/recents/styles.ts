import { StyleSheet } from 'react-native';

import { appTheme } from '../../utils/theme';

const { colors, space } = appTheme;

// Screen 1a: sections sit directly on the ground as a section head over
// flat rows or chips, separated by a faded rule; no cards.
export const recentsScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  destinationHeader: {
    marginTop: 12,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    gap: space.xs,
    paddingTop: space.lg,
    paddingBottom: space.xl,
  },
  sectionHead: {
    minHeight: space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    ...appTheme.type.sectionHead,
    color: colors.text,
  },
  sectionCount: {
    ...appTheme.type.rowMeta,
    fontVariant: [...appTheme.tabularNumbers],
  },
  sectionBody: {
    ...appTheme.type.body,
    color: colors.textMuted,
    lineHeight: 20,
  },
  sectionMeta: {
    ...appTheme.type.rowMeta,
  },
  sectionRule: {
    marginVertical: space.lg,
  },
  seeAllAction: {
    minHeight: space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    paddingLeft: space.sm,
  },
  seeAllActionPressed: {
    opacity: 0.75,
  },
  seeAllLabel: {
    color: colors.accentText,
    fontSize: 13,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingTop: space.xs,
  },
});
