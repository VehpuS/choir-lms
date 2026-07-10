import { StyleSheet } from 'react-native';

import { appTheme } from '../../../utils/theme';

export const explorerStyles = StyleSheet.create({
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  backButtonDisabled: {
    opacity: 0.5,
  },
  breadcrumbBar: {
    maxHeight: 42,
  },
  breadcrumbChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  breadcrumbChipCurrent: {
    backgroundColor: '#173229',
    borderColor: '#173229',
  },
  breadcrumbContent: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 13,
    fontWeight: '600',
  },
  breadcrumbLabelCurrent: {
    color: '#fff8ef',
    fontSize: 13,
    fontWeight: '700',
  },
  breadcrumbSeparator: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  listSurface: {
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navigationCopy: {
    flex: 1,
    gap: 2,
  },
  navigationEyebrow: {
    color: appTheme.colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  navigationTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 16,
    backgroundColor: '#fffcf6',
  },
  rowActive: {
    borderColor: '#6f9c8c',
    backgroundColor: '#e6f0eb',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowDisabled: {
    opacity: 0.82,
  },
  rowLeadingIcon: {
    width: 28,
    alignItems: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowPressed: {
    opacity: 0.88,
  },
});
