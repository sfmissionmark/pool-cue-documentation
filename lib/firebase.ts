import { initializeApp, getApps } from 'firebase/app';
import { getFirestore as getFirestoreInstance, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'placeholder.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'placeholder-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'placeholder.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'placeholder-app-id'
};

let firestore: Firestore | null = null;

export function getFirestore(): Firestore | null {
  // Only initialize if we have real credentials
  if (firebaseConfig.apiKey === 'placeholder-api-key' || 
      firebaseConfig.projectId === 'placeholder-project') {
    return null;
  }

  if (!firestore) {
    try {
      // Initialize Firebase only if it hasn't been initialized yet
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      firestore = getFirestoreInstance(app);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      firestore = null;
    }
  }
  
  return firestore;
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig.apiKey !== 'placeholder-api-key' && 
         firebaseConfig.projectId !== 'placeholder-project';
}