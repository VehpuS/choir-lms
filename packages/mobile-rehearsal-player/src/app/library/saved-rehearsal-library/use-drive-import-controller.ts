import {
  type DriveDiscoveryResult,
  type DriveFolderContents,
} from '@org/google-drive';
import { useEffect, useRef, useState } from 'react';

import { type DriveImportExecutionResult } from './drive-import-executor';
import type { DriveImportLibraryState } from './drive-import-plan-classification';
import {
  createDriveImportPlan,
  type DriveImportMode,
  type DriveImportPlan,
} from './drive-import-planner';
import { createDriveImportRetryPlan } from './drive-import-retry-planner';
import { normalizeDriveImportSelection } from './drive-import-selection-normalizer';
import {
  createDriveImportReviewSummary,
  type DriveImportProgress,
  type DriveImportReviewSummary,
} from './drive-import-status';

type DriveImportControllerDependencies = {
  enumerateFolderContents(
    folder: Extract<DriveDiscoveryResult, { kind: 'folder' }>,
    signal: AbortSignal,
  ): Promise<DriveFolderContents>;
  executePlan(options: {
    onProgress: (progress: DriveImportProgress) => void;
    plan: DriveImportPlan;
    signal: AbortSignal;
  }): Promise<DriveImportExecutionResult>;
  loadLibraryState(): Promise<DriveImportLibraryState>;
};

type DriveImportControllerState =
  | { status: 'idle' }
  | { progress: DriveImportProgress; status: 'preparing' }
  | {
      plan: DriveImportPlan;
      reviewSummary: DriveImportReviewSummary;
      status: 'review';
    }
  | {
      plan: DriveImportPlan;
      progress: DriveImportProgress;
      status: 'executing';
    }
  | {
      plan: DriveImportPlan;
      result: DriveImportExecutionResult;
      status: 'completed';
    }
  | {
      message: string;
      operation: 'execute' | 'plan' | 'retry';
      status: 'error';
    };

type PlanDriveImportOptions = {
  destinationFolderId: string;
  mode: DriveImportMode;
  selection: readonly DriveDiscoveryResult[];
};

type UseDriveImportControllerOptions = {
  dependencies: DriveImportControllerDependencies;
  onLibraryChanged: () => Promise<unknown>;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.trim()
    ? error.message
    : 'The Drive import could not be completed.';

export const useDriveImportController = (
  options: UseDriveImportControllerOptions,
) => {
  const [state, setState] = useState<DriveImportControllerState>({
    status: 'idle',
  });
  const activeOperation = useRef<AbortController | null>(null);
  const dependencies = options.dependencies;

  useEffect(() => () => activeOperation.current?.abort(), []);

  const startOperation = () => {
    activeOperation.current?.abort();
    const controller = new AbortController();
    activeOperation.current = controller;
    return controller;
  };

  const executePlan = async (
    plan: DriveImportPlan,
    operation: 'execute' | 'retry',
    controller: AbortController = startOperation(),
  ) => {
    setState({
      plan,
      progress: {
        completedItems: 0,
        phase: 'creating-folders',
        totalItems: plan.folders.length,
      },
      status: 'executing',
    });

    try {
      const result = await dependencies.executePlan({
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setState({ plan, progress, status: 'executing' });
          }
        },
        plan,
        signal: controller.signal,
      });
      await options.onLibraryChanged();
      setState({ plan, result, status: 'completed' });
      return result;
    } catch (error) {
      setState({
        message: getErrorMessage(error),
        operation,
        status: 'error',
      });
      return null;
    } finally {
      if (activeOperation.current === controller) {
        activeOperation.current = null;
      }
    }
  };

  return {
    cancel() {
      activeOperation.current?.abort();
    },
    execute() {
      return state.status === 'review'
        ? executePlan(state.plan, 'execute')
        : null;
    },
    async plan(planOptions: PlanDriveImportOptions) {
      const controller = startOperation();
      const selection = normalizeDriveImportSelection(planOptions.selection);
      const contentsByFolderId = new Map<string, DriveFolderContents>();

      setState({
        progress: {
          completedItems: 0,
          phase: 'preparing',
          totalItems: selection.folders.length,
        },
        status: 'preparing',
      });

      try {
        for (const [index, folder] of selection.folders.entries()) {
          const contents = await dependencies.enumerateFolderContents(
            folder,
            controller.signal,
          );
          contentsByFolderId.set(folder.id, contents);
          setState({
            progress: {
              completedItems: index + 1,
              phase: 'preparing',
              totalItems: selection.folders.length,
            },
            status: 'preparing',
          });
        }

        if (controller.signal.aborted) {
          setState({ status: 'idle' });
          return null;
        }

        const libraryState = await dependencies.loadLibraryState();
        const plan = createDriveImportPlan({
          contentsByFolderId,
          destinationFolderId: planOptions.destinationFolderId,
          libraryState,
          mode: planOptions.mode,
          selection,
        });
        setState({
          plan,
          reviewSummary: createDriveImportReviewSummary(
            plan,
            selection.overlapCounts,
          ),
          status: 'review',
        });
        return plan;
      } catch (error) {
        if (controller.signal.aborted) {
          setState({ status: 'idle' });
          return null;
        }

        setState({
          message: getErrorMessage(error),
          operation: 'plan',
          status: 'error',
        });
        return null;
      } finally {
        if (activeOperation.current === controller) {
          activeOperation.current = null;
        }
      }
    },
    reset() {
      activeOperation.current?.abort();
      activeOperation.current = null;
      setState({ status: 'idle' });
    },
    async retry() {
      if (state.status !== 'completed') {
        return null;
      }

      const controller = startOperation();
      setState({
        progress: { completedItems: 0, phase: 'preparing' },
        status: 'preparing',
      });

      try {
        const libraryState = await dependencies.loadLibraryState();
        const retryPlan = createDriveImportRetryPlan({
          libraryState,
          outcomes: state.result.outcomes,
          plan: state.plan,
        });
        return executePlan(retryPlan, 'retry', controller);
      } catch (error) {
        if (activeOperation.current === controller) {
          activeOperation.current = null;
        }
        setState({
          message: getErrorMessage(error),
          operation: 'retry',
          status: 'error',
        });
        return null;
      }
    },
    state,
  };
};

export type DriveImportController = ReturnType<typeof useDriveImportController>;
export type { DriveImportControllerDependencies, DriveImportControllerState };
