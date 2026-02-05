import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getOwnListingsById } from './CorporateDashboardPage.duck';

import {
  Page,
  LayoutSingleColumn,
  NamedLink,
  H3,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './CorporateDashboardPage.module.css';

const LISTING_STATE_PUBLISHED = 'published';
const LISTING_STATE_CLOSED = 'closed';
const LISTING_STATE_DRAFT = 'draft';
const LISTING_STATE_PENDING_APPROVAL = 'pendingApproval';

const getStatusLabel = state => {
  switch (state) {
    case LISTING_STATE_PUBLISHED:
      return 'Active';
    case LISTING_STATE_CLOSED:
      return 'Closed';
    case LISTING_STATE_DRAFT:
      return 'Draft';
    case LISTING_STATE_PENDING_APPROVAL:
      return 'Pending Approval';
    default:
      return state;
  }
};

const getStatusClass = state => {
  switch (state) {
    case LISTING_STATE_PUBLISHED:
      return css.statusPublished;
    case LISTING_STATE_CLOSED:
      return css.statusClosed;
    case LISTING_STATE_DRAFT:
      return css.statusDraft;
    case LISTING_STATE_PENDING_APPROVAL:
      return css.statusPendingApproval;
    default:
      return '';
  }
};

const ProjectCard = props => {
  const { listing } = props;
  const { title, state, publicData } = listing.attributes;
  const listingId = listing.id.uuid;
  const slug = title ? title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') : 'project';

  const estimatedHours = publicData?.estimatedHours || '';
  const studentsNeeded = publicData?.studentsNeeded || '';
  const industryCategory = publicData?.industryCategory || '';

  return (
    <NamedLink
      className={css.projectCard}
      name="ListingPage"
      params={{ id: listingId, slug }}
    >
      <h4 className={css.projectCardTitle}>{title || 'Untitled Project'}</h4>
      <div className={css.projectCardMeta}>
        {industryCategory && (
          <span className={css.projectCardMetaItem}>
            {industryCategory.charAt(0).toUpperCase() + industryCategory.slice(1)}
          </span>
        )}
        {estimatedHours && (
          <span className={css.projectCardMetaItem}>{estimatedHours} hrs</span>
        )}
        {studentsNeeded && (
          <span className={css.projectCardMetaItem}>
            {studentsNeeded} {studentsNeeded === '1' ? 'student' : 'students'}
          </span>
        )}
      </div>
      <span className={`${css.projectCardStatus} ${getStatusClass(state)}`}>
        {getStatusLabel(state)}
      </span>
    </NamedLink>
  );
};

export const CorporateDashboardPageComponent = props => {
  const {
    currentUser,
    scrollingDisabled,
    queryInProgress,
    queryListingsError,
    listings,
    dashboardStats,
    statsInProgress,
  } = props;
  const intl = useIntl();
  const config = useConfiguration();

  // Check if user is a corporate partner
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isCorporatePartner = userType === 'corporate-partner';

  const title = intl.formatMessage({ id: 'CorporateDashboardPage.title' });

  // Calculate stats
  const activeProjects = listings.filter(
    l => l.attributes.state === LISTING_STATE_PUBLISHED
  );
  const completedProjects = listings.filter(
    l => l.attributes.state === LISTING_STATE_CLOSED
  );
  const totalProjects = listings.length;

  if (!isCorporatePartner && currentUser) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn
          topbar={<TopbarContainer />}
          footer={<FooterContainer />}
        >
          <div className={css.content}>
            <div className={css.accessDenied}>
              <h2 className={css.accessDeniedTitle}>Access Restricted</h2>
              <p className={css.accessDeniedText}>
                The dashboard is only available to Corporate Partners. If you&apos;re a student,
                browse available projects to find opportunities.
              </p>
            </div>
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
        <div className={css.content}>
          <div className={css.pageHeader}>
            <H3 as="h1" className={css.title}>
              {intl.formatMessage({ id: 'CorporateDashboardPage.heading' })}
            </H3>
            <div className={css.exportButtons}>
              <button
                className={css.exportButton}
                onClick={() => window.open('/api/corporate/export/summary?format=csv', '_blank')}
                title="Download summary as CSV"
              >
                📊 {intl.formatMessage({ id: 'CorporateDashboardPage.exportCSV' })}
              </button>
              <button
                className={css.exportButton}
                onClick={() => window.open('/api/corporate/export/summary?format=html', '_blank')}
                title="Download summary as HTML"
              >
                📄 {intl.formatMessage({ id: 'CorporateDashboardPage.exportReport' })}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={css.statsSection}>
            <div className={css.statCard}>
              <div className={css.statValue}>{totalProjects}</div>
              <div className={css.statLabel}>Total Projects</div>
            </div>
            <div className={css.statCard}>
              <div className={css.statValue}>{activeProjects.length}</div>
              <div className={css.statLabel}>Active Projects</div>
            </div>
            <div className={css.statCard}>
              <div className={css.statValue}>{completedProjects.length}</div>
              <div className={css.statLabel}>Completed</div>
            </div>
          </div>

          {/* Enhanced Stats Section */}
          {dashboardStats && (
            <>
              {/* Application Stats */}
              <div className={css.enhancedStatsSection}>
                <h3 className={css.sectionTitle}>
                  {intl.formatMessage({ id: 'CorporateDashboardPage.applicationStats' })}
                </h3>
                <div className={css.statsGrid}>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.applicationStats?.total || 0}
                    </div>
                    <div className={css.statLabel}>Total Applications</div>
                  </div>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.applicationStats?.accepted || 0}
                    </div>
                    <div className={css.statLabel}>Accepted</div>
                  </div>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.applicationStats?.declined || 0}
                    </div>
                    <div className={css.statLabel}>Declined</div>
                  </div>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.applicationStats?.pending || 0}
                    </div>
                    <div className={css.statLabel}>Pending</div>
                  </div>
                </div>
              </div>

              {/* Completion Stats */}
              <div className={css.enhancedStatsSection}>
                <h3 className={css.sectionTitle}>
                  {intl.formatMessage({ id: 'CorporateDashboardPage.completionStats' })}
                </h3>
                <div className={css.statsGrid}>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.completionStats?.completed || 0}
                    </div>
                    <div className={css.statLabel}>Completed Projects</div>
                  </div>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.completionStats?.completionRate || 0}%
                    </div>
                    <div className={css.statLabel}>Completion Rate</div>
                  </div>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.completionStats?.avgDaysToCompletion || 'N/A'}
                    </div>
                    <div className={css.statLabel}>Avg. Days to Complete</div>
                  </div>
                  <div className={css.statCard}>
                    <div className={css.statValue}>
                      {dashboardStats.completionStats?.reviewed || 0}
                    </div>
                    <div className={css.statLabel}>Reviews Received</div>
                  </div>
                </div>
              </div>

              {/* Projects by Category */}
              {dashboardStats.projectsByCategory && Object.keys(dashboardStats.projectsByCategory).length > 0 && (
                <div className={css.enhancedStatsSection}>
                  <h3 className={css.sectionTitle}>
                    {intl.formatMessage({ id: 'CorporateDashboardPage.projectsByCategory' })}
                  </h3>
                  <div className={css.categoryList}>
                    {Object.entries(dashboardStats.projectsByCategory).map(([category, count]) => (
                      <div key={category} className={css.categoryItem}>
                        <span className={css.categoryName}>
                          {category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' ')}
                        </span>
                        <span className={css.categoryCount}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial Summary */}
              {dashboardStats.financialStats && (
                <div className={css.enhancedStatsSection}>
                  <h3 className={css.sectionTitle}>
                    {intl.formatMessage({ id: 'CorporateDashboardPage.financialSummary' })}
                  </h3>
                  <div className={css.statsGrid}>
                    <div className={css.statCard}>
                      <div className={css.statValue}>
                        ${(dashboardStats.financialStats.totalSpent / 100).toLocaleString()}
                      </div>
                      <div className={css.statLabel}>Total Spent</div>
                    </div>
                    <div className={css.statCard}>
                      <div className={css.statValue}>
                        ${(dashboardStats.financialStats.avgCostPerProject / 100).toLocaleString()}
                      </div>
                      <div className={css.statLabel}>Avg. Cost/Project</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {statsInProgress && !dashboardStats && (
            <div className={css.loading}>Loading stats...</div>
          )}

          {/* Active Projects */}
          <div className={css.projectsSection}>
            <div className={css.actionBar}>
              <h3 className={css.sectionTitle}>
                {intl.formatMessage({ id: 'CorporateDashboardPage.activeProjectsTitle' })}
              </h3>
              <NamedLink name="NewListingPage" className={css.postProjectButton}>
                {intl.formatMessage({ id: 'CorporateDashboardPage.postProject' })}
              </NamedLink>
            </div>

            {queryInProgress ? (
              <div className={css.loading}>
                {intl.formatMessage({ id: 'CorporateDashboardPage.loading' })}
              </div>
            ) : queryListingsError ? (
              <div className={css.error}>
                {intl.formatMessage({ id: 'CorporateDashboardPage.queryError' })}
              </div>
            ) : listings.length === 0 ? (
              <div className={css.emptyState}>
                <h4 className={css.emptyStateTitle}>
                  {intl.formatMessage({ id: 'CorporateDashboardPage.noProjectsTitle' })}
                </h4>
                <p className={css.emptyStateText}>
                  {intl.formatMessage({ id: 'CorporateDashboardPage.noProjectsText' })}
                </p>
                <NamedLink name="NewListingPage" className={css.postProjectButton}>
                  {intl.formatMessage({ id: 'CorporateDashboardPage.postFirstProject' })}
                </NamedLink>
              </div>
            ) : (
              <div className={css.projectsList}>
                {listings.map(l => (
                  <ProjectCard key={l.id.uuid} listing={l} />
                ))}
              </div>
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
    currentPageResultIds,
    queryInProgress,
    queryListingsError,
    dashboardStats,
    statsInProgress,
  } = state.CorporateDashboardPage;

  const listings = getOwnListingsById(state, currentPageResultIds);

  return {
    currentUser,
    scrollingDisabled: isScrollingDisabled(state),
    queryInProgress,
    queryListingsError,
    listings,
    dashboardStats,
    statsInProgress,
  };
};

const CorporateDashboardPage = compose(connect(mapStateToProps))(CorporateDashboardPageComponent);

CorporateDashboardPage.loadData = (params, search, config) => {
  // loadData is handled via pageDataLoadingAPI
};

export default CorporateDashboardPage;
