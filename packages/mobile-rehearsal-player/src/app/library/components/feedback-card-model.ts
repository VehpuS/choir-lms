export type FeedbackCardTone = 'neutral' | 'ready' | 'warning' | 'error';

export type FeedbackCardPalette = {
  message: string;
  surface: string;
  title: string;
};

const FEEDBACK_CARD_PALETTES: Record<FeedbackCardTone, FeedbackCardPalette> = {
  neutral: {
    message: '#5f5647',
    surface: '#f6f1e7',
    title: '#1f1c17',
  },
  ready: {
    message: '#5f5647',
    surface: '#e7f2ec',
    title: '#1f5c40',
  },
  warning: {
    message: '#5f5647',
    surface: '#fff4dd',
    title: '#7f5b12',
  },
  error: {
    message: '#8a2d1f',
    surface: '#fff1ed',
    title: '#8a2d1f',
  },
};

export const resolveFeedbackCardPalette = (
  tone: FeedbackCardTone,
): FeedbackCardPalette => {
  return FEEDBACK_CARD_PALETTES[tone];
};
