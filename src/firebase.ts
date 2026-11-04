import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize dedicated WhiskerWatch Hydra Firebase project (Zero connection to Koilada)
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const HYDRA_PROJECT_METADATA = {
  projectId: firebaseConfig.projectId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  storageBucket: firebaseConfig.storageBucket,
};

// Validate connection to Firestore on boot as required by Firebase integration specification
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

/**
 * Uploads a photo file to the dedicated WhiskerWatch Hydra Firebase Storage bucket
 * (`storageBucket` in firebase-applet-config.json). Falls back to a compact data URL
 * if bucket rules have not yet been opened in the user's console.
 */
export async function uploadPhotoToHydraBucket(
  file: File,
  folder: 'cats' | 'sightings',
  compactDataUrlFallback: string
): Promise<{ photoUrl: string; storagePath: string }> {
  const uid = auth.currentUser?.uid || 'anonymous';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const storagePath = `hydra-${folder}/${uid}/${Date.now()}_${safeName}`;

  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return {
      photoUrl: downloadUrl.slice(0, 1000),
      storagePath: storagePath.slice(0, 400),
    };
  } catch {
    // Fallback to compact data URL within schema maxLength (1000 chars) or inline SVG key
    const safeUrl =
      compactDataUrlFallback.length <= 980
        ? compactDataUrlFallback
        : 'hydra-storage://inline-cat-portrait';
    return {
      photoUrl: safeUrl,
      storagePath: storagePath.slice(0, 400),
    };
  }
}
