const DB_NAME = "fishtracker-offline";
const DB_VERSION = 1;
const STORE = "catchPhotos";

type CatchPhotoRow = {
  catchId: string;
  photos: Blob[];
  updatedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "catchId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    const result = await fn(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putCatchPhotos(catchId: string, photos: Blob[]): Promise<void> {
  if (!photos || photos.length === 0) return;
  const row: CatchPhotoRow = { catchId, photos, updatedAt: new Date().toISOString() };
  await withStore("readwrite", async (store) => {
    store.put(row);
    return undefined;
  });
}

export async function getCatchPhotos(catchId: string): Promise<Blob[]> {
  return await withStore("readonly", async (store) => {
    const row = await reqToPromise<CatchPhotoRow | undefined>(store.get(catchId));
    return row?.photos ?? [];
  });
}

export async function deleteCatchPhotos(catchId: string): Promise<void> {
  await withStore("readwrite", async (store) => {
    store.delete(catchId);
    return undefined;
  });
}

