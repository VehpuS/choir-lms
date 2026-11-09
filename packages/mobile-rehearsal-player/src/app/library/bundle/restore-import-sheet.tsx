import type { useRestoreImportFlow } from './use-restore-import-flow';
import { RestoreImportListSteps } from './restore-import-list-steps';
import { RestoreImportPreviewSteps } from './restore-import-preview-steps';
import { RestoreImportResultSteps } from './restore-import-result-steps';

type RestoreImportSheetProps = {
  flow: ReturnType<typeof useRestoreImportFlow>;
  onOpenAccessGuide: () => void;
};

/** The sheets of the Restore and Import flows; each step group renders in its own file. */
export const RestoreImportSheet = ({
  flow,
  onOpenAccessGuide,
}: RestoreImportSheetProps) => (
  <>
    <RestoreImportListSteps flow={flow} />
    <RestoreImportPreviewSteps flow={flow} />
    <RestoreImportResultSteps
      flow={flow}
      onOpenAccessGuide={onOpenAccessGuide}
    />
  </>
);
