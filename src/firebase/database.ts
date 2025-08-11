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
import { validatePackSubmission, generatePackContentHash, generatePackIdentifier } from '../utils/packIdentification';
import { 
  addPackDataHistory,
  type PackDataHistory 
} from './historical';

export interface FirebasePack {
  id?: string;
  name: string;                    // Display name (what user sees)
  storage_name?: string;           // Internal storage name with version suffix if needed
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
  // Enhanced identification fields (optional for backward compatibility)
  content_hash?: string;           // Unique hash based on pack contents
  pack_identifier?: string;        // Unique identifier combining name and content
  display_name?: string;           // Original user-entered name (always shown to users)
  version_number?: number;         // Auto-incremented version if name was reused
  is_content_variant?: boolean;    // True if this pack name has been used with different contents
}

// Add a new pack to Firestore (direct write, no validation)
export const addPack = async (packData: {
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
}): Promise<string> => {
  try {
    // Create pack data for direct write
    const firebasePackData: Omit<FirebasePack, 'id'> = {
      name: packData.name,
      price: packData.price,
      energy_pots: packData.energy_pots,
      raw_energy: packData.raw_energy,
      total_energy: packData.total_energy,
      cost_per_energy: packData.cost_per_energy,
      items: packData.items || [],
      created_at: Timestamp.now(),
      // Add basic identification fields
      display_name: packData.name,
      storage_name: packData.name,
      version_number: 1,
      is_content_variant: false
    };

    // Direct write to Firestore
    const docRef = await addDoc(collection(db, 'packs'), firebasePackData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

// Enhanced pack addition with content validation and automatic version handling
export const addPackWithValidation = async (
  packData: Omit<FirebasePack, 'id' | 'created_at' | 'content_hash' | 'pack_identifier' | 'display_name' | 'storage_name' | 'version_number' | 'is_content_variant'>
): Promise<{
  id: string;
  warnings: string[];
  suggestions: string[];
  finalPackData: FirebasePack;
}> => {
  try {
    // Get existing packs for validation
    const existingPacks = await getAllPacks();
    const existingPacksForValidation = existingPacks.map(pack => ({
      name: pack.display_name || pack.name, // Use display_name if available, fallback to name
      price: pack.price,
      items: pack.items || [],
      created_at: pack.created_at.toDate()
    }));

    // Validate the pack submission
    const validation = validatePackSubmission(
      {
        name: packData.name,
        price: packData.price,
        items: packData.items || []
      },
      existingPacksForValidation
    );

    // Generate identification fields
    const contentHash = generatePackContentHash(packData.items || []);
    const userEnteredName = packData.name;
    
    // Determine if this is a content variant and auto-assign version number
    const isContentVariant = validation.warnings.some(w => w.includes('PACK NAME REUSED'));
    let versionNumber = 1;
    let storageName = userEnteredName;
    
    if (isContentVariant) {
      // Find existing versions of this pack name
      const sameNamePacks = existingPacks.filter(pack => 
        (pack.display_name || pack.name) === userEnteredName
      );
      
      // Auto-increment version number
      versionNumber = sameNamePacks.length + 1;
      storageName = `${userEnteredName} v${versionNumber}`;
    }
    
    const packIdentifier = generatePackIdentifier(storageName, packData.items || []);

    // Create the enhanced pack data with automatic versioning
    const enhancedPackData: Omit<FirebasePack, 'id'> = {
      ...packData,
      name: storageName,              // Internal storage name with version
      storage_name: storageName,      // Explicit storage name  
      display_name: userEnteredName,  // What user entered (always show this)
      content_hash: contentHash,
      pack_identifier: packIdentifier,
      version_number: versionNumber,
      is_content_variant: isContentVariant,
      created_at: Timestamp.now()
    };

    // Add to database
    const docRef = await addDoc(collection(db, 'packs'), enhancedPackData);

    // Add pack data to historical tracking for market intelligence
    try {
      const packHistoryData: Omit<PackDataHistory, 'id' | 'created_at'> = {
        packName: userEnteredName,              // Original display name
        storageName: storageName,               // Internal versioned name
        price: packData.price,
        contentHash,
        items: (packData.items || []).map(item => ({
          itemTypeId: item.itemTypeId,
          itemName: item.itemTypeId, // Will be enhanced with actual names later
          quantity: item.quantity,
          estimatedValue: 0 // Will be calculated from market data
        })),
        packMetrics: {
          totalValue: packData.total_energy * 0.01, // Basic estimate, will be enhanced
          dollarsPerDollar: packData.total_energy / packData.price * 0.01,
          energyEquivalent: packData.total_energy,
          grade: 'Pending' // Will be calculated after analysis
        },
        versionInfo: {
          versionNumber,
          isContentVariant,
          firstSeenDate: Timestamp.now(),
          lastSeenDate: Timestamp.now()
        },
        submissionInfo: {
          submittedBy: 'admin', // Enhanced later with user auth
          submissionMethod: 'admin',
          verificationStatus: 'auto-approved'
        }
      };
      
      await addPackDataHistory(packHistoryData);
    } catch (historyError) {
      // Don't fail the entire operation if history tracking fails
    }

    // Modify warnings to be more user-friendly
    const userFriendlyWarnings = validation.warnings.map(warning => {
      if (warning.includes('PACK NAME REUSED')) {
        return `📋 Pack name "${userEnteredName}" has been used before with different contents. This has been automatically saved as version ${versionNumber} while keeping the display name unchanged.`;
      }
      return warning;
    });

    return {
      id: docRef.id,
      warnings: userFriendlyWarnings,
      suggestions: [], // Remove suggestions since we handle this automatically
      finalPackData: { ...enhancedPackData, id: docRef.id }
    };
  } catch (error) {
    throw error;
  }
};

// Get all packs from Firestore with enhanced error handling and fallback strategies
export const getAllPacks = async (): Promise<FirebasePack[]> => {
  console.log('🔥 Firebase Database: Starting getAllPacks() - SIMPLIFIED VERSION');
  
  try {
    console.log('🔥 Firebase Database: Attempting BASIC collection read (no complex queries)');
    
    // Use the most basic possible Firestore read - no orderBy, no query constraints
    const collectionRef = collection(db, 'packs');
    const querySnapshot = await getDocs(collectionRef);
    
    console.log(`🔥 Firebase Database: Basic read successful, ${querySnapshot.docs.length} documents found`);
    
    const packs = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at instanceof Timestamp ? data.created_at : Timestamp.now()
      } as FirebasePack;
    }).sort((a, b) => {
      // Sort manually in memory instead of using Firestore orderBy
      const aTime = a.created_at instanceof Timestamp ? a.created_at.seconds : 0;
      const bTime = b.created_at instanceof Timestamp ? b.created_at.seconds : 0;
      return bTime - aTime; // Newest first
    });
    
    console.log(`🔥 Firebase Database: Successfully processed ${packs.length} packs`);
    return packs;
    
  } catch (error: any) {
    console.error('❌ Firebase Database: Even basic read failed:', {
      name: error.name,
      code: error.code,
      message: error.message
    });
    
    // Return empty array to prevent app crash
    return [];
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
    throw error;
  }
};
