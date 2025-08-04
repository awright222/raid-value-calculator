import { 
  collection, 
  doc,
  getDocs, 
  setDoc,
  updateDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from './config';
import type { ItemType } from '../types/itemTypes';

// Get all item types from Firebase
export const getItemTypesFromFirebase = async (): Promise<ItemType[]> => {
  try {
    console.log('Attempting to fetch item types from Firebase...');
    const itemTypesQuery = query(
      collection(db, 'item_types'),
      orderBy('name')
    );
    
    const snapshot = await getDocs(itemTypesQuery);
    const itemTypes: ItemType[] = [];
    
    snapshot.forEach((doc) => {
      itemTypes.push({
        id: doc.id,
        ...doc.data()
      } as ItemType);
    });
    
    console.log(`Successfully loaded ${itemTypes.length} item types from Firebase`);
    return itemTypes;
  } catch (error) {
    console.error('Error fetching item types from Firebase:', error);
    // If it's a permission error or collection doesn't exist, return empty array
    if (error instanceof Error && (error.message.includes('permission') || error.message.includes('not found'))) {
      console.log('Collection may not exist yet, returning empty array');
      return [];
    }
    throw error;
  }
};

// Update a single item type's utility score
export const updateItemTypeUtilityScore = async (itemId: string, utilityScore: number): Promise<void> => {
  try {
    console.log(`Updating utility score for ${itemId} to ${utilityScore}`);
    const itemRef = doc(db, 'item_types', itemId);
    await updateDoc(itemRef, {
      utilityScore: utilityScore
    });
    console.log(`Successfully updated ${itemId} utility score`);
  } catch (error) {
    console.error(`Error updating item type ${itemId} utility score:`, error);
    throw error;
  }
};

// Batch update multiple item types' utility scores
export const updateMultipleItemTypeUtilityScores = async (updates: Record<string, number>): Promise<void> => {
  try {
    const promises = Object.entries(updates).map(([itemId, utilityScore]) =>
      updateItemTypeUtilityScore(itemId, utilityScore)
    );
    
    await Promise.all(promises);
  } catch (error) {
    console.error('Error updating multiple item type utility scores:', error);
    throw error;
  }
};

// Initialize item types in Firebase (run once to seed the database)
export const initializeItemTypesInFirebase = async (itemTypes: ItemType[]): Promise<void> => {
  try {
    const promises = itemTypes.map(async (itemType) => {
      const itemRef = doc(db, 'item_types', itemType.id);
      await setDoc(itemRef, itemType);
    });
    
    await Promise.all(promises);
    console.log('Item types initialized in Firebase successfully');
  } catch (error) {
    console.error('Error initializing item types in Firebase:', error);
    throw error;
  }
};

// Check if item types exist in Firebase
export const checkItemTypesExistInFirebase = async (): Promise<boolean> => {
  try {
    console.log('Checking if item types exist in Firebase...');
    const snapshot = await getDocs(collection(db, 'item_types'));
    const exists = !snapshot.empty;
    console.log(`Item types exist in Firebase: ${exists} (${snapshot.size} documents)`);
    return exists;
  } catch (error) {
    console.error('Error checking if item types exist in Firebase:', error);
    // If there's an error accessing the collection, assume it doesn't exist
    return false;
  }
};
