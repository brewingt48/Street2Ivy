import React, { useState, useCallback } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import {
  Page,
  LayoutSingleColumn,
  PaginationLinks,
} from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import CompanyCard from './CompanyCard';
import { searchCompanies } from './SearchCompaniesPage.duck';

import css from './SearchCompaniesPage.module.css';

// Filter options (matching configUser.js)
const STATE_OPTIONS = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' }, { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'government', label: 'Government' },
  { value: 'energy', label: 'Energy' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'legal', label: 'Legal' },
  { value: 'startups', label: 'Startups' },
];

const SIZE_OPTIONS = [
  { value: 'startup', label: '1-10 employees' },
  { value: 'small', label: '11-50 employees' },
  { value: 'medium', label: '51-200 employees' },
  { value: 'large', label: '201-1000 employees' },
  { value: 'enterprise', label: '1000+ employees' },
];

const getFilterValueFromUrl = (search, key) => {
  const params = new URLSearchParams(search);
  return params.get(key) || '';
};

const SearchCompaniesPageComponent = props => {
  const {
    scrollingDisabled,
    users,
    pagination,
    searchInProgress,
    searchError,
    currentUser,
    onSearchCompanies,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();

  const [filters, setFilters] = useState({
    industry: getFilterValueFromUrl(location.search, 'industry'),
    companySize: getFilterValueFromUrl(location.search, 'companySize'),
    state: getFilterValueFromUrl(location.search, 'state'),
  });

  // Access check: only students can access this page
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const isStudent = publicData?.userType === 'student';

  const applyFilters = useCallback(
    (newFilters, page) => {
      const params = {};
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      if (page && page > 1) params.page = page;

      const queryString = new URLSearchParams(params).toString();
      history.push({
        pathname: '/search/companies',
        search: queryString ? `?${queryString}` : '',
      });

      onSearchCompanies(params);
    },
    [history, onSearchCompanies]
  );

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = { industry: '', companySize: '', state: '' };
    setFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  const title = intl.formatMessage({ id: 'SearchCompaniesPage.title' });
  const hasFiltersActive = Object.values(filters).some(v => !!v);

  // Access control
  if (currentUser && !isStudent) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn
          topbar={<TopbarContainer />}
          footer={<FooterContainer />}
        >
          <div className={css.noAccess}>
            <h1><FormattedMessage id="SearchCompaniesPage.noAccessTitle" /></h1>
            <p><FormattedMessage id="SearchCompaniesPage.noAccessMessage" /></p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.pageContent}>
          <h1 className={css.pageHeading}>
            <FormattedMessage id="SearchCompaniesPage.heading" />
          </h1>

          {/* Filter Bar */}
          <div className={css.filterBar}>
            <div className={css.filterRow}>
              {/* Industry filter */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchCompaniesPage.filterIndustry" />
                </label>
                <select
                  className={css.filterSelect}
                  value={filters.industry}
                  onChange={e => handleFilterChange('industry', e.target.value)}
                >
                  <option value="">All Industries</option>
                  {INDUSTRY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Size filter */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchCompaniesPage.filterSize" />
                </label>
                <select
                  className={css.filterSelect}
                  value={filters.companySize}
                  onChange={e => handleFilterChange('companySize', e.target.value)}
                >
                  <option value="">All Sizes</option>
                  {SIZE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* State filter */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchCompaniesPage.filterState" />
                </label>
                <select
                  className={css.filterSelect}
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">All States</option>
                  {STATE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset button */}
              {hasFiltersActive && (
                <div className={css.filterItem}>
                  <label className={css.filterLabel}>&nbsp;</label>
                  <button
                    className={css.resetButton}
                    onClick={handleResetFilters}
                    type="button"
                  >
                    <FormattedMessage id="SearchCompaniesPage.resetFilters" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className={css.resultsSection}>
            {searchInProgress && (
              <p className={css.loadingMessage}>
                <FormattedMessage id="SearchCompaniesPage.loading" />
              </p>
            )}

            {searchError && (
              <p className={css.errorMessage}>
                <FormattedMessage id="SearchCompaniesPage.searchError" />
              </p>
            )}

            {!searchInProgress && !searchError && users.length === 0 && (
              <div className={css.noResults}>
                <h3><FormattedMessage id="SearchCompaniesPage.noResultsTitle" /></h3>
                <p><FormattedMessage id="SearchCompaniesPage.noResultsMessage" /></p>
              </div>
            )}

            {!searchInProgress && users.length > 0 && (
              <>
                <p className={css.resultCount}>
                  <FormattedMessage
                    id="SearchCompaniesPage.resultCount"
                    values={{ count: pagination?.totalItems || users.length }}
                  />
                </p>
                <div className={css.resultsGrid}>
                  {users.map(user => (
                    <CompanyCard key={user.id} user={user} />
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <PaginationLinks
                    className={css.pagination}
                    pageName="SearchCompaniesPage"
                    pageSearchParams={Object.fromEntries(
                      new URLSearchParams(location.search)
                    )}
                    pagination={{
                      ...pagination,
                      paginationUnsupported: false,
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    users,
    pagination,
    searchInProgress,
    searchError,
  } = state.SearchCompaniesPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    users,
    pagination,
    searchInProgress,
    searchError,
  };
};

const mapDispatchToProps = dispatch => ({
  onSearchCompanies: params => dispatch(searchCompanies(params)),
});

const SearchCompaniesPage = compose(
  connect(mapStateToProps, mapDispatchToProps)
)(SearchCompaniesPageComponent);

export default SearchCompaniesPage;
