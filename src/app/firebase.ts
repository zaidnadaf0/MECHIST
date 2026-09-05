import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const env = import.meta.env;

export const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             env.VITE_FIREBASE_APP_ID,
  measurementId:     env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  if (_app) return _app;
  _app = initializeApp(firebaseConfig as Required<typeof firebaseConfig>);
  return _app;
}
export function auth(): Auth | null {
  if (!firebaseApp()) return null;
  if (_auth) return _auth;
  _auth = getAuth(_app!);
  return _auth;
}
export function db(): Firestore | null {
  if (!firebaseApp()) return null;
  if (_db) return _db;
  _db = getFirestore(_app!);
  try {
    void enableIndexedDbPersistence(_db).catch(() => {});
  } catch { /* ignore sync throw */ }
  return _db;
}
export function storage(): FirebaseStorage | null {
  if (!firebaseApp()) return null;
  if (_storage) return _storage;
  _storage = getStorage(_app!);
  return _storage;
}
