import { openDB } from 'idb';
import { useEffect, useState, useCallback } from 'react';
import type { IDBPDatabase } from 'idb';
import type { SpielZettelFileData } from '../helper/readFile';
import { SpielZettelElementState } from '../helper/evaluateRule';

export type SpielZettelEntry = { id: string; spielZettel: SpielZettelFileData; enabledRule: null | string };
export type SaveEntryData = { spielZettelKey: string; states: SpielZettelElementState[] };
export type SaveEntry = { id: string; save: SaveEntryData };
export type LastSaveEntry = { id: string, saveKey: string; };

export type SpielZettelDB = {
  spielZettel: SpielZettelEntry;
  saves: SaveEntry;
  lastSave: LastSaveEntry;
};

const objectStoreSpielZettel = 'spielZettel';
const objectStoreSaves = 'saves';
const objectStoreLastSave = 'lastSave';

const useIndexedDB = (dbName: string) => {
  const [dbPromise, setDbPromise] = useState<Promise<IDBPDatabase<SpielZettelDB>> | null>(null);
  const [loading, setLoading] = useState(true);

  const initDB = useCallback(() => {
    try {
      const promise = openDB<SpielZettelDB>(dbName,  3, {
        upgrade(db) {
          console.log("AAAAAAAAAAAAAa", db.objectStoreNames);
          console.log("AAAAAAAAAAAAAb", db.objectStoreNames.contains(objectStoreSpielZettel));
          if (!db.objectStoreNames.contains(objectStoreSpielZettel)) {
            db.createObjectStore(objectStoreSpielZettel, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(objectStoreSaves)) {
            db.createObjectStore(objectStoreSaves, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(objectStoreLastSave)) {
            db.createObjectStore(objectStoreLastSave, { keyPath: 'id' });
          }
          console.log("AAAAAAAAAAAAAc", db.objectStoreNames);
        },
      });
      setDbPromise(promise);
    } catch (error) {
      console.error('Error initializing database:', error);
    } finally {
      setLoading(false);
    }
  }, [dbName]);

  // Initialize the database
  useEffect(() => {
    console.debug("USE EFFECT: INITIALIZE DB")
    initDB();
    console.debug("db initialized!");
  }, [initDB]);

  useEffect(() => {
    console.debug("USE EFFECT: FOUND DB INITIALIZATION", dbPromise);
  }, [dbPromise]);

  const ensureDB = useCallback(async (): Promise<IDBPDatabase<SpielZettelDB>> => {
    if (loading) {
      console.debug("db is loading...");
      throw new Error('Database is loading');
    } else if (dbPromise === null) {
      console.debug("db not initialized???", dbPromise);
      throw new Error('Database is not initialized');
    }
    return await dbPromise;
  }, [dbPromise, loading]);

  const addSpielZettel = useCallback(
    async (id: string, spielZettel: SpielZettelFileData) => {
      const db = await ensureDB();
      await db.put(objectStoreSpielZettel, { id, spielZettel });
    },
    [ensureDB]
  );

  const getSpielZettel = useCallback(
    async (id: string): Promise<null | SpielZettelFileData> => {
      const db = await ensureDB();
      return await db.get(objectStoreSpielZettel, id);
    },
    [ensureDB]
  );

  const getAllSpielZettel = useCallback(
    async (): Promise<null | SpielZettelFileData[]> => {
      const db = await ensureDB();
      return (await db.getAll(objectStoreSpielZettel)).map(a => a.spielZettel);
    }, [ensureDB]);

  const addSave = useCallback(
    async (id: string, spielZettelKey: string, states: SpielZettelElementState[]) => {
      const db = await ensureDB();
      await db.put(objectStoreSaves, { id, save: { spielZettelKey, states } });
    },
    [ensureDB]
  );

  const getSave = useCallback(
    async (id: string): Promise<null | SaveEntryData> => {
      const db = await ensureDB();
      return await db.get(objectStoreSaves, id);
    },
    [ensureDB]
  );

  const getAllSaves = useCallback(
    async (): Promise<null | string[]> => {
      const db = await ensureDB();
      return (await db.getAll(objectStoreSaves));
    }, [ensureDB]);

  const setLastSave = useCallback(
    async (saveKey: string) => {
      const db = await ensureDB();
      await db.put(objectStoreLastSave, { id: 'last', saveKey });
    },
    [ensureDB]
  );

  const getLastSave = useCallback(async (): Promise<null | string> => {
    const db = await ensureDB();
    const result = await db.get(objectStoreLastSave, 'last');
    return result ? result.saveKey : null;
  }, [ensureDB]);

  return { loading, addSpielZettel, getSpielZettel, getAllSpielZettel, addSave, getSave, getAllSaves, setLastSave, getLastSave };
};

export default useIndexedDB;
