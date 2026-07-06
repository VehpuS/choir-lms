import type { AuthorizationSessionStore } from './authorization';

type SecureStoreModule = {
  deleteItemAsync?: (key: string) => Promise<void>;
  getItemAsync?: (key: string) => Promise<string | null>;
  setItemAsync?: (key: string, value: string) => Promise<void>;
};

export type WebStorageLike = {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

type CreateAuthorizationSessionStoreOptions = {
  platform: string;
  secureStore: SecureStoreModule;
  webStorage?: WebStorageLike | null;
};

const hasSecureStoreApi = (
  secureStore: SecureStoreModule,
): secureStore is Required<SecureStoreModule> => {
  return (
    typeof secureStore.getItemAsync === 'function' &&
    typeof secureStore.setItemAsync === 'function' &&
    typeof secureStore.deleteItemAsync === 'function'
  );
};

const createWebStorageSessionStore = (
  webStorage: WebStorageLike,
): AuthorizationSessionStore => {
  return {
    async getItem(key) {
      return webStorage.getItem(key);
    },
    async setItem(key, value) {
      webStorage.setItem(key, value);
    },
    async deleteItem(key) {
      webStorage.removeItem(key);
    },
  };
};

const createSecureStoreSessionStore = (
  secureStore: Required<SecureStoreModule>,
): AuthorizationSessionStore => {
  return {
    getItem(key) {
      return secureStore.getItemAsync(key);
    },
    setItem(key, value) {
      return secureStore.setItemAsync(key, value);
    },
    deleteItem(key) {
      return secureStore.deleteItemAsync(key);
    },
  };
};

const createNoopSessionStore = (): AuthorizationSessionStore => {
  return {
    async getItem() {
      return null;
    },
    async setItem() {
      return undefined;
    },
    async deleteItem() {
      return undefined;
    },
  };
};

export const createAuthorizationSessionStore = ({
  platform,
  secureStore,
  webStorage = null,
}: CreateAuthorizationSessionStoreOptions): AuthorizationSessionStore => {
  if (platform === 'web' && webStorage) {
    return createWebStorageSessionStore(webStorage);
  }

  if (hasSecureStoreApi(secureStore)) {
    return createSecureStoreSessionStore(secureStore);
  }

  if (webStorage) {
    return createWebStorageSessionStore(webStorage);
  }

  return createNoopSessionStore();
};
