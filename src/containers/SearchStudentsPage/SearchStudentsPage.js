import React, { useEffect, useState, useCallback } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { manageDisableScrolling } from '../../ducks/ui.duck';

import {
  Page,
  LayoutSingleColumn,
  PaginationLinks,
} from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import StudentCard from './StudentCard';
import InviteModal from './InviteModal';
import {
  searchStudents,
  inviteToApply,
  clearInviteState,
} from './SearchStudentsPage.duck';

import css from './SearchStudentsPage.module.css';

// Filter option definitions (matching configUser.js)
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

const SKILL_OPTIONS = [
  { value: 'leadership', label: 'Leadership' },
  { value: 'communication', label: 'Communication' },
  { value: 'data-analysis', label: 'Data Analysis' },
  { value: 'project-management', label: 'Project Management' },
  { value: 'graphic-design', label: 'Graphic Design' },
  { value: 'software-development', label: 'Software Development' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'research', label: 'Research' },
  { value: 'writing', label: 'Writing & Editing' },
  { value: 'financial-analysis', label: 'Financial Analysis' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'public-speaking', label: 'Public Speaking' },
  { value: 'event-planning', label: 'Event Planning' },
  { value: 'video-production', label: 'Video Production' },
  { value: 'ux-ui-design', label: 'UX/UI Design' },
];

