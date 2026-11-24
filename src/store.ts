import { useEffect, useState } from 'react';
import type { ResumeMeta } from './types';
import { uid } from './util';

/** useState that survives reloads via localStorage. */
export function usePersistent<T>(key: string, initial: () => T, migrate?: (raw: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) return migrate ? migrate(JSON.parse(raw)) : (JSON.parse(raw) as T);
    } catch {
      /* storage blocked or corrupt — fall back */
    }
    return initial();
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / private mode */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

// ---- Resume files live in IndexedDB (localStorage is too small for PDFs) ----

const DB_NAME = 'iris-tracker';
const STORE = 'resumes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const putBlob = (id: string, blob: Blob) => run('readwrite', (s) => s.put(blob, id));
export const getBlob = (id: string) => run<Blob | undefined>('readonly', (s) => s.get(id));
export const delBlob = (id: string) => run('readwrite', (s) => s.delete(id));

export function useResumes() {
  const [list, setList] = usePersistent<ResumeMeta[]>('iris.resumes', () => []);
  const [defaultId, setDefaultId] = usePersistent<string>('iris.defaultResume', () => '');

  async function add(file: File) {
    const id = uid();
    await putBlob(id, file);
    const meta: ResumeMeta = {
      id,
      name: file.name.replace(/\.[^.]+$/, ''),
      fileName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: Date.now(),
    };
    setList((l) => [meta, ...l]);
    if (!defaultId) setDefaultId(id);
  }

  async function remove(id: string) {
    await delBlob(id);
    setList((l) => l.filter((r) => r.id !== id));
    if (defaultId === id) setDefaultId('');
  }

  const rename = (id: string, name: string) =>
    setList((l) => l.map((r) => (r.id === id ? { ...r, name } : r)));

  async function view(id: string) {
    const blob = await getBlob(id);
    if (!blob) return alert('That file is missing from this browser.');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function save(id: string) {
    const meta = list.find((r) => r.id === id);
    const blob = await getBlob(id);
    if (!meta || !blob) return alert('That file is missing from this browser.');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meta.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function replaceAll(metas: ResumeMeta[], blobs: Record<string, Blob>) {
    for (const r of list) await delBlob(r.id);
    for (const [id, blob] of Object.entries(blobs)) await putBlob(id, blob);
    setList(metas);
    setDefaultId(metas[0]?.id ?? '');
  }

  return { list, defaultId, setDefaultId, add, remove, rename, view, save, replaceAll };
}

export type Resumes = ReturnType<typeof useResumes>;
