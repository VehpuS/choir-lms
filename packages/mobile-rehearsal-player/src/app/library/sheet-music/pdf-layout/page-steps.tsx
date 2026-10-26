import type { StyleProp, ViewStyle } from 'react-native';

import { SurfaceIconButton } from '../../../components/surface-icon-button';
import type { PdfPageControls } from './pdf-page-controls-model';

/** What the page-turning buttons need: where turning is possible and what it does. */
export type PageSteps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
};

/** The steps the open PDF's controls allow; undefined where whole pages are not turned. */
export const buildPageSteps = (
  controls: PdfPageControls,
  turn: { next: () => void; previous: () => void },
): PageSteps | undefined =>
  controls.showSteps
    ? {
        canGoNext: controls.canGoNext,
        canGoPrevious: controls.canGoPrevious,
        onNext: turn.next,
        onPrevious: turn.previous,
      }
    : undefined;

export const PREVIOUS_PAGE_LABEL = 'Previous page';
export const NEXT_PAGE_LABEL = 'Next page';

/** `Previous page` and `Next page`; one of them, disabled at either end of the document. */
export const PageStepButton = ({
  direction,
  steps,
  style,
}: {
  direction: 'next' | 'previous';
  steps: PageSteps;
  style?: StyleProp<ViewStyle>;
}) =>
  direction === 'next' ? (
    <SurfaceIconButton
      accessibilityLabel={NEXT_PAGE_LABEL}
      disabled={!steps.canGoNext}
      icon="chevron-right"
      onPress={steps.onNext}
      style={style}
    />
  ) : (
    <SurfaceIconButton
      accessibilityLabel={PREVIOUS_PAGE_LABEL}
      disabled={!steps.canGoPrevious}
      icon="chevron-left"
      onPress={steps.onPrevious}
      style={style}
    />
  );
