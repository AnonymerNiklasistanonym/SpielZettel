import { useEffect, useState, useCallback } from "react";
import { SpielZettelFileData } from "../helper/readFile";

export interface IndexedDBData {
  id: string;
  data: SpielZettelFileData;
}

export const useIndexedDB = (dbName: string, storeName: string) => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentKey, setCurrentKey] = useState<string | null>(null);

  // Load the current key from the database
  const loadCurrentKey = useCallback((db: IDBDatabase) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const currentKeyRequest = store.get("current");

    currentKeyRequest.onsuccess = () => {
      const result = currentKeyRequest.result as {currentKey: string;} | undefined;
      if (result) {
        setCurrentKey(result.currentKey);
      }
    };

    currentKeyRequest.onerror = () => {
      console.error("Error loading current key.");
    };
  }, [storeName]);

  // Set the current key in the database
  const setCurrentKeyInDB = useCallback((key: string) => {
    if (!db) {
      console.error("Database not initialized.");
      return;
    }

    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    store.put({ id: "current", currentKey: key });

    transaction.oncomplete = () => {
      setCurrentKey(key);
    };

    transaction.onerror = (event) => {
      console.error("Error setting current key:", (event.target as {error?: string})?.error);
    };
  }, [db, storeName]);

  // Initialize the database
  useEffect(() => {
    const initDB = (): Promise<IDBDatabase> => {
      return new Promise((resolve, reject) => {
        const dbRequest = indexedDB.open(dbName, 1);

        dbRequest.onupgradeneeded = () => {
          const database = dbRequest.result;
          if (!database.objectStoreNames.contains(storeName)) {
            const objectStore = database.createObjectStore(storeName, { keyPath: "id" });
            objectStore.createIndex("id", "id", { unique: true });
            console.log("Object store created.");
          }
        };

        dbRequest.onsuccess = () => {
          resolve(dbRequest.result);
        };

        dbRequest.onerror = () => {
          reject(dbRequest.error);
        };
      });
    };

    initDB()
      .then((database) => {
        setDb(database);
        loadCurrentKey(database);
      })
      .catch((err) => setError(err?.message || "Failed to initialize IndexedDB"));
  }, [dbName, loadCurrentKey, storeName]);

  // Save data (image or JSON)
  const saveData = useCallback(
    async (id: string, data: SpielZettelFileData): Promise<void> => {
      if (!db) {
        console.error("Database not initialized.");
        return;
      }

      try {
        const transaction = db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);

        // Save combined object
        store.put({ id, data });

        // Update the current key
        if (id !== "current") {
          await setCurrentKeyInDB(id);
        }

        transaction.oncomplete = () => {
          console.log("Data saved:", { id, data });
        };

        transaction.onerror = (event) => {
          console.error("Error saving data:", (event.target as {error?: string})?.error);
        };
      } catch (error) {
        console.error("Error in saveData:", error);
      }
    },
    [db, setCurrentKeyInDB, storeName]
  );

  // Retrieve a combined Blob and JSON
  const getData = useCallback(
    (id: string): Promise<IndexedDBData | undefined> => {
      return new Promise((resolve, reject) => {
        if (!db) {
          console.error("Database not initialized.");
          reject("Database not initialized.");
          return;
        }

        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result as IndexedDBData | undefined);
        };

        request.onerror = () => {
          reject("Error retrieving data.");
        };
      });
    },
    [db, storeName]
  );
  // Get the current key's associated data
  const getCurrentData = useCallback(() => {
    if (currentKey) {
      return getData(currentKey);
    }
    return Promise.reject("No current key set.");
  }, [currentKey, getData]);

  return {
    saveData,
    getData,
    getCurrentData,
    currentKey,
    setCurrentKey: setCurrentKeyInDB,
    error,
  };
};
