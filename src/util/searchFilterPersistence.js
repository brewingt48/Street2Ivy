/**
 * Search Filter Persistence Utility
 *
 * Saves and restores user's search filters using localStorage.
 * This improves UX by remembering user's preferred filters across sessions.
 */

const STORAGE_KEY = 'street2ivy_search_filters';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Filter keys that should be persisted
 * Excludes pagination, bounds, and other temporary params
 */
const PERSISTABLE_FILTER_KEYS = [
  // Category filters
  'pub_categoryLevel1',
  'pub_categoryLevel2',
  'pub_categoryLevel3',
  'pub_listingType',

  // Industry/skill filters
  'pub_companySector',
  'pub_requiredSkills',

  // Project filters
  'pub_projectType',
  'pub_experienceLevel',
  'pub_workMode',
  'pub_compensationType',
  'pub_projectDuration',
  'pub_estimatedHours',
  'pub_studentsNeeded',
  'pub_majorPreference',

  // Sort
  'sort',
];

/**
 * Check if localStorage is available
 */
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Save search filters to localStorage
 *
 * @param {Object} filters - Current search filters
 * @param {string} [searchType='listings'] - Type of search (listings, users, etc.)
 */
export const saveSearchFilters = (filters, searchType = 'listings') => {
  if (!isLocalStorageAvailable()) return;

  try {
    // Filter to only persistable keys
    const persistableFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (PERSISTABLE_FILTER_KEYS.includes(key) && value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    // Don't save if no filters
    if (Object.keys(persistableFilters).length === 0) {
      clearSearchFilters(searchType);
      return;
    }

    const stored = getStoredData();
    stored[searchType] = {
      filters: persistableFilters,
      savedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error('Error saving search filters:', error);
  }
};

/**
 * Load saved search filters from localStorage
 *
 * @param {string} [searchType='listings'] - Type of search
 * @returns {Object|null} - Saved filters or null if none/expired
 */
export const loadSearchFilters = (searchType = 'listings') => {
  if (!isLocalStorageAvailable()) return null;

  try {
    const stored = getStoredData();
    const data = stored[searchType];

    if (!data) return null;

    // Check if filters have expired
    if (Date.now() - data.savedAt > MAX_AGE_MS) {
      clearSearchFilters(searchType);
      return null;
    }

    return data.filters;
  } catch (error) {
    console.error('Error loading search filters:', error);
    return null;
  }
};

/**
 * Clear saved search filters
 *
 * @param {string} [searchType='listings'] - Type of search to clear
 */
export const clearSearchFilters = (searchType = 'listings') => {
  if (!isLocalStorageAvailable()) return;

  try {
    const stored = getStoredData();
    delete stored[searchType];

    if (Object.keys(stored).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }
  } catch (error) {
    console.error('Error clearing search filters:', error);
  }
};

/**
 * Clear all saved search filters
 */
export const clearAllSearchFilters = () => {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing all search filters:', error);
  }
};

/**
 * Get stored data from localStorage
 */
const getStoredData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
};

/**
 * Check if there are any saved filters
 *
 * @param {string} [searchType='listings'] - Type of search
 * @returns {boolean}
 */
export const hasSavedFilters = (searchType = 'listings') => {
  const filters = loadSearchFilters(searchType);
  return filters !== null && Object.keys(filters).length > 0;
};

/**
 * Merge saved filters with URL params
 * URL params take precedence over saved filters
 *
 * @param {Object} urlParams - Current URL search params
 * @param {string} [searchType='listings'] - Type of search
 * @returns {Object} - Merged filters
 */
export const mergeWithSavedFilters = (urlParams, searchType = 'listings') => {
  const savedFilters = loadSearchFilters(searchType);

  if (!savedFilters) return urlParams;

  // URL params take precedence
  // Only apply saved filters if no filter params in URL
  const hasUrlFilters = Object.keys(urlParams).some(key =>
    PERSISTABLE_FILTER_KEYS.includes(key)
  );

  if (hasUrlFilters) {
    // Save the new URL filters
    saveSearchFilters(urlParams, searchType);
    return urlParams;
  }

  // Apply saved filters
  return { ...savedFilters, ...urlParams };
};

/**
 * Create a "restore filters" action for UI
 * Returns the URL params needed to restore saved filters
 *
 * @param {string} [searchType='listings'] - Type of search
 * @returns {Object|null} - Filters to restore or null
 */
export const getRestorableFilters = (searchType = 'listings') => {
  return loadSearchFilters(searchType);
};

export default {
  saveSearchFilters,
  loadSearchFilters,
  clearSearchFilters,
  clearAllSearchFilters,
  hasSavedFilters,
  mergeWithSavedFilters,
  getRestorableFilters,
};
