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

  const ensureDB = useCallback(async (): Promise<IDBPDatabase<SpielZettelDB>> => {
    while (loading) {
      console.debug("db is loading, waiting...");
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for loading
    }
    if (dbPromise === null) {
      console.debug("db not initialized after loading?", dbPromise);
      throw new Error('Database is not initialized');
    }
    return dbPromise;
  }, [dbPromise, loading]);

  const setLastSave = useCallback(
    async (saveKey: string) => {
      console.debug("setLastSave");
      const db = await ensureDB();
      await db.put(objectStoreLastSave, { id: 'last', saveKey });
    },
    [ensureDB]
  );

  const getLastSave = useCallback(async (): Promise<null | string> => {
    console.debug("getLastSave");
    const db = await ensureDB();
    const result = await db.get(objectStoreLastSave, 'last');
    return result ? result.saveKey : null;
  }, [ensureDB]);

  const removeLastSave = useCallback(
    async () => {
      console.debug("removeLastSave");
      const db = await ensureDB();
      await db.delete(objectStoreLastSave, 'last');
    }, [ensureDB]);

  const addSave = useCallback(
    async (id: string, spielZettelKey: string, states: SpielZettelElementState[], ruleSet?: string) => {
      console.debug("addSave", id, spielZettelKey, states);
      const db = await ensureDB();
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
      const db = await ensureDB();
      return db.get(objectStoreSaves, id);
    },
    [ensureDB]
  );

  const getAllSaves = useCallback(
    async (): Promise<SaveEntry[]> => {
      console.debug("getAllSaves");
      const db = await ensureDB();
      return db.getAll(objectStoreSaves);
    }, [ensureDB]);

  const addSpielZettel = useCallback(
    async (id: string, spielZettel: SpielZettelFileData) => {
      console.debug("addSpielZettel", id, spielZettel);
      const db = await ensureDB();
      await db.put(objectStoreSpielZettel, { id, spielZettel });
    },
    [ensureDB]
  );

  const removeSpielZettel = useCallback(
    async (id: string) => {
      console.debug("removeSpielZettel", id);
      const db = await ensureDB();
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
      const db = await ensureDB();
      return db.get(objectStoreSpielZettel, id);
    },
    [ensureDB]
  );

  const getAllSpielZettel = useCallback(
    async (): Promise<SpielZettelEntry[]> => {
      const db = await ensureDB();
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
