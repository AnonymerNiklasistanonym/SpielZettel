import { openDB, deleteDB } from 'idb';
import { useEffect, useState, useCallback } from 'react';
import type { IDBPDatabase } from 'idb';
import type { SpielZettelFileData } from '../helper/readFile';
import { SpielZettelElementState } from '../helper/evaluateRule';


export interface SpielZettelEntry {
  id: string;
  spielZettel: SpielZettelFileData;
};
export interface SaveEntryData {
  spielZettelKey: string;
  states: SpielZettelElementState[]
  ruleSet?: string;
};
export interface SaveEntry {
  id: string;
  save: SaveEntryData;
};
export interface LastSaveEntry {
  id: "last",
  saveKey: string;
};
export interface SpielZettelDB {
  spielZettel: SpielZettelEntry;
  saves: SaveEntry;
  lastSave: LastSaveEntry;
};


const objectStoreSpielZettel = 'spielZettel';
const objectStoreSaves = 'saves';
const objectStoreLastSave = 'lastSave';


export default function useIndexedDB(dbName: string) {
  const [dbPromise, setDbPromise] = useState<Promise<IDBPDatabase<SpielZettelDB>> | null>(null);
  const [loading, setLoading] = useState(true);

  const initDB = useCallback(async () => {
    console.debug("initDB");
    setDbPromise(null);
    try {
      const promise = openDB<SpielZettelDB>(dbName, 3, {
        upgrade(db) {
          console.log("initDB upgrade started", db.version, db.objectStoreNames);
          if (!db.objectStoreNames.contains(objectStoreSpielZettel)) {
            db.createObjectStore(objectStoreSpielZettel, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(objectStoreSaves)) {
            db.createObjectStore(objectStoreSaves, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(objectStoreLastSave)) {
            db.createObjectStore(objectStoreLastSave, { keyPath: 'id' });
          }
          console.info("Database upgrade completed", db.name, db.version, db.objectStoreNames);
        },
      });
      setDbPromise(promise);
      const db = await promise;
      console.info("Database initialized", db.name, db.version, db.objectStoreNames);
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      setLoading(false);
    }
  }, [dbName]);

  // Initialize the database
  useEffect(() => {
    console.debug("USE EFFECT: Initialize DB")
    initDB().catch(console.error);
  }, [initDB]);

  const resetDB = useCallback(async () => {
    await deleteDB(dbName);
    await initDB();
  }, [dbName, initDB]);

  const ensureDB = useCallback(async (name: string): Promise<IDBPDatabase<SpielZettelDB>> => {
    let retries = 0;
    while (dbPromise === null && loading && retries < 20) {
      retries++;
      console.warn("db is loading, waiting...", dbPromise, name, retries);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (dbPromise === null) {
      throw new Error('Database is not initialized after loading');
    }
    return dbPromise;
  }, [dbPromise, loading]);

  const setLastSave = useCallback(
    async (saveKey: string) => {
      console.debug("setLastSave");
      const db = await ensureDB("setLastSave");
      await db.put(objectStoreLastSave, { id: 'last', saveKey });
    },
    [ensureDB]
  );

  const getLastSave = useCallback(async (): Promise<null | string> => {
    console.debug("getLastSave");
    const db = await ensureDB("getLastSave");
    const result = await db.get(objectStoreLastSave, 'last');
    return result ? result.saveKey : null;
  }, [ensureDB]);

  const removeLastSave = useCallback(
    async () => {
      console.debug("removeLastSave");
      const db = await ensureDB("removeLastSave");
      await db.delete(objectStoreLastSave, 'last');
    }, [ensureDB]);

  const addSave = useCallback(
    async (id: string, spielZettelKey: string, states: SpielZettelElementState[], ruleSet?: string) => {
      console.debug("addSave", id, spielZettelKey, states);
      const db = await ensureDB("addSave");
      await db.put(objectStoreSaves, { id, save: {
        spielZettelKey,
        states: states.filter(a => (typeof a.value === "boolean" && a.value !== false) || (typeof a.value === "string" && a.value !== "")),
        ruleSet,
      } });
    },
    [ensureDB]
  );

  const getSave = useCallback(
    async (id: string): Promise<undefined | SaveEntry> => {
      console.debug("getSave", id);
      const db = await ensureDB("getSave");
      return db.get(objectStoreSaves, id);
    },
    [ensureDB]
  );

  const getAllSaves = useCallback(
    async (): Promise<SaveEntry[]> => {
      console.debug("getAllSaves");
      const db = await ensureDB("getAllSaves");
      return db.getAll(objectStoreSaves);
    }, [ensureDB]);

  const addSpielZettel = useCallback(
    async (id: string, spielZettel: SpielZettelFileData) => {
      console.debug("addSpielZettel", id, spielZettel);
      const db = await ensureDB("addSpielZettel");
      await db.put(objectStoreSpielZettel, { id, spielZettel });
    },
    [ensureDB]
  );

  const removeSpielZettel = useCallback(
    async (id: string) => {
      console.debug("removeSpielZettel", id);
      const db = await ensureDB("removeSpielZettel");
      await db.delete(objectStoreSpielZettel, id);
      // Delete all connected saves
      const allSaves = await getAllSaves();
      for (const save of allSaves) {
        if (save.save.spielZettelKey === id) {
          await db.delete(objectStoreSaves, save.id);
        }
      }
      // Delete all last save if it was a save file of the deleted SpielZettel
      const lastSave = await getLastSave();
      if (lastSave !== null && allSaves.map(a => a.id).includes(lastSave)) {
        removeLastSave();
      }
    },
    [ensureDB, getAllSaves, getLastSave, removeLastSave]
  );

  const getSpielZettel = useCallback(
    async (id: string): Promise<undefined | SpielZettelEntry> => {
      console.debug("getSpielZettel", id);
      const db = await ensureDB("getSpielZettel");
      return db.get(objectStoreSpielZettel, id);
    },
    [ensureDB]
  );

  const getAllSpielZettel = useCallback(
    async (): Promise<SpielZettelEntry[]> => {
      console.debug("getAllSpielZettel");
      const db = await ensureDB("getAllSpielZettel");
      return db.getAll(objectStoreSpielZettel);
    }, [ensureDB]);

  return {
    loading,
    addSpielZettel,
    removeSpielZettel,
    getSpielZettel,
    getAllSpielZettel,
    addSave,
    getSave,
    getAllSaves,
    setLastSave,
    getLastSave,
    resetDB,
  };
};
