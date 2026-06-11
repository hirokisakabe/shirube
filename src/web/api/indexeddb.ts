import type { WeeklyCycle } from "./weeklyCycles";
import type { Task } from "./tasks";

const dbName = "shirube-preview";
const dbVersion = 2;

type StoreName = "tasks" | "weekly_cycles";
type StoredRecord = Task | WeeklyCycle;

let dbPromise: Promise<IDBDatabase> | null = null;
let currentDb: IDBDatabase | null = null;

function toError(error: unknown, fallback: string) {
  return error instanceof Error ? error : new Error(fallback);
}

function openDb() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = () =>
        reject(toError(request.error, "Failed to open IndexedDB"));
      request.onblocked = () => reject(new Error("IndexedDB open blocked"));
      request.onsuccess = () => {
        currentDb = request.result;
        resolve(request.result);
      };
      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains("tasks")) {
          db.createObjectStore("tasks", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (db.objectStoreNames.contains("goals")) {
          db.deleteObjectStore("goals");
        }
        if (db.objectStoreNames.contains("reviews")) {
          db.deleteObjectStore("reviews");
        }
        if (!db.objectStoreNames.contains("weekly_cycles")) {
          const weeklyCycles = db.createObjectStore("weekly_cycles", {
            keyPath: "id",
            autoIncrement: true,
          });
          weeklyCycles.createIndex("week", "week", { unique: true });
        }
      };
    }).catch((error: unknown) => {
      currentDb = null;
      dbPromise = null;
      throw error;
    });
  }

  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(toError(request.error, "IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(toError(transaction.error, "IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(toError(transaction.error, "IndexedDB transaction aborted"));
  });
}

async function readAll<T extends StoredRecord>(storeName: StoreName) {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const records = await requestToPromise<T[]>(store.getAll());
  await transactionDone(transaction);
  return records;
}

async function addRecord<T extends StoredRecord>(
  storeName: StoreName,
  record: Omit<T, "id">,
) {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const id = Number(await requestToPromise<IDBValidKey>(store.add(record)));
  const created = (await requestToPromise<T>(store.get(id))) ?? {
    ...record,
    id,
  };
  await transactionDone(transaction);
  return created;
}

async function updateRecord<T extends StoredRecord>(
  storeName: StoreName,
  id: number,
  updates: Partial<T>,
) {
  const db = await openDb();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const current = await requestToPromise<T | undefined>(store.get(id));
  if (!current || ("deletedAt" in current && current.deletedAt)) {
    throw new Error("Not found");
  }
  const updated = { ...current, ...updates };
  await requestToPromise(store.put(updated));
  await transactionDone(transaction);
  return updated;
}

export function resetIndexedDbConnectionForTest() {
  currentDb?.close();
  currentDb = null;
  dbPromise = null;
}

export async function fetchIndexedDbTasks(date?: string) {
  const tasks = await readAll<Task>("tasks");
  return tasks.filter(
    (task) => !task.deletedAt && (date === undefined || task.date === date),
  );
}

export async function createIndexedDbTask(title: string, date: string) {
  return addRecord<Task>("tasks", {
    title,
    date,
    doneAt: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
  });
}

export async function updateIndexedDbTask(
  id: number,
  updates: {
    doneAt?: string | null;
    title?: string;
    date?: string;
    deletedAt?: string | null;
  },
) {
  if (Object.keys(updates).length === 0) throw new Error("No fields to update");
  return updateRecord<Task>("tasks", id, updates);
}

export async function deleteIndexedDbTask(id: number) {
  return updateRecord<Task>("tasks", id, {
    deletedAt: new Date().toISOString(),
  });
}

export async function fetchIndexedDbWeeklyCycles() {
  const cycles = await readAll<WeeklyCycle>("weekly_cycles");
  return cycles.sort((a, b) => b.week.localeCompare(a.week));
}

export async function fetchIndexedDbWeeklyCycle(week: string) {
  const db = await openDb();
  const transaction = db.transaction("weekly_cycles", "readonly");
  const store = transaction.objectStore("weekly_cycles");
  const index = store.index("week");
  const cycle = await requestToPromise<WeeklyCycle | undefined>(
    index.get(week),
  );
  await transactionDone(transaction);
  return cycle ?? null;
}

export async function upsertIndexedDbWeeklyCycle(
  week: string,
  content: { goalContent: string; reviewContent: string },
) {
  const db = await openDb();
  const transaction = db.transaction("weekly_cycles", "readwrite");
  const store = transaction.objectStore("weekly_cycles");
  const index = store.index("week");
  const existing = await requestToPromise<WeeklyCycle | undefined>(
    index.get(week),
  );
  const now = new Date().toISOString();
  const cycle = existing
    ? { ...existing, ...content, updatedAt: now }
    : { week, ...content, createdAt: now, updatedAt: now };

  if (existing) {
    await requestToPromise(store.put(cycle));
  } else {
    const id = Number(await requestToPromise<IDBValidKey>(store.add(cycle)));
    Object.assign(cycle, { id });
  }

  await transactionDone(transaction);
  return cycle as WeeklyCycle;
}
