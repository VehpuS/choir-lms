import { StyleSheet } from 'react-native';

import { appTheme } from '../../utils/theme';

const { colors, fontFamily, fontWeight, space, type } = appTheme;

// Screen 1h: the Up Next sheet. Its frame, grabber, and header come from the
// now-playing styles so the two sheets read as one family.
const POSITION_NUMBER_SIZE = 13;
const EQUALIZER_SLOT_SIZE = 20;
const FOOTER_BOTTOM_INSET = space.xl;

export const queueStyles = StyleSheet.create({
  dragRegion: {
    gap: 0,
  },
  titleBlock: {
    gap: space.xs,
    paddingHorizontal: space.sheetInset,
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  title: {
    ...type.nowPlayingTitle,
    color: colors.text,
  },
  meta: {
    ...type.body,
    color: colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingTop: space.sm,
  },
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: space.sheetInset,
  },
  rowTitle: {
    ...type.rowTitle,
    color: colors.text,
  },
  rowTitleCurrent: {
    color: colors.accentText,
  },
  rowStatus: {
    color: colors.accentText,
  },
  positionNumber: {
    color: colors.textMuted,
    fontFamily: fontFamily.mono,
    fontSize: POSITION_NUMBER_SIZE,
    fontWeight: fontWeight.regular,
  },
  // The shared mark is a 44pt square; in a queue row it sits in the number's slot.
  equalizerSlot: {
    width: EQUALIZER_SLOT_SIZE,
    height: EQUALIZER_SLOT_SIZE,
  },
  // The trigger is absolutely placed by default; in a row it sits in the flow.
  rowOverflowTrigger: {
    position: 'relative',
    right: 0,
    top: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.sheetInset,
    paddingTop: space.md,
    paddingBottom: FOOTER_BOTTOM_INSET,
  },
});
