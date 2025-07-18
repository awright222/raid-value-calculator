import type { FirebasePack } from '../firebase/database';

export interface PendingPack extends Omit<FirebasePack, 'id' | 'created_at'> {
  id?: string;
  submitter_id: string;
  submitter_email?: string;
  confirmations: string[]; // Array of user IDs who confirmed this pack
  confirmation_count: number;
  status: 'pending' | 'confirmed' | 'rejected';
  submitted_at: Date;
  expires_at: Date; // Auto-expire if not confirmed within 7 days
}

// Similarity threshold for considering packs as duplicates
const SIMILARITY_THRESHOLD = 0.85;

// Calculate similarity between two pack names using Levenshtein distance
function calculateNameSimilarity(name1: string, name2: string): number {
  const s1 = name1.toLowerCase().trim();
  const s2 = name2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const matrix: number[][] = [];
  const len1 = s1.length;
  const len2 = s2.length;
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);
  return maxLength === 0 ? 1.0 : 1 - (distance / maxLength);
}

// Check if items arrays are identical
function areItemsIdentical(items1?: Array<{itemTypeId: string; quantity: number}>, items2?: Array<{itemTypeId: string; quantity: number}>): boolean {
  if (!items1 && !items2) return true;
  if (!items1 || !items2) return false;
  if (items1.length !== items2.length) return false;
  
  // Sort both arrays by itemTypeId for comparison
  const sorted1 = [...items1].sort((a, b) => a.itemTypeId.localeCompare(b.itemTypeId));
  const sorted2 = [...items2].sort((a, b) => a.itemTypeId.localeCompare(b.itemTypeId));
  
  return sorted1.every((item1, index) => {
    const item2 = sorted2[index];
    return item1.itemTypeId === item2.itemTypeId && item1.quantity === item2.quantity;
  });
}

// Check if two packs are likely duplicates
export function arePacksLikelyDuplicates(pack1: PendingPack, pack2: PendingPack): boolean {
  // Check name similarity
  const nameSimilarity = calculateNameSimilarity(pack1.name, pack2.name);
  if (nameSimilarity < SIMILARITY_THRESHOLD) return false;
  
  // Check if price is exactly the same
  if (pack1.price !== pack2.price) return false;
  
  // Check if energy values are the same
  if (pack1.energy_pots !== pack2.energy_pots || pack1.raw_energy !== pack2.raw_energy) return false;
  
  // Check if additional items are identical
  if (!areItemsIdentical(pack1.items, pack2.items)) return false;
  
  return true;
}

// Find potential duplicates in a list of pending packs
export function findPotentialDuplicates(newPack: PendingPack, existingPacks: PendingPack[]): PendingPack[] {
  return existingPacks.filter(pack => 
    pack.id !== newPack.id && 
    arePacksLikelyDuplicates(newPack, pack)
  );
}

// Generate a unique pack signature for exact matching
export function generatePackSignature(pack: Omit<PendingPack, 'id' | 'submitter_id' | 'submitter_email' | 'confirmations' | 'confirmation_count' | 'status' | 'submitted_at' | 'expires_at'>): string {
  const items = pack.items ? 
    [...pack.items]
      .sort((a, b) => a.itemTypeId.localeCompare(b.itemTypeId))
      .map(item => `${item.itemTypeId}:${item.quantity}`)
      .join(',') : '';
  
  return `${pack.name.toLowerCase().trim()}|${pack.price}|${pack.energy_pots}|${pack.raw_energy}|${items}`;
}

// Validate pack data for obvious spam/fake entries
export function validatePackData(pack: Omit<PendingPack, 'id' | 'submitter_id' | 'submitter_email' | 'confirmations' | 'confirmation_count' | 'status' | 'submitted_at' | 'expires_at'>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!pack.name || pack.name.trim().length < 3) {
    errors.push('Pack name must be at least 3 characters long');
  }
  
  if (pack.price <= 0) {
    errors.push('Pack price must be greater than 0');
  }
  
  if (pack.price > 1000) {
    errors.push('Pack price seems unusually high (over $1000)');
  }
  
  if (pack.energy_pots < 0 || pack.raw_energy < 0) {
    errors.push('Energy values cannot be negative');
  }
  
  if (pack.energy_pots === 0 && pack.raw_energy === 0 && (!pack.items || pack.items.length === 0)) {
    errors.push('Pack must contain at least some energy or items');
  }
  
  // Check for suspiciously good deals (potential fake data)
  const totalEnergy = pack.energy_pots * 130 + pack.raw_energy;
  if (totalEnergy > 0) {
    const costPerEnergy = pack.price / totalEnergy;
    if (costPerEnergy < 0.001) { // Less than $0.001 per energy
      errors.push('Energy cost seems unrealistically low');
    }
    if (costPerEnergy > 1) { // More than $1 per energy
      errors.push('Energy cost seems unrealistically high');
    }
  }
  
  // Validate items if present
  if (pack.items) {
    for (const item of pack.items) {
      if (!item.itemTypeId || item.itemTypeId.trim().length === 0) {
        errors.push('All items must have a valid type');
      }
      if (item.quantity <= 0) {
        errors.push('All items must have a positive quantity');
      }
      if (item.quantity > 10000) {
        errors.push('Item quantities seem unusually high');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