const INTEREST_OPTIONS = [
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

const GRADUATION_YEAR_OPTIONS = [
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
];

const getFilterValueFromUrl = (search, key) => {
  const params = new URLSearchParams(search);
  return params.get(key) || '';
};

const SearchStudentsPageComponent = props => {
  const {
    scrollingDisabled,
    users,
    pagination,
    searchInProgress,
    searchError,
    currentUser,
    ownListings,
    inviteInProgress,
    inviteError,
    inviteSuccess,
    onSearchStudents,
    onInviteToApply,
    onClearInviteState,
    onManageDisableScrolling,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();

  // Filter state from URL
  const [filters, setFilters] = useState({
    state: getFilterValueFromUrl(location.search, 'state'),
    university: getFilterValueFromUrl(location.search, 'university'),
    major: getFilterValueFromUrl(location.search, 'major'),
    skills: getFilterValueFromUrl(location.search, 'skills'),
    interests: getFilterValueFromUrl(location.search, 'interests'),
    graduationYear: getFilterValueFromUrl(location.search, 'graduationYear'),
  });

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Check access: only corporate partners can access this page
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const isCorporatePartner = publicData?.userType === 'corporate-partner';

  const applyFilters = useCallback(
    (newFilters, page) => {
      const params = {};
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      if (page && page > 1) params.page = page;

      // Update URL
      const queryString = new URLSearchParams(params).toString();
      history.push({ pathname: '/search/students', search: queryString ? `?${queryString}` : '' });

      // Dispatch search
      onSearchStudents(params);
    },
    [history, onSearchStudents]
  );

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {
      state: '',
      university: '',
      major: '',
      skills: '',
      interests: '',
      graduationYear: '',
    };
    setFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  const handlePagination = page => {
    applyFilters(filters, page);
  };

  const handleInvite = student => {
    onClearInviteState();
    setSelectedStudent(student);
    setInviteModalOpen(true);
  };

  const handleInviteSubmit = ({ studentId, listingId, message }) => {
    onInviteToApply({ studentId, listingId, message });
  };

  const handleCloseInviteModal = () => {
    setInviteModalOpen(false);
    setSelectedStudent(null);
    onClearInviteState();
  };

  const title = intl.formatMessage({ id: 'SearchStudentsPage.title' });
  const hasFiltersActive = Object.values(filters).some(v => !!v);

  // Access control
  if (currentUser && !isCorporatePartner) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn
          topbar={<TopbarContainer />}
          footer={<FooterContainer />}
        >
          <div className={css.noAccess}>
            <h1><FormattedMessage id="SearchStudentsPage.noAccessTitle" /></h1>
            <p><FormattedMessage id="SearchStudentsPage.noAccessMessage" /></p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={
          <LayoutWrapperTopbar>
            <TopbarContainer />
          </LayoutWrapperTopbar>
        }
        footer={<Footer />}
      >
        <div className={css.pageContent}>
          <h1 className={css.pageHeading}>
            <FormattedMessage id="SearchStudentsPage.heading" />
          </h1>

          {/* Filter Bar */}
          <div className={css.filterBar}>
            <div className={css.filterRow}>
              {/* State filter */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchStudentsPage.filterState" />
                </label>
                <select
                  className={css.filterSelect}
                  value={filters.state}
                  onChange={e => handleFilterChange('state', e.target.value)}
                >
                  <option value="">All States</option>
                  {STATE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Graduation Year filter */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchStudentsPage.filterGradYear" />
                </label>
                <select
                  className={css.filterSelect}
                  value={filters.graduationYear}
                  onChange={e => handleFilterChange('graduationYear', e.target.value)}
                >
                  <option value="">All Years</option>
                  {GRADUATION_YEAR_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Skills filter */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchStudentsPage.filterSkills" />
                </label>
                <select
                  className={css.filterSelect}
                  value={filters.skills}
                  onChange={e => handleFilterChange('skills', e.target.value)}
                >
                  <option value="">All Skills</option>
                  {SKILL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Interests filter */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchStudentsPage.filterInterests" />
                </label>
                <select
                  className={css.filterSelect}
                  value={filters.interests}
                  onChange={e => handleFilterChange('interests', e.target.value)}
                >
                  <option value="">All Interests</option>
                  {INTEREST_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={css.filterRow}>
              {/* University text search */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchStudentsPage.filterUniversity" />
                </label>
                <input
                  className={css.filterInput}
                  type="text"
                  placeholder="e.g. Stanford, MIT..."
                  value={filters.university}
                  onChange={e => handleFilterChange('university', e.target.value)}
                />
              </div>

              {/* Major text search */}
              <div className={css.filterItem}>
                <label className={css.filterLabel}>
                  <FormattedMessage id="SearchStudentsPage.filterMajor" />
                </label>
                <input
                  className={css.filterInput}
                  type="text"
                  placeholder="e.g. Computer Science..."
                  value={filters.major}
                  onChange={e => handleFilterChange('major', e.target.value)}
                />
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
                    <FormattedMessage id="SearchStudentsPage.resetFilters" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className={css.resultsSection}>
            {searchInProgress && (
              <p className={css.loadingMessage}>
                <FormattedMessage id="SearchStudentsPage.loading" />
              </p>
            )}

            {searchError && (
              <p className={css.errorMessage}>
                <FormattedMessage id="SearchStudentsPage.searchError" />
              </p>
            )}

            {!searchInProgress && !searchError && users.length === 0 && (
              <div className={css.noResults}>
                <h3><FormattedMessage id="SearchStudentsPage.noResultsTitle" /></h3>
                <p><FormattedMessage id="SearchStudentsPage.noResultsMessage" /></p>
              </div>
            )}

            {!searchInProgress && users.length > 0 && (
              <>
                <p className={css.resultCount}>
                  <FormattedMessage
                    id="SearchStudentsPage.resultCount"
                    values={{ count: pagination?.totalItems || users.length }}
                  />
                </p>
                <div className={css.resultsGrid}>
                  {users.map(user => (
                    <StudentCard
                      key={user.id}
                      user={user}
                      onInvite={handleInvite}
                    />
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <PaginationLinks
                    className={css.pagination}
                    pageName="SearchStudentsPage"
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

        {/* Invite Modal */}
        <InviteModal
          isOpen={inviteModalOpen}
          onClose={handleCloseInviteModal}
          onSubmit={handleInviteSubmit}
          student={selectedStudent}
          ownListings={ownListings}
          inviteInProgress={inviteInProgress}
          inviteError={inviteError}
          inviteSuccess={inviteSuccess}
          onManageDisableScrolling={onManageDisableScrolling}
        />
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
    ownListings,
    inviteInProgress,
    inviteError,
    inviteSuccess,
  } = state.SearchStudentsPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    users,
    pagination,
    searchInProgress,
    searchError,
    ownListings,
    inviteInProgress,
    inviteError,
    inviteSuccess,
  };
};

const mapDispatchToProps = dispatch => ({
  onSearchStudents: params => dispatch(searchStudents(params)),
  onInviteToApply: body => dispatch(inviteToApply(body)),
  onClearInviteState: () => dispatch(clearInviteState()),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

const SearchStudentsPage = compose(
  connect(mapStateToProps, mapDispatchToProps)
)(SearchStudentsPageComponent);

export default SearchStudentsPage;
