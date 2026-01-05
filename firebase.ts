
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const firebaseConfigStr = process.env.FIREBASE_CONFIG;

if (firebaseConfigStr && firebaseConfigStr.length > 10) {
  try {
    const config = JSON.parse(firebaseConfigStr);
    if (!getApps().length) {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
  }
}

export { auth, db };

export const isFirebaseEnabled = (): boolean => {
  return auth !== null && db !== null;
};
