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
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Saves or updates a single match in Firestore.
 */
export async function saveMatchToFirestore(match: any): Promise<boolean> {
  if (!match || !match.id) return false;
  const path = `matches/${match.id}`;
  try {
    const docRef = doc(db, 'matches', String(match.id));
    await setDoc(docRef, match, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Batches matches into Firestore in chunks of up to 400 (Firestore limit is 500 per batch).
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
          const docRef = doc(db, 'matches', String(m.id));
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
  try {
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
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return () => {};
  }
}

/**
 * Saves all teams to Firestore.
 */
export async function saveTeamsToFirestore(teams: any[]): Promise<boolean> {
  if (!Array.isArray(teams) || teams.length === 0) return false;
  const path = 'teams';
  try {
    const batch = writeBatch(db);
    teams.forEach(t => {
      if (t && t.id) {
        const docRef = doc(db, 'teams', String(t.id));
        batch.set(docRef, t, { merge: true });
      }
    });
    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Fetches all teams from Firestore.
 */
export async function getTeamsFromFirestore(): Promise<any[]> {
  const path = 'teams';
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
 * Saves all team squads to Firestore.
 */
export async function saveSquadsToFirestore(squads: Record<string, any[]>): Promise<boolean> {
  if (!squads || typeof squads !== 'object' || Object.keys(squads).length === 0) return false;
  const path = 'squads';
  try {
    const entries = Object.entries(squads);
    const chunkSize = 400;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach(([teamName, players]) => {
        if (teamName) {
          // Normalize team doc ID
          const safeId = teamName.replace(/[\/\s]/g, '_');
          const docRef = doc(db, 'squads', safeId);
          batch.set(docRef, { teamName, players }, { merge: true });
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
 * Fetches all team squads from Firestore.
 */
export async function getSquadsFromFirestore(): Promise<Record<string, any[]> | null> {
  const path = 'squads';
  try {
    const snapshot = await getDocs(collection(db, path));
    const squads: Record<string, any[]> = {};
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data && data.teamName && Array.isArray(data.players)) {
        squads[data.teamName] = data.players;
      }
    });
    return Object.keys(squads).length > 0 ? squads : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}
