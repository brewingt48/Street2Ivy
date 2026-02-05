import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getOwnListingsById } from './CorporateDashboardPage.duck';
import { fetchPendingAssessments, exportCorporateReport } from '../../util/api';

import { Page, LayoutSingleColumn, NamedLink, H3, StudentAssessmentForm } from '../../components';

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

// ================ Stat Detail Modal ================ //

const StatDetailModal = ({ title, items, onClose, renderItem }) => {
  if (!items) return null;

  return (
    <div className={css.statDetailOverlay} onClick={onClose}>
      <div className={css.statDetailModal} onClick={e => e.stopPropagation()}>
        <div className={css.statDetailHeader}>
          <h3 className={css.statDetailTitle}>{title}</h3>
          <button className={css.statDetailClose} onClick={onClose}>×</button>
        </div>
        <div className={css.statDetailContent}>
          {items.length === 0 ? (
            <p className={css.statDetailEmpty}>No items to display</p>
          ) : (
            <ul className={css.statDetailList}>
              {items.map((item, index) => (
                <li key={item.id || index} className={css.statDetailItem}>
                  {renderItem ? renderItem(item) : (
                    <span>{item.name || item.title || `Item ${index + 1}`}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ================ Clickable Stat Card ================ //

const ClickableStatCard = ({ value, label, onClick, hasData }) => {
  const isClickable = hasData && value > 0;

  return (
    <div
      className={classNames(css.statCard, { [css.statCardClickable]: isClickable })}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyPress={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className={css.statValue}>{value}</div>
      <div className={css.statLabel}>{label}</div>
      {isClickable && <span className={css.statClickHint}>Click to view details</span>}
    </div>
  );
};

// ================ Pending Assessments Panel ================ //

const PendingAssessmentsPanel = props => {
  const { intl } = props;
  const [pendingAssessments, setPendingAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  useEffect(() => {
    fetchPendingAssessments()
      .then(response => {
        setPendingAssessments(response.pending || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch pending assessments:', err);
        setLoading(false);
      });
  }, []);

  const handleAssessmentComplete = () => {
    // Remove the completed assessment from the list
    setPendingAssessments(prev =>
      prev.filter(a => a.transactionId !== selectedAssessment.transactionId)
    );
    setSelectedAssessment(null);
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (selectedAssessment) {
    return (
      <div className={css.assessmentFormContainer}>
        <StudentAssessmentForm
          transactionId={selectedAssessment.transactionId}
          studentId={selectedAssessment.studentId}
          studentName={selectedAssessment.studentName}
          projectTitle={selectedAssessment.projectTitle}
          onSuccess={handleAssessmentComplete}
          onCancel={() => setSelectedAssessment(null)}
        />
      </div>
    );
  }

  if (loading) {
    return <div className={css.loading}>Loading pending assessments...</div>;
  }

  if (pendingAssessments.length === 0) {
    return (
      <div className={css.noAssessments}>
        <span className={css.noAssessmentsIcon}>✓</span>
        <p>No pending assessments. All completed projects have been assessed!</p>
      </div>
    );
  }

  return (
    <div className={css.pendingAssessmentsList}>
      <p className={css.pendingAssessmentsIntro}>
        Please complete assessments for the following students who have finished their projects:
      </p>
      <div className={css.assessmentCards}>
        {pendingAssessments.map(assessment => (
          <div key={assessment.transactionId} className={css.assessmentCard}>
            <div className={css.assessmentCardInfo}>
              <h4 className={css.assessmentStudentName}>{assessment.studentName}</h4>
              <p className={css.assessmentProjectTitle}>{assessment.projectTitle}</p>
              <span className={css.assessmentDate}>
                Completed: {formatDate(assessment.completedAt)}
              </span>
            </div>
            <button
              className={css.assessButton}
              onClick={() => setSelectedAssessment(assessment)}
            >
              Complete Assessment
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================ Messages Panel ================ //

const MessagesPanel = props => {
  const { inboxSales, inboxOrders, inboxInProgress, intl } = props;
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'orders'
  const [selectedMessage, setSelectedMessage] = useState(null);

  const formatDate = dateString => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFullDate = dateString => {
    return new Date(dateString).toLocaleString();
  };

  const getTransactionStatus = tx => {
    const lastTransition = tx.attributes.lastTransition;
    const statusMap = {
      'transition/inquire': 'Inquiry',
      'transition/request-project-application': 'Applied',
      'transition/accept': 'Accepted',
      'transition/decline': 'Declined',
      'transition/complete': 'Completed',
      'transition/review-1-by-provider': 'Reviewed',
      'transition/review-1-by-customer': 'Reviewed',
      'transition/review-2-by-provider': 'Reviewed',
      'transition/review-2-by-customer': 'Reviewed',
    };
    return statusMap[lastTransition] || lastTransition?.replace('transition/', '').replace(/-/g, ' ') || 'Unknown';
  };

  const renderTransactionList = (transactions, isApplications = true) => {
    if (inboxInProgress) {
      return <div className={css.noMessages}>Loading messages...</div>;
    }

    if (!transactions || transactions.length === 0) {
      return (
        <div className={css.noMessages}>
          {isApplications ? 'No applications yet.' : 'No orders yet.'}
        </div>
      );
    }

    return (
      <div className={css.emailList}>
        <table className={css.emailTable}>
          <thead>
            <tr>
              <th className={css.emailTableHeader}>{isApplications ? 'Applicant' : 'Provider'}</th>
              <th className={css.emailTableHeader}>Project</th>
              <th className={css.emailTableHeader}>Status</th>
              <th className={css.emailTableHeader}>Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => {
              const otherUser = isApplications ? tx.customer : tx.provider;
              const otherUserName = otherUser?.attributes?.profile?.displayName || 'Unknown User';
              const listingTitle = tx.listing?.attributes?.title || 'Unknown Project';
              const status = getTransactionStatus(tx);
              const lastUpdated = tx.attributes.lastTransitionedAt;

              return (
                <tr
                  key={tx.id.uuid}
                  className={css.emailRow}
                  onClick={() => setSelectedMessage({ ...tx, otherUserName, listingTitle, status, isApplications })}
                >
                  <td className={css.emailFrom}>{otherUserName}</td>
                  <td className={css.emailSubject}>{listingTitle}</td>
                  <td className={css.emailStatus}>
                    <span className={classNames(css.statusBadge, {
                      [css.statusBadgeAccepted]: status === 'Accepted',
                      [css.statusBadgeDeclined]: status === 'Declined',
                      [css.statusBadgePending]: status === 'Applied' || status === 'Inquiry',
                      [css.statusBadgeCompleted]: status === 'Completed',
                    })}>
                      {status}
                    </span>
                  </td>
                  <td className={css.emailDate}>{formatDate(lastUpdated)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMessageDetail = () => {
    if (!selectedMessage) return null;

    return (
      <div className={css.messageDetailOverlay} onClick={() => setSelectedMessage(null)}>
        <div className={css.messageDetailPanel} onClick={e => e.stopPropagation()}>
          <div className={css.messageDetailHeader}>
            <button className={css.messageDetailClose} onClick={() => setSelectedMessage(null)}>
              ← Back
            </button>
          </div>
          <div className={css.messageDetailContent}>
            <h3 className={css.messageDetailSubject}>{selectedMessage.listingTitle}</h3>
            <div className={css.messageDetailMeta}>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>
                  {selectedMessage.isApplications ? 'Applicant:' : 'Provider:'}
                </span>
                <span>{selectedMessage.otherUserName}</span>
              </div>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>Status:</span>
                <span className={classNames(css.statusBadge, {
                  [css.statusBadgeAccepted]: selectedMessage.status === 'Accepted',
                  [css.statusBadgeDeclined]: selectedMessage.status === 'Declined',
                  [css.statusBadgePending]: selectedMessage.status === 'Applied' || selectedMessage.status === 'Inquiry',
                  [css.statusBadgeCompleted]: selectedMessage.status === 'Completed',
                })}>
                  {selectedMessage.status}
                </span>
              </div>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>Last Updated:</span>
                <span>{formatFullDate(selectedMessage.attributes.lastTransitionedAt)}</span>
              </div>
            </div>
            <div className={css.messageDetailActions}>
              <NamedLink
                name={selectedMessage.isApplications ? 'SaleDetailsPage' : 'OrderDetailsPage'}
                params={{ id: selectedMessage.id.uuid }}
                className={css.viewDetailsLink}
              >
                View Full Details →
              </NamedLink>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={css.messagesPanel}>
      {/* Message Tabs */}
      <div className={css.messageTabsContainer}>
        <div className={css.messageTabs}>
          <button
            className={classNames(css.messageTab, { [css.messageTabActive]: activeTab === 'applications' })}
            onClick={() => setActiveTab('applications')}
          >
            📥 Applications ({inboxSales?.length || 0})
          </button>
          <button
            className={classNames(css.messageTab, { [css.messageTabActive]: activeTab === 'orders' })}
            onClick={() => setActiveTab('orders')}
          >
            📤 Orders ({inboxOrders?.length || 0})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'applications' && (
        <div className={css.messagesListSection}>
          <h4 className={css.messagesListTitle}>Student Applications</h4>
          <p className={css.messagesListSubtitle}>Students who have applied to your projects</p>
          {renderTransactionList(inboxSales, true)}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className={css.messagesListSection}>
          <h4 className={css.messagesListTitle}>Your Orders</h4>
          <p className={css.messagesListSubtitle}>Projects where you are a customer</p>
          {renderTransactionList(inboxOrders, false)}
        </div>
      )}

      {/* Message Detail Modal */}
      {renderMessageDetail()}
    </div>
  );
};

// ================ Project Card ================ //

const ProjectCard = props => {
  const { listing } = props;
  const { title, state, publicData } = listing.attributes;
  const listingId = listing.id.uuid;
  const slug = title
    ? title
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '')
    : 'project';

  const estimatedHours = publicData?.estimatedHours || '';
  const studentsNeeded = publicData?.studentsNeeded || '';
  const industryCategory = publicData?.industryCategory || '';

  return (
    <NamedLink className={css.projectCard} name="ListingPage" params={{ id: listingId, slug }}>
      <h4 className={css.projectCardTitle}>{title || 'Untitled Project'}</h4>
      <div className={css.projectCardMeta}>
        {industryCategory && (
          <span className={css.projectCardMetaItem}>
            {industryCategory.charAt(0).toUpperCase() + industryCategory.slice(1)}
          </span>
        )}
        {estimatedHours && <span className={css.projectCardMetaItem}>{estimatedHours} hrs</span>}
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
    inboxSales,
    inboxOrders,
    inboxInProgress,
  } = props;
  const intl = useIntl();
  const config = useConfiguration();

  // Check if user is a corporate partner
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isCorporatePartner = userType === 'corporate-partner';

  // State for stat detail modals
  const [statDetailModal, setStatDetailModal] = useState(null);

  const title = intl.formatMessage({ id: 'CorporateDashboardPage.title' });

  // Calculate stats
  const activeProjects = listings.filter(l => l.attributes.state === LISTING_STATE_PUBLISHED);
  const completedProjects = listings.filter(l => l.attributes.state === LISTING_STATE_CLOSED);
  const draftProjects = listings.filter(l => l.attributes.state === LISTING_STATE_DRAFT);
  const pendingProjects = listings.filter(l => l.attributes.state === LISTING_STATE_PENDING_APPROVAL);
  const totalProjects = listings.length;

  // Helper to render project item in modal
  const renderProjectItem = (project) => {
    const { title: projectTitle, state } = project.attributes;
    const listingId = project.id.uuid;
    const slug = projectTitle
      ? projectTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      : 'project';
    return (
      <NamedLink name="ListingPage" params={{ id: listingId, slug }} className={css.statDetailLink}>
        <span className={css.statDetailItemName}>{projectTitle || 'Untitled Project'}</span>
        <span className={classNames(css.statDetailItemStatus, getStatusClass(state))}>
          {getStatusLabel(state)}
        </span>
      </NamedLink>
    );
  };

  // Helper to render transaction item in modal - with clickable student profile
  const renderTransactionItem = (tx) => {
    const customerName = tx.customer?.attributes?.profile?.displayName || 'Unknown';
    const customerId = tx.customer?.id?.uuid;
    const listingTitle = tx.listing?.attributes?.title || 'Unknown Project';
    const lastTransition = tx.attributes?.lastTransition || '';
    const status = lastTransition.replace('transition/', '').replace(/-/g, ' ');

    return (
      <div className={css.statDetailTransactionRow}>
        <div className={css.statDetailTransactionInfo}>
          {customerId ? (
            <NamedLink
              name="ProfilePage"
              params={{ id: customerId }}
              className={css.statDetailStudentLink}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={css.statDetailItemName}>{customerName}</span>
              <span className={css.viewProfileArrow}>→</span>
            </NamedLink>
          ) : (
            <span className={css.statDetailItemName}>{customerName}</span>
          )}
          <span className={css.statDetailItemSub}>{listingTitle}</span>
        </div>
        <NamedLink
          name="SaleDetailsPage"
          params={{ id: tx.id.uuid }}
          className={css.statDetailViewTransaction}
        >
          View Details
        </NamedLink>
      </div>
    );
  };

  // Stat click handlers
  const handleStatClick = (modalType) => {
    let modalData = null;

    switch (modalType) {
      case 'totalProjects':
        modalData = { title: 'All Projects', items: listings, renderItem: renderProjectItem };
        break;
      case 'activeProjects':
        modalData = { title: 'Active Projects', items: activeProjects, renderItem: renderProjectItem };
        break;
      case 'completedProjects':
        modalData = { title: 'Completed Projects', items: completedProjects, renderItem: renderProjectItem };
        break;
      case 'totalApplications':
        modalData = { title: 'All Applications', items: inboxSales || [], renderItem: renderTransactionItem };
        break;
      case 'acceptedApplications':
        modalData = {
          title: 'Accepted Applications',
          items: (inboxSales || []).filter(tx => tx.attributes.lastTransition === 'transition/accept'),
          renderItem: renderTransactionItem
        };
        break;
      case 'declinedApplications':
        modalData = {
          title: 'Declined Applications',
          items: (inboxSales || []).filter(tx => tx.attributes.lastTransition === 'transition/decline'),
          renderItem: renderTransactionItem
        };
        break;
      case 'pendingApplications':
        modalData = {
          title: 'Pending Applications',
          items: (inboxSales || []).filter(tx =>
            tx.attributes.lastTransition === 'transition/request-project-application' ||
            tx.attributes.lastTransition === 'transition/inquire'
          ),
          renderItem: renderTransactionItem
        };
        break;
      default:
        break;
    }

    setStatDetailModal(modalData);
  };

  if (!isCorporatePartner && currentUser) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
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
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.content}>
          <div className={css.pageHeader}>
            <H3 as="h1" className={css.title}>
              {intl.formatMessage({ id: 'CorporateDashboardPage.heading' })}
            </H3>
            <div className={css.headerButtons}>
              <div className={css.exportButtons}>
                <button
                  className={css.exportButton}
                  onClick={() => exportCorporateReport('summary', 'csv').catch(err => console.error('Export failed:', err))}
                  title="Download summary as CSV"
                >
                  📊 {intl.formatMessage({ id: 'CorporateDashboardPage.exportCSV' })}
                </button>
                <button
                  className={css.exportButton}
                  onClick={() => exportCorporateReport('summary', 'html').catch(err => console.error('Export failed:', err))}
                  title="Download summary as HTML"
                >
                  📄 {intl.formatMessage({ id: 'CorporateDashboardPage.exportReport' })}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={css.statsSection}>
            <ClickableStatCard
              value={totalProjects}
              label="Total Projects"
              onClick={() => handleStatClick('totalProjects')}
              hasData={true}
            />
            <ClickableStatCard
              value={activeProjects.length}
              label="Active Projects"
              onClick={() => handleStatClick('activeProjects')}
              hasData={true}
            />
            <ClickableStatCard
              value={completedProjects.length}
              label="Completed"
              onClick={() => handleStatClick('completedProjects')}
              hasData={true}
            />
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
                  <ClickableStatCard
                    value={dashboardStats.applicationStats?.total || 0}
                    label="Total Applications"
                    onClick={() => handleStatClick('totalApplications')}
                    hasData={inboxSales?.length > 0}
                  />
                  <ClickableStatCard
                    value={dashboardStats.applicationStats?.accepted || 0}
                    label="Accepted"
                    onClick={() => handleStatClick('acceptedApplications')}
                    hasData={inboxSales?.length > 0}
                  />
                  <ClickableStatCard
                    value={dashboardStats.applicationStats?.declined || 0}
                    label="Declined"
                    onClick={() => handleStatClick('declinedApplications')}
                    hasData={inboxSales?.length > 0}
                  />
                  <ClickableStatCard
                    value={dashboardStats.applicationStats?.pending || 0}
                    label="Pending"
                    onClick={() => handleStatClick('pendingApplications')}
                    hasData={inboxSales?.length > 0}
                  />
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
              {dashboardStats.projectsByCategory &&
                Object.keys(dashboardStats.projectsByCategory).length > 0 && (
                  <div className={css.enhancedStatsSection}>
                    <h3 className={css.sectionTitle}>
                      {intl.formatMessage({ id: 'CorporateDashboardPage.projectsByCategory' })}
                    </h3>
                    <div className={css.categoryList}>
                      {Object.entries(dashboardStats.projectsByCategory).map(
                        ([category, count]) => (
                          <div key={category} className={css.categoryItem}>
                            <span className={css.categoryName}>
                              {category.charAt(0).toUpperCase() +
                                category.slice(1).replace(/-/g, ' ')}
                            </span>
                            <span className={css.categoryCount}>{count}</span>
                          </div>
                        )
                      )}
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

          {/* Pending Assessments Section */}
          <div className={css.assessmentsSection}>
            <h3 className={css.sectionTitle}>
              {intl.formatMessage({ id: 'CorporateDashboardPage.pendingAssessmentsTitle' })}
            </h3>
            <PendingAssessmentsPanel intl={intl} />
          </div>

          {/* Messages / Inbox Section */}
          <div className={css.messagesSection}>
            <h3 className={css.sectionTitle}>
              {intl.formatMessage({ id: 'CorporateDashboardPage.messagesTitle' })}
            </h3>
            <MessagesPanel
              inboxSales={inboxSales}
              inboxOrders={inboxOrders}
              inboxInProgress={inboxInProgress}
              intl={intl}
            />
          </div>

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

        {/* Stat Detail Modal */}
        {statDetailModal && (
          <StatDetailModal
            title={statDetailModal.title}
            items={statDetailModal.items}
            onClose={() => setStatDetailModal(null)}
            renderItem={statDetailModal.renderItem}
          />
        )}
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
    inboxSales,
    inboxOrders,
    inboxInProgress,
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
    inboxSales,
    inboxOrders,
    inboxInProgress,
  };
};

const CorporateDashboardPage = compose(connect(mapStateToProps))(CorporateDashboardPageComponent);

CorporateDashboardPage.loadData = (params, search, config) => {
  // loadData is handled via pageDataLoadingAPI
};

export default CorporateDashboardPage;
