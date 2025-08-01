/**
 * Personal Utility Management
 * Handles user's custom utility preferences stored in localStorage
 */

export interface UserUtilityPreferences {
  [itemId: string]: number; // 1-10 scale
}

const STORAGE_KEY = 'raid_value_calc_user_utility_prefs';

/**
 * Get user's custom utility preferences from localStorage
 */
export function getUserUtilityPreferences(): UserUtilityPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to load user utility preferences:', error);
    return {};
  }
}

/**
 * Save user's utility preferences to localStorage
 */
export function saveUserUtilityPreferences(preferences: UserUtilityPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save user utility preferences:', error);
  }
}

/**
 * Get utility score for an item, using user preference if available
 */
export function getUserUtilityScore(itemId: string, defaultScore: number = 5, usePersonalized: boolean = false): number {
  if (!usePersonalized) {
    return defaultScore;
  }
  
  const preferences = getUserUtilityPreferences();
  return preferences[itemId] ?? defaultScore;
}

/**
 * Update a single item's utility score
 */
export function updateItemUtilityScore(itemId: string, score: number): void {
  const preferences = getUserUtilityPreferences();
  preferences[itemId] = Math.max(1, Math.min(10, score)); // Clamp to 1-10
  saveUserUtilityPreferences(preferences);
}

/**
 * Reset all utility preferences to defaults
 */
export function resetUtilityPreferences(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset utility preferences:', error);
  }
}

/**
 * Get count of customized items
 */
export function getCustomizedItemCount(): number {
  const preferences = getUserUtilityPreferences();
  return Object.keys(preferences).length;
}
