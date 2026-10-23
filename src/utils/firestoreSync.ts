import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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

/**
 * Saves or updates a single match in Firestore.
 */
export async function saveMatchToFirestore(match: any): Promise<boolean> {
  const path = `matches/${match.id}`;
  try {
    const docRef = doc(db, 'matches', match.id);
    await setDoc(docRef, match, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Batches matches into Firestore in chunks of up to 450 (Firestore limit is 500 per batch).
 */
export async function saveMatchesBatchToFirestore(matches: any[]): Promise<boolean> {
  if (!Array.isArray(matches) || matches.length === 0) return false;
  const path = 'matches';
  try {
    const chunkSize = 400;
    for (let i = 0; i < matches.length; i += chunkSize) {
      const chunk = matches.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(m => {
        if (m && m.id) {
          const docRef = doc(db, 'matches', m.id);
          batch.set(docRef, m, { merge: true });
        }
      });
      await batch.commit();
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Fetches all matches from Firestore.
 */
export async function getMatchesFromFirestore(): Promise<any[]> {
  const path = 'matches';
  try {
    const snapshot = await getDocs(collection(db, path));
    const results: any[] = [];
    snapshot.forEach(docSnap => {
      results.push(docSnap.data());
    });
    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

/**
 * Listens for real-time changes to the matches collection in Firestore.
 */
export function onMatchesFirestoreSnapshot(
  onUpdate: (matches: any[]) => void,
  onError?: (err: any) => void
): () => void {
  const path = 'matches';
  const unsubscribe = onSnapshot(
    collection(db, path),
    snapshot => {
      const results: any[] = [];
      snapshot.forEach(docSnap => {
        results.push(docSnap.data());
      });
      if (results.length > 0) {
        onUpdate(results);
      }
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
      if (onError) onError(error);
    }
  );
  return unsubscribe;
}
