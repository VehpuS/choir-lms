import { appTheme } from '../../utils/theme';

const { colors } = appTheme;

export type FeedbackCardTone = 'neutral' | 'ready' | 'warning' | 'error';

export type FeedbackCardPalette = {
  edge: string;
  message: string;
  surface: string;
  title: string;
};

const FEEDBACK_CARD_PALETTES: Record<FeedbackCardTone, FeedbackCardPalette> = {
  neutral: {
    edge: colors.border,
    message: colors.textMuted,
    surface: colors.surface,
    title: colors.text,
  },
  ready: {
    edge: colors.successEdge,
    message: colors.textSecondary,
    surface: colors.successFill,
    title: colors.success,
  },
  warning: {
    edge: colors.warningEdge,
    message: colors.textSecondary,
    surface: colors.warningFill,
    title: colors.warning,
  },
  error: {
    edge: colors.dangerEdge,
    message: colors.danger,
    surface: colors.dangerFill,
    title: colors.danger,
  },
};

export const resolveFeedbackCardPalette = (
  tone: FeedbackCardTone,
): FeedbackCardPalette => {
  return FEEDBACK_CARD_PALETTES[tone];
};
