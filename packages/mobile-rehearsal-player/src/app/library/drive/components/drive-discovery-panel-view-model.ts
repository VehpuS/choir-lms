import type { ExplorerBreadcrumbItem } from '../../components/explorer/model';
import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import { shouldShowDriveStatusCard } from '../utils/drive-discovery-layout';
import {
  buildDriveDiscoveryExplorerState,
  type DriveDiscoveryExplorerState,
} from './drive-discovery-panel-model';

export type DriveDiscoveryPanelViewModel = {
  activeStatusCopy: ReturnType<
    typeof useRehearsalLibraryController
  >['discovery']['statusCopy'];
  breadcrumbs: ExplorerBreadcrumbItem[];
  currentTitle: string;
  explorerRows: DriveDiscoveryExplorerState['rows'];
  highlightQuery: string | null;
  isSearchMode: boolean;
  isStatusLoading: boolean;
  navigationEyebrow: string;
  onGoBack: () => void;
  onOpenFolder: ReturnType<
    typeof useRehearsalLibraryController
  >['discovery']['openFolder'];
  shouldShowStatusCard: boolean;
};

export const buildDriveDiscoveryPanelViewModel = (options: {
  controller: ReturnType<typeof useRehearsalLibraryController>;
}): DriveDiscoveryPanelViewModel => {
  const { controller } = options;
  const isSearchMode = controller.search.isSearchMode;
  const explorerState = buildDriveDiscoveryExplorerState({
    browseFolders: controller.discovery.browseSnapshot.folders,
    browsePlayableSources: controller.discovery.playableSources,
    browseUnavailableSources: controller.discovery.unavailableSources,
    currentLocation: controller.discovery.currentLocation,
    isSearchMode,
    navigationStack: controller.discovery.navigationStack,
    searchPlayableSources: controller.search.playableSources,
    searchUnavailableSources: controller.search.unavailableSources,
  });
  const activeStatusCopy = isSearchMode
    ? controller.search.statusCopy
    : controller.discovery.statusCopy;
  const isStatusLoading = isSearchMode
    ? controller.search.isLoading
    : controller.discovery.isLoading;
  const shouldShowStatusCard = shouldShowDriveStatusCard(
    isStatusLoading,
    activeStatusCopy.tone,
  );
  const parentLocationIndex = controller.discovery.navigationStack.length - 2;

  return {
    activeStatusCopy,
    breadcrumbs: explorerState.breadcrumbs.map(
      (breadcrumb: DriveDiscoveryExplorerState['breadcrumbs'][number]) => {
        return {
          isCurrent: breadcrumb.isCurrent,
          key: breadcrumb.key,
          label: breadcrumb.label,
          onPress: breadcrumb.isCurrent
            ? undefined
            : () => {
                controller.discovery.goToLocation(breadcrumb.locationIndex);
              },
        };
      },
    ),
    currentTitle: explorerState.currentTitle,
    explorerRows: explorerState.rows,
    highlightQuery: isSearchMode ? controller.search.activeSearchQuery : null,
    isSearchMode,
    isStatusLoading,
    navigationEyebrow: isSearchMode
      ? 'Current search scope'
      : 'Current location',
    onGoBack: () => {
      if (parentLocationIndex < 0) {
        return;
      }

      controller.discovery.goToLocation(parentLocationIndex);
    },
    onOpenFolder: controller.discovery.openFolder,
    shouldShowStatusCard,
  };
};
