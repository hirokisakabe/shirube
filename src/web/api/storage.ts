const storageDriver =
  import.meta.env.VITE_STORAGE_DRIVER === "indexeddb" ? "indexeddb" : "api";

export const usesIndexedDbStorage = storageDriver === "indexeddb";
