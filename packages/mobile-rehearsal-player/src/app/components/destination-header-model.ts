export type DestinationHeaderKey = 'add' | 'library' | 'recents';

type DestinationHeaderModel = {
  hasSearchActions: boolean;
  showsDriveSessionMenu: boolean;
  title: string;
};

const DESTINATION_HEADER_MODELS: Record<
  DestinationHeaderKey,
  DestinationHeaderModel
> = {
  add: {
    hasSearchActions: true,
    showsDriveSessionMenu: true,
    title: 'Add',
  },
  library: {
    hasSearchActions: true,
    showsDriveSessionMenu: true,
    title: 'Library',
  },
  recents: {
    hasSearchActions: false,
    showsDriveSessionMenu: true,
    title: 'Recents',
  },
};

export const getDestinationHeaderModel = (
  key: DestinationHeaderKey,
): DestinationHeaderModel => {
  return DESTINATION_HEADER_MODELS[key];
};
