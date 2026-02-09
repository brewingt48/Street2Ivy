//////////////////////////////////////////////////////////////////////
// Configurations related to search                                 //
// Note: some search experience is also on defaultMapsConfig        //
// and defaultListingConfig.js is responsible public data filtering //
//////////////////////////////////////////////////////////////////////

// NOTE: if you want to change the structure of the data,
// you should also check src/util/configHelpers.js
// some validation is added there.

// Main search used in Topbar.
// This can be either 'keywords' or 'location'.
// Note: The mainSearch comes from the listing-search asset nowadays by default.
//       To use this built-in configuration, you need to remove the overwrite from configHelper.js (mergeSearchConfig func)
export const mainSearch = {
  searchType: 'location',
};

/**
 * Configuration for default filters.
 * These are custom configs for each filter.
 * Common properties: key, schemaType, and label.
 * Note: the order of default filters is defined in util/configHelpers.js
 * To use this built-in configuration, you need to remove the overwrite from configHelper.js (mergeSearchConfig func)
 */

export const listingTypeFilter = {
  enabled: false,
  schemaType: 'listingType',
  // schemaType, key, and other built-in config values are completely filled in configHelper.js
};

export const categoryFilter = {
  enabled: false,
  schemaType: 'category',
  // schemaType, key, and other built-in config values are completely filled in configHelper.js
};

// Street2Ivy: Date range filter disabled — project listings don't use date-based availability.
// Projects use application deadlines (custom enum field) instead.
export const dateRangeFilter = {
  schemaType: 'dates',
  enabled: false,
  availability: 'time-full',
  dateRangeMode: 'day',
};

/**
 * Note: the order of default filters is defined in util/configHelpers.js
 * To use this built-in configuration, you need to remove the overwrite from configHelper.js (mergeSearchConfig func)
 */
// Street2Ivy: Price filter disabled — project listings use compensationType (enum) instead
// of Sharetribe's built-in price field. CompensationType is a custom listing field filter.
export const priceFilter = {
  schemaType: 'price',
  enabled: false,
  min: 0,
  max: 1000,
  step: 5,
};
// Enable keyword search filter for project title/description matching
export const keywordsFilter = {
  key: 'keywords',
  schemaType: 'keywords',
  enabled: true,
};

export const sortConfig = {
  // Enable/disable the sorting control in the SearchPage
  active: true,

  // Note: queryParamName 'sort' is fixed,
  // you can't change it since Marketplace API expects it to be named as 'sort'
  queryParamName: 'sort',

  // Internal key for the relevance option, see notes below.
  relevanceKey: 'relevance',

  // Relevance key is used with keywords filter.
  // Keywords filter also sorts results according to relevance.
  relevanceFilter: 'keywords',

  // Keyword filter is sorting the results by relevance.
  // If keyword filter is active, one might want to disable other sorting options
  // by adding 'keywords' to this list.
  conflictingFilters: ['keywords'],

  options: [
    // Sort by newest first (default for browsing projects)
    { key: 'createdAt', labelTranslationKey: 'SortBy.newest' },
    { key: '-createdAt', labelTranslationKey: 'SortBy.oldest' },

    // The relevance is only used for keyword search, but the
    // parameter isn't sent to the Marketplace API. The key is purely
    // for handling the internal state of the sorting dropdown.
    {
      key: 'relevance',
      labelTranslationKey: 'SortBy.relevance',
      labelTranslationKeyLong: 'SortBy.relevanceLong',
    },
  ],
};
