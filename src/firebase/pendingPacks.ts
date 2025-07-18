import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  where,
  updateDoc,
  doc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';
import type { PendingPack } from '../utils/duplicateDetection';
import { arePacksLikelyDuplicates, validatePackData, generatePackSignature } from '../utils/duplicateDetection';
import type { FirebasePack } from './database';

// Convert PendingPack to Firestore format
interface FirestorePendingPack {
  name: string;
  price: number;
  energy_pots: number;
  raw_energy: number;
  total_energy: number;
  cost_per_energy: number;
  items?: Array<{
    itemTypeId: string;
    quantity: number;
  }>;
  submitter_id: string;
  submitter_email?: string;
  confirmations: string[];
  confirmation_count: number;
  status: 'pending' | 'confirmed' | 'rejected';
  submitted_at: Timestamp;
  expires_at: Timestamp;
  pack_signature: string;
}

// Submit a new pack for community review
export const submitPendingPack = async (
  packData: Omit<PendingPack, 'id' | 'confirmations' | 'confirmation_count' | 'status' | 'submitted_at' | 'expires_at'>,
  submitterId: string,
  submitterEmail?: string
): Promise<{ success: boolean; packId?: string; message: string; duplicateFound?: boolean }> => {
  try {
    console.log('🚀 Starting pack submission:', { packData, submitterId, submitterEmail });
    
    // Validate pack data
    const validation = validatePackData(packData);
    console.log('📝 Validation result:', validation);
    if (!validation.isValid) {
      return {
        success: false,
        message: `Invalid pack data: ${validation.errors.join(', ')}`
      };
    }

    // Generate pack signature for exact duplicate detection
    const signature = generatePackSignature(packData);

    // Check for exact duplicates by signature
    const exactDuplicateQuery = query(
      collection(db, 'pending_packs'),
      where('pack_signature', '==', signature),
      where('status', '==', 'pending')
    );
    const exactDuplicates = await getDocs(exactDuplicateQuery);

    if (!exactDuplicates.empty) {
      // Found exact duplicate - add confirmation instead of creating new pack
      const duplicateDoc = exactDuplicates.docs[0];
      const duplicateData = duplicateDoc.data() as FirestorePendingPack;
      
      // Check if this user already confirmed this pack
      if (duplicateData.confirmations.includes(submitterId)) {
        return {
          success: false,
          message: 'You have already submitted/confirmed this pack',
          duplicateFound: true
        };
      }

      // Add confirmation
      const updatedConfirmations = [...duplicateData.confirmations, submitterId];
      const newConfirmationCount = updatedConfirmations.length;

      await updateDoc(doc(db, 'pending_packs', duplicateDoc.id), {
        confirmations: updatedConfirmations,
        confirmation_count: newConfirmationCount
      });

      // If we have enough confirmations (3), auto-approve the pack
      if (newConfirmationCount >= 3) {
        await approvePendingPack(duplicateDoc.id);
        return {
          success: true,
          message: 'Pack confirmed and automatically approved! Thank you for contributing.',
          duplicateFound: true
        };
      }

      return {
        success: true,
        message: `Pack confirmed! ${3 - newConfirmationCount} more confirmation(s) needed for approval.`,
        duplicateFound: true
      };
    }

    // Check for similar packs (fuzzy matching)
    const allPendingQuery = query(
      collection(db, 'pending_packs'),
      where('status', '==', 'pending')
    );
    const allPendingDocs = await getDocs(allPendingQuery);
    
    const pendingPacks: PendingPack[] = allPendingDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submitted_at: doc.data().submitted_at.toDate(),
      expires_at: doc.data().expires_at.toDate()
    } as PendingPack));

    const newPack: PendingPack = {
      ...packData,
      submitter_id: submitterId,
      submitter_email: submitterEmail,
      confirmations: [submitterId],
      confirmation_count: 1,
      status: 'pending',
      submitted_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    // Check for similar packs
    const similarPacks = pendingPacks.filter(pack => arePacksLikelyDuplicates(newPack, pack));
    
    if (similarPacks.length > 0) {
      return {
        success: false,
        message: `Similar pack(s) already submitted: "${similarPacks[0].name}". Please confirm existing pack instead of submitting duplicate.`,
        duplicateFound: true
      };
    }

    // No duplicates found, create new pending pack
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    const firestoreData: FirestorePendingPack = {
      name: packData.name,
      price: packData.price,
      energy_pots: packData.energy_pots,
      raw_energy: packData.raw_energy,
      total_energy: packData.total_energy,
      cost_per_energy: packData.cost_per_energy,
      items: packData.items,
      submitter_id: submitterId,
      submitter_email: submitterEmail,
      confirmations: [submitterId],
      confirmation_count: 1,
      status: 'pending',
      submitted_at: now,
      expires_at: expiresAt,
      pack_signature: signature
    };

    const docRef = await addDoc(collection(db, 'pending_packs'), firestoreData);

    return {
      success: true,
      packId: docRef.id,
      message: 'Pack submitted successfully! It will be approved once 2 more users confirm it.',
      duplicateFound: false
    };

  } catch (error) {
    console.error('Error submitting pack:', error);
    return {
      success: false,
      message: 'Failed to submit pack. Please try again.'
    };
  }
};

