import { compositeCapabilities } from '../composite-capabilities';
import { setCompositeEngineLoader } from './composite-engine-loader';
import {
  createCompositeEngineLoader,
  type CompositeLoaderHost,
} from './create-composite-engine-loader';

/**
 * Registers the real composite loader where composites can play; elsewhere the
 * dispatcher keeps failing with the unavailable message. Called once the app
 * has its composites and library (the composite store arrives with task 5.3).
 */
export const registerCompositeEngineLoader = (host: CompositeLoaderHost) => {
  if (!compositeCapabilities().canPlayComposites) {
    return;
  }

  setCompositeEngineLoader(createCompositeEngineLoader(host));
};
