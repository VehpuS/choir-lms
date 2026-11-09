import { useEffect, useMemo, useRef } from 'react';

import type { useGoogleDriveAuthorization } from '../../auth/google-drive/hooks/use-authorization';
import { getPreparedStemStore } from '../composite/prepared/prepared-stem-instance';
import { pruneOrphanPreparedStems } from '../composite/prepared/prune-orphan-prepared-stems';
import { getCompositeStore } from '../composite/store/composite-store-instance';
import { AccessGuideSheet } from './access-guide-sheet';
import { BackupSheet } from './backup-sheet';
import { createBundleDriveApi } from './bundle-drive-api';
import { subscribeToBundleFlowRequests } from './bundle-flow-request';
import { createBundleLibraryAccess } from './bundle-library-access';
import type { BundleServiceDependencies } from './bundle-service-types';
import { RestoreImportSheet } from './restore-import-sheet';
import { ShareSheet } from './share-sheet';
import { useAccessGuideFlow } from './use-access-guide-flow';
import { useBackupFlow } from './use-backup-flow';
import { useRestoreImportFlow } from './use-restore-import-flow';
import { useShareFlow } from './use-share-flow';

type Authorization = Pick<
  ReturnType<typeof useGoogleDriveAuthorization>,
  'authState' | 'hasWriteAccess' | 'startAuthorization'
>;

type LibraryBundleHostProps = {
  authorization: Authorization;
  /** Reloads every list the screens hold after the library changed under them. */
  onLibraryChanged: () => Promise<void>;
};

/**
 * Owns the Back up, Restore, Import, Share and access guide sheets at router
 * level, where the Drive session lives. Menus open them over a small request
 * channel, so no token or session passes through the screens.
 */
export const LibraryBundleHost = ({
  authorization,
  onLibraryChanged,
}: LibraryBundleHostProps) => {
  const accessToken =
    authorization.authState.status === 'authorized'
      ? authorization.authState.accessToken
      : undefined;
  const latestRefresh = useRef(onLibraryChanged);

  latestRefresh.current = onLibraryChanged;

  const deps = useMemo<BundleServiceDependencies | null>(
    () =>
      accessToken
        ? {
            drive: createBundleDriveApi(accessToken),
            library: createBundleLibraryAccess({
              // Composites live in their own store, which keeps a copy.
              onLibraryChanged: async () => {
                const composites = getCompositeStore();

                await Promise.all([
                  latestRefresh.current(),
                  composites.refresh(),
                ]);
                // A replace can remove composites; their prepared stems are a
                // cache of them and go too (only after a read that worked).
                await pruneOrphanPreparedStems(
                  getPreparedStemStore(),
                  composites.getSnapshot().map(({ id }) => id),
                ).catch(() => undefined);
              },
            }),
          }
        : null,
    [accessToken],
  );
  const writeOptions = {
    deps,
    hasWriteAccess: authorization.hasWriteAccess,
    requestWriteAccess: () => {
      void authorization.startAuthorization();
    },
  };
  const backup = useBackupFlow(writeOptions);
  const share = useShareFlow(writeOptions);
  const restoreImport = useRestoreImportFlow(writeOptions);
  const guide = useAccessGuideFlow({ deps });
  const latest = useRef({ backup, share, restoreImport, guide });

  latest.current = { backup, share, restoreImport, guide };

  useEffect(
    () =>
      subscribeToBundleFlowRequests((request) => {
        const flows = latest.current;

        switch (request.kind) {
          case 'backup':
            flows.backup.open();
            break;
          case 'restore':
            void flows.restoreImport.open('restore');
            break;
          case 'import':
            void flows.restoreImport.open('import');
            break;
          case 'share':
            flows.share.open(request.folderId, request.folderName);
            break;
          case 'access-guide':
            void flows.guide.open();
            break;
        }
      }),
    [],
  );

  return (
    <>
      <BackupSheet flow={backup} />
      <ShareSheet flow={share} />
      <RestoreImportSheet
        flow={restoreImport}
        onOpenAccessGuide={() => {
          restoreImport.close();
          void guide.open();
        }}
      />
      <AccessGuideSheet flow={guide} />
    </>
  );
};
