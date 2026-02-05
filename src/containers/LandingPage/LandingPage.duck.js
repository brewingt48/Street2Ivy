// Street2Ivy: Custom landing page doesn't need hosted assets
// The page is fully custom-built with React components

export const ASSET_NAME = 'landing-page';

// No data loading needed for custom landing page
export const loadData = (params, search) => dispatch => {
  // Custom landing page - no hosted assets needed
  return Promise.resolve();
};
