/**
 * Pack identification utilities to handle cases where Raid reuses pack names
 * but changes the contents. This helps maintain data integrity and accurate pricing.
 */

import type { PackItem } from '../types/itemTypes';

/**
 * Generate a unique content hash for a pack based on its items
 * This helps identify when the same pack name has different contents
 */
export const generatePackContentHash = (items: PackItem[]): string => {
  // Sort items by itemTypeId to ensure consistent hashing regardless of order
  const sortedItems = [...items].sort((a, b) => a.itemTypeId.localeCompare(b.itemTypeId));
  
  // Create a string representation of the pack contents
  const contentString = sortedItems
    .map(item => `${item.itemTypeId}:${item.quantity}`)
    .join('|');
  
  // Simple hash function (could be replaced with a proper hash library if needed)
  let hash = 0;
  for (let i = 0; i < contentString.length; i++) {
    const char = contentString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36); // Convert to base36 for shorter string
};

/**
 * Generate a unique pack identifier that includes both name and content
 */
export const generatePackIdentifier = (packName: string, items: PackItem[]): string => {
  const contentHash = generatePackContentHash(items);
  const sanitizedName = packName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${sanitizedName}_${contentHash}`;
};

/**
 * Check if two packs have the same content (ignoring pack name and price)
 */
export const packsHaveSameContent = (pack1: PackItem[], pack2: PackItem[]): boolean => {
  return generatePackContentHash(pack1) === generatePackContentHash(pack2);
};

/**
 * Detect potential pack name reuse by finding packs with same name but different content
 */
export const detectPackNameReuse = (
  newPack: { name: string; items: PackItem[] },
  existingPacks: Array<{ name: string; items: PackItem[]; created_at: Date }>
): {
  isReusedName: boolean;
  conflictingPacks: Array<{ name: string; items: PackItem[]; created_at: Date }>;
  recommendation: string;
} => {
  const packsWithSameName = existingPacks.filter(
    pack => pack.name.toLowerCase() === newPack.name.toLowerCase()
  );
  
  if (packsWithSameName.length === 0) {
    return {
      isReusedName: false,
      conflictingPacks: [],
      recommendation: 'New pack name - safe to add.'
    };
  }
  
  const newPackHash = generatePackContentHash(newPack.items);
  const conflictingPacks = packsWithSameName.filter(
    pack => generatePackContentHash(pack.items) !== newPackHash
  );
  
  if (conflictingPacks.length === 0) {
    return {
      isReusedName: false,
      conflictingPacks: [],
      recommendation: 'Pack name exists with same content - this is likely a duplicate or price update.'
    };
  }
  
  // Find the most recent conflicting pack
  const mostRecentConflict = conflictingPacks.reduce((latest, current) => 
    current.created_at > latest.created_at ? current : latest
  );
  
  const daysSinceLastVersion = Math.floor(
    (Date.now() - mostRecentConflict.created_at.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return {
    isReusedName: true,
    conflictingPacks,
    recommendation: `⚠️ PACK NAME REUSED: "${newPack.name}" has different contents than previous versions. ` +
      `Last different version was ${daysSinceLastVersion} days ago. ` +
      `Consider adding date/version suffix to distinguish pack variants.`
  };
};

/**
 * Suggest a unique pack name when content changes are detected
 */
export const suggestUniquePackName = (
  originalName: string,
  _items: PackItem[], // items parameter kept for future use but prefixed with _ to indicate intentionally unused
  conflictingPacks: Array<{ name: string; items: PackItem[]; created_at: Date }>
): string => {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Try different naming strategies
  const suggestions = [
    `${originalName} (${dateString})`,
    `${originalName} v${conflictingPacks.length + 1}`,
    `${originalName} - ${today.getMonth() + 1}/${today.getFullYear()}`
  ];
  
  return suggestions[0]; // Return the date-based suggestion as default
};

/**
 * Enhanced pack validation that includes content change detection
 */
export const validatePackSubmission = (
  packData: { name: string; price: number; items: PackItem[] },
  existingPacks: Array<{ name: string; price: number; items: PackItem[]; created_at: Date }>
): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
  enhancedPackData: {
    originalName: string;
    suggestedName: string;
    contentHash: string;
    packIdentifier: string;
  };
} => {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check for pack name reuse
  const reuseDetection = detectPackNameReuse(packData, existingPacks);
  
  if (reuseDetection.isReusedName) {
    warnings.push(reuseDetection.recommendation);
    const suggestedName = suggestUniquePackName(
      packData.name,
      packData.items,
      reuseDetection.conflictingPacks
    );
    suggestions.push(`Consider renaming to: "${suggestedName}"`);
  }
  
  // Check for potential duplicates (same content, similar price)
  const similarPacks = existingPacks.filter(pack => {
    const isSameContent = packsHaveSameContent(pack.items, packData.items);
    const isSimilarPrice = Math.abs(pack.price - packData.price) < 1.0; // Within $1
    return isSameContent && isSimilarPrice;
  });
  
  if (similarPacks.length > 0) {
    warnings.push(`Similar pack already exists - this might be a duplicate.`);
    suggestions.push(`Check if this is a price update rather than a new pack.`);
  }
  
  const contentHash = generatePackContentHash(packData.items);
  const packIdentifier = generatePackIdentifier(packData.name, packData.items);
  const suggestedName = reuseDetection.isReusedName 
    ? suggestUniquePackName(packData.name, packData.items, reuseDetection.conflictingPacks)
    : packData.name;
  
  return {
    isValid: warnings.length === 0 || warnings.every(w => !w.includes('⚠️')),
    warnings,
    suggestions,
    enhancedPackData: {
      originalName: packData.name,
      suggestedName,
      contentHash,
      packIdentifier
    }
  };
};
