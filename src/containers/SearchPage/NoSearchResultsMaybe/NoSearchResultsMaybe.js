import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './NoSearchResultsMaybe.module.css';

const NoSearchResultsMaybe = props => {
  const { listingsAreLoaded, totalItems, location, resetAll, showCreateListingsLink } = props;
  const hasNoResult = listingsAreLoaded && totalItems === 0;
  const hasSearchParams = location.search?.length > 0;

  // Check if we're on a project search page
  // Path is /s/project for SearchPageWithListingType
  const isProjectSearch = location.pathname?.includes('/s/project') ||
    location.pathname?.includes('/project') ||
    location.search?.includes('listingType=project');

  const createListingLinkMaybe = showCreateListingsLink ? (
    <NamedLink className={css.createListingLink} name="NewListingPage">
      <FormattedMessage id="SearchPage.createListing" />
    </NamedLink>
  ) : null;

  if (!hasNoResult) {
    return null;
  }

  return (
    <div className={css.noSearchResults}>
      <div className={css.emptyStateIcon}>
        {isProjectSearch ? '📋' : '🔍'}
      </div>
      <h3 className={css.emptyStateTitle}>
        {isProjectSearch ? (
          <FormattedMessage
            id="SearchPage.noProjectsTitle"
            defaultMessage="No Projects Available"
          />
        ) : (
          <FormattedMessage id="SearchPage.noResults" />
        )}
      </h3>
      <p className={css.emptyStateDescription}>
        {isProjectSearch ? (
          <FormattedMessage
            id="SearchPage.noProjectsDescription"
            defaultMessage="There are currently no open projects available. Check back soon as new opportunities are posted regularly by our corporate partners."
          />
        ) : (
          <FormattedMessage
            id="SearchPage.noResultsDescription"
            defaultMessage="We couldn't find any results matching your search criteria."
          />
        )}
      </p>

      {hasSearchParams && (
        <button className={css.resetAllFiltersButton} onClick={e => resetAll(e)}>
          <FormattedMessage id={'SearchPage.resetAllFilters'} />
        </button>
      )}

      <div className={css.emptyStateActions}>
        {isProjectSearch && (
          <NamedLink className={css.browseCompaniesLink} name="SearchCompaniesPage">
            <FormattedMessage
              id="SearchPage.browseCompanies"
              defaultMessage="Browse Companies"
            />
          </NamedLink>
        )}
        <NamedLink className={css.backToDashboardLink} name="StudentDashboardPage">
          <FormattedMessage
            id="SearchPage.backToDashboard"
            defaultMessage="Back to Dashboard"
          />
        </NamedLink>
      </div>

      {createListingLinkMaybe && <p>{createListingLinkMaybe}</p>}
    </div>
  );
};

export default NoSearchResultsMaybe;
