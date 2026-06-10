import type { Goal } from "./goals";
import type { Review } from "./reviews";
import type { Task } from "./tasks";

const dbName = "shirube-preview";
const dbVersion = 1;

type StoreName = "tasks" | "goals" | "reviews";
type StoredRecord = Task | Goal | Review;

let dbPromise: Promise<IDBDatabase> | null = null;
let currentDb: IDBDatabase | null = null;

function toError(error: unknown, fallback: string) {
  return error instanceof Error ? error : new Error(fallback);
}

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = () =>
        reject(toError(request.error, "Failed to open IndexedDB"));
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
        if (!db.objectStoreNames.contains("goals")) {
          db.createObjectStore("goals", {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (!db.objectStoreNames.contains("reviews")) {
          const reviews = db.createObjectStore("reviews", {
            keyPath: "id",
            autoIncrement: true,
          });
          reviews.createIndex("week", "week", { unique: true });
        }
      };
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
  updates: { doneAt?: string | null; title?: string; date?: string },
) {
  if (Object.keys(updates).length === 0) throw new Error("No fields to update");
  return updateRecord<Task>("tasks", id, updates);
}

export async function deleteIndexedDbTask(id: number) {
  return updateRecord<Task>("tasks", id, {
    deletedAt: new Date().toISOString(),
  });
}

export async function fetchIndexedDbGoals(includeAchieved = false) {
  const goals = await readAll<Goal>("goals");
  return goals
    .filter((goal) => !goal.deletedAt && (includeAchieved || !goal.doneAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createIndexedDbGoal(title: string) {
  return addRecord<Goal>("goals", {
    title,
    doneAt: null,
    deletedAt: null,
    createdAt: new Date().toISOString(),
  });
}

export async function updateIndexedDbGoal(
  id: number,
  updates: { doneAt?: string | null },
) {
  if (!("doneAt" in updates)) throw new Error("No fields to update");
  return updateRecord<Goal>("goals", id, { doneAt: updates.doneAt ?? null });
}

export async function deleteIndexedDbGoal(id: number) {
  return updateRecord<Goal>("goals", id, {
    deletedAt: new Date().toISOString(),
  });
}

export async function fetchIndexedDbReviews() {
  const reviews = await readAll<Review>("reviews");
  return reviews.sort((a, b) => b.week.localeCompare(a.week));
}

export async function fetchIndexedDbReview(week: string) {
  const db = await openDb();
  const transaction = db.transaction("reviews", "readonly");
  const store = transaction.objectStore("reviews");
  const index = store.index("week");
  const review = await requestToPromise<Review | undefined>(index.get(week));
  await transactionDone(transaction);
  return review ?? null;
}

export async function upsertIndexedDbReview(week: string, content: string) {
  const db = await openDb();
  const transaction = db.transaction("reviews", "readwrite");
  const store = transaction.objectStore("reviews");
  const index = store.index("week");
  const existing = await requestToPromise<Review | undefined>(index.get(week));
  const now = new Date().toISOString();
  const review = existing
    ? { ...existing, content, updatedAt: now }
    : { week, content, createdAt: now, updatedAt: now };

  if (existing) {
    await requestToPromise(store.put(review));
  } else {
    const id = Number(await requestToPromise<IDBValidKey>(store.add(review)));
    Object.assign(review, { id });
  }

  await transactionDone(transaction);
  return review as Review;
}