// Get all pending packs
export const getPendingPacks = async (): Promise<PendingPack[]> => {
  try {
    // Try the optimized query first (requires composite index)
    const q = query(
      collection(db, 'pending_packs'),
      where('status', '==', 'pending'),
      orderBy('submitted_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submitted_at: doc.data().submitted_at.toDate(),
      expires_at: doc.data().expires_at.toDate()
    } as PendingPack));
  } catch (error) {
    console.error('Error with optimized query, trying fallback:', error);
    
    // Fallback: use simpler query without orderBy if index is still building
    try {
      const fallbackQuery = query(
        collection(db, 'pending_packs'),
        where('status', '==', 'pending')
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const packs = fallbackSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submitted_at: doc.data().submitted_at.toDate(),
        expires_at: doc.data().expires_at.toDate()
      } as PendingPack));
      
      // Sort in memory since we can't use orderBy
      return packs.sort((a, b) => b.submitted_at.getTime() - a.submitted_at.getTime());
    } catch (fallbackError) {
      console.error('Error with fallback query:', fallbackError);
      return [];
    }
  }
};

// Confirm an existing pending pack
export const confirmPendingPack = async (packId: string, userId: string): Promise<{ success: boolean; message: string; approved?: boolean }> => {
  try {
    const packRef = doc(db, 'pending_packs', packId);
    const packDoc = await getDoc(packRef);
    
    if (!packDoc.exists()) {
      return { success: false, message: 'Pack not found' };
    }

    const packData = packDoc.data() as FirestorePendingPack;
    
    if (packData.status !== 'pending') {
      return { success: false, message: 'Pack is no longer pending' };
    }

    if (packData.confirmations.includes(userId)) {
      return { success: false, message: 'You have already confirmed this pack' };
    }

    const updatedConfirmations = [...packData.confirmations, userId];
    const newConfirmationCount = updatedConfirmations.length;

    await updateDoc(packRef, {
      confirmations: updatedConfirmations,
      confirmation_count: newConfirmationCount
    });

    // Auto-approve if we have enough confirmations
    if (newConfirmationCount >= 3) {
      await approvePendingPack(packId);
      return {
        success: true,
        message: 'Pack confirmed and approved! Thank you for contributing.',
        approved: true
      };
    }

    return {
      success: true,
      message: `Pack confirmed! ${3 - newConfirmationCount} more confirmation(s) needed for approval.`,
      approved: false
    };

  } catch (error) {
    console.error('Error confirming pack:', error);
    return { success: false, message: 'Failed to confirm pack' };
  }
};

// Approve a pending pack (move to main packs collection)
export const approvePendingPack = async (packId: string): Promise<boolean> => {
  try {
    const pendingRef = doc(db, 'pending_packs', packId);
    const pendingDoc = await getDoc(pendingRef);
    
    if (!pendingDoc.exists()) {
      return false;
    }

    const pendingData = pendingDoc.data() as FirestorePendingPack;

    // Create approved pack in main collection
    const approvedPack: Omit<FirebasePack, 'id'> = {
      name: pendingData.name,
      price: pendingData.price,
      energy_pots: pendingData.energy_pots,
      raw_energy: pendingData.raw_energy,
      total_energy: pendingData.total_energy,
      cost_per_energy: pendingData.cost_per_energy,
      items: pendingData.items,
      created_at: Timestamp.now()
    };

    await addDoc(collection(db, 'packs'), approvedPack);

    // Update pending pack status
    await updateDoc(pendingRef, {
      status: 'confirmed'
    });

    return true;
  } catch (error) {
    console.error('Error approving pack:', error);
    return false;
  }
};

// Clean up expired pending packs
export const cleanupExpiredPacks = async (): Promise<number> => {
  try {
    const now = Timestamp.now();
    const expiredQuery = query(
      collection(db, 'pending_packs'),
      where('expires_at', '<', now),
      where('status', '==', 'pending')
    );

    const expiredDocs = await getDocs(expiredQuery);
    let deletedCount = 0;

    for (const doc of expiredDocs.docs) {
      await deleteDoc(doc.ref);
      deletedCount++;
    }

    return deletedCount;
  } catch (error) {
    console.error('Error cleaning up expired packs:', error);
    return 0;
  }
};

// Delete a specific pending pack (admin function)
export const deletePendingPack = async (packId: string): Promise<boolean> => {
  try {
    const packRef = doc(db, 'pending_packs', packId);
    await deleteDoc(packRef);
    return true;
  } catch (error) {
    console.error('Error deleting pending pack:', error);
    return false;
  }
};
