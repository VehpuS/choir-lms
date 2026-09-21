import { ActivityIndicator } from 'react-native';

import { appTheme } from '../../utils/theme';
import { FeedbackCard } from './feedback-card';

type AsyncActionStatusCardProps = {
  message: string;
  size?: 'compact' | 'regular';
  title: string;
};

/**
 * A `FeedbackCard` with a spinner wired in, for a background action the user
 * is waiting on (e.g. a live Drive lookup) rather than a static status. Kept
 * generic so it can front any such action, not just Drive ones.
 */
export const AsyncActionStatusCard = ({
  message,
  size,
  title,
}: AsyncActionStatusCardProps) => {
  return (
    <FeedbackCard
      leading={
        <ActivityIndicator color={appTheme.colors.secondaryText} size="small" />
      }
      message={message}
      size={size}
      title={title}
      tone="neutral"
    />
  );
};
