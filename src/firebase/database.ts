import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  where,
  limit
} from 'firebase/firestore';
import { db } from './config';

export interface FirebasePack {
  id?: string;
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
  created_at: Timestamp;
}

// Add a new pack to Firestore
export const addPack = async (packData: Omit<FirebasePack, 'id' | 'created_at'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'packs'), {
      ...packData,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding pack:', error);
    throw error;
  }
};

// Get all packs from Firestore
export const getAllPacks = async (): Promise<FirebasePack[]> => {
  try {
    const q = query(
      collection(db, 'packs'), 
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirebasePack[];
  } catch (error) {
    console.error('Error getting packs:', error);
    throw error;
  }
};

// Get similar packs for comparison
export const getSimilarPacks = async (energyRange: { min: number; max: number }): Promise<FirebasePack[]> => {
  try {
    const q = query(
      collection(db, 'packs'),
      where('total_energy', '>=', energyRange.min),
      where('total_energy', '<=', energyRange.max),
      orderBy('total_energy'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirebasePack[];
  } catch (error) {
    console.error('Error getting similar packs:', error);
    return [];
  }
};

// Analyze pack value against existing packs
export const analyzePackValue = async (totalEnergy: number, costPerEnergy: number) => {
  try {
    // Get all packs for comparison
    const allPacks = await getAllPacks();
    
    if (allPacks.length === 0) {
      return {
        grade: 'NEW' as const,
        similar_packs: [],
        comparison: {
          better_than_percent: 0,
          total_packs_compared: 0
        }
      };
    }

    // Calculate how this pack compares to others
    const betterPacks = allPacks.filter(pack => pack.cost_per_energy < costPerEnergy);
    const betterThanPercent = Math.round(((allPacks.length - betterPacks.length) / allPacks.length) * 100);
    
    // Get similar packs (within 20% energy range)
    const energyRange = {
      min: totalEnergy * 0.8,
      max: totalEnergy * 1.2
    };
    const similarPacks = await getSimilarPacks(energyRange);
    
    // Determine grade based on percentile
    let grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
    if (betterThanPercent >= 90) grade = 'S';
    else if (betterThanPercent >= 80) grade = 'A';
    else if (betterThanPercent >= 70) grade = 'B';
    else if (betterThanPercent >= 60) grade = 'C';
    else if (betterThanPercent >= 50) grade = 'D';
    else grade = 'F';

    return {
      grade,
      similar_packs: similarPacks,
      comparison: {
        better_than_percent: betterThanPercent,
        total_packs_compared: allPacks.length
      }
    };
  } catch (error) {
    console.error('Error analyzing pack value:', error);
    throw error;
  }
};
