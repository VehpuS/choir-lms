export type FeedbackCardTone = 'neutral' | 'ready' | 'warning' | 'error';

export type FeedbackCardPalette = {
  message: string;
  surface: string;
  title: string;
};

const FEEDBACK_CARD_PALETTES: Record<FeedbackCardTone, FeedbackCardPalette> = {
  neutral: {
    message: '#5f5647ee',
    surface: '#f6f1e7ee',
    title: '#1f1c17ee',
  },
  ready: {
    message: '#5f5647ee',
    surface: '#e7f2ecee',
    title: '#1f5c40ee',
  },
  warning: {
    message: '#5f5647ee',
    surface: '#fff4ddee',
    title: '#7f5b12ee',
  },
  error: {
    message: '#8a2d1fee',
    surface: '#fff1edee',
    title: '#8a2d1fee',
  },
};

export const resolveFeedbackCardPalette = (
  tone: FeedbackCardTone,
): FeedbackCardPalette => {
  return FEEDBACK_CARD_PALETTES[tone];
};
