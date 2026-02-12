import React, { useState, useEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';
import { useIntl } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { getOwnListingsById } from './CorporateDashboardPage.duck';
import { fetchPendingAssessments, exportCorporateReport, closeProjectListing, reopenProjectListing } from '../../util/api';

import { Page, LayoutSingleColumn, NamedLink, H3, StudentAssessmentForm, OnboardingChecklist } from '../../components';

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
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
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

// ================ Sent Invites Panel ================ //

const SentInvitesPanel = ({ invites, stats, isLoading, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState('all');

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadgeClass = status => {
    switch (status) {
      case 'pending':
        return css.inviteStatusPending;
      case 'accepted':
        return css.inviteStatusAccepted;
      case 'declined':
        return css.inviteStatusDeclined;
      case 'expired':
        return css.inviteStatusExpired;
      default:
        return '';
    }
  };

  const filteredInvites = statusFilter === 'all'
    ? invites
    : invites.filter(i => i.status === statusFilter);

  if (isLoading) {
    return <div className={css.loading}>Loading sent invites...</div>;
  }

  return (
    <div className={css.sentInvitesPanel}>
      {/* Stats Summary */}
      {stats && (
        <div className={css.inviteStatsSummary}>
          <div className={css.inviteStatItem}>
            <span className={css.inviteStatValue}>{stats.total || 0}</span>
            <span className={css.inviteStatLabel}>Total Sent</span>
          </div>
          <div className={css.inviteStatItem}>
            <span className={classNames(css.inviteStatValue, css.inviteStatPending)}>
              {stats.pending || 0}
            </span>
            <span className={css.inviteStatLabel}>Pending</span>
          </div>
          <div className={css.inviteStatItem}>
            <span className={classNames(css.inviteStatValue, css.inviteStatAccepted)}>
              {stats.accepted || 0}
            </span>
            <span className={css.inviteStatLabel}>Accepted</span>
          </div>
          <div className={css.inviteStatItem}>
            <span className={classNames(css.inviteStatValue, css.inviteStatDeclined)}>
              {stats.declined || 0}
            </span>
            <span className={css.inviteStatLabel}>Declined</span>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className={css.inviteFilterControls}>
        <select
          className={css.inviteFilterSelect}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Invites</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
        <NamedLink name="SearchStudentsPage" className={css.inviteStudentsButton}>
          + Invite Students
        </NamedLink>
      </div>

      {/* Invites List */}
      {filteredInvites.length === 0 ? (
        <div className={css.noInvites}>
          <div className={css.noInvitesIcon}>📨</div>
          <h4 className={css.noInvitesTitle}>
            {statusFilter === 'all'
              ? 'No invitations sent yet'
              : `No ${statusFilter} invitations`}
          </h4>
          <p className={css.noInvitesText}>
            Search for students and invite them to apply to your projects.
          </p>
          <NamedLink name="SearchStudentsPage" className={css.inviteStudentsButtonLarge}>
            Search Students
          </NamedLink>
        </div>
      ) : (
        <div className={css.invitesList}>
          <table className={css.invitesTable}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Project</th>
                <th>Sent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map(invite => (
                <tr key={invite.id} className={css.inviteRow}>
                  <td>
                    <div className={css.inviteStudentInfo}>
                      <NamedLink
                        name="ProfilePage"
                        params={{ id: invite.studentId }}
                        className={css.inviteStudentName}
                      >
                        {invite.studentName}
                      </NamedLink>
                      {invite.studentUniversity && (
                        <span className={css.inviteStudentUniversity}>
                          {invite.studentUniversity}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <NamedLink
                      name="ListingPage"
                      params={{
                        id: invite.listingId,
                        slug: invite.projectTitle?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'project',
                      }}
                      className={css.inviteProjectTitle}
                    >
                      {invite.projectTitle}
                    </NamedLink>
                  </td>
                  <td className={css.inviteDate}>
                    {formatDate(invite.sentAt)}
                  </td>
                  <td>
                    <span className={classNames(css.inviteStatusBadge, getStatusBadgeClass(invite.status))}>
                      {invite.status}
                    </span>
                  </td>
                  <td>
                    {invite.transactionId && (
                      <NamedLink
                        name="SaleDetailsPage"
                        params={{ id: invite.transactionId }}
                        className={css.viewTransactionLink}
                      >
                        View
                      </NamedLink>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ================ Reviews Panel ================ //

// ReviewsPanel removed in v53 — reviews are now handled via TransactionPage/Inbox

// ================ Project Card ================ //

const ProjectCard = props => {
  const { listing, onClose, onReopen, isProcessing } = props;
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
  const applicationDeadline = publicData?.applicationDeadline || '';
  const isClosed = state === 'closed';
  const isDraft = state === 'draft';
  const isPublished = state === 'published';

  const handleClose = e => {
    e.preventDefault();
    e.stopPropagation();
    const confirmMsg = isDraft
      ? 'Are you sure you want to discard this draft project?'
      : 'Are you sure you want to close this project? It will be removed from the marketplace.';
    if (window.confirm(confirmMsg)) {
      onClose(listingId);
    }
  };

  const handleReopen = e => {
    e.preventDefault();
    e.stopPropagation();
    onReopen(listingId);
  };

  return (
    <div className={css.projectCard}>
      <NamedLink className={css.projectCardLink} name="ListingPage" params={{ id: listingId, slug }}>
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
          {applicationDeadline && applicationDeadline !== 'open' && (
            <span className={css.projectCardMetaItem}>
              Deadline: {applicationDeadline.replace(/-/g, ' ')}
            </span>
          )}
        </div>
        <span className={`${css.projectCardStatus} ${getStatusClass(state)}`}>
          {getStatusLabel(state)}
        </span>
      </NamedLink>
      <div className={css.projectCardActions}>
        {(isPublished || isDraft) && (
          <button
            className={css.projectCloseButton}
            onClick={handleClose}
            disabled={isProcessing}
            title={isDraft ? 'Discard draft' : 'Close project'}
          >
            {isProcessing ? '...' : isDraft ? 'Discard' : 'Close'}
          </button>
        )}
        {isClosed && (
          <button
            className={css.projectReopenButton}
            onClick={handleReopen}
            disabled={isProcessing}
            title="Reopen project"
          >
            {isProcessing ? '...' : 'Reopen'}
          </button>
        )}
      </div>
    </div>
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
    sentInvites,
    sentInvitesStats,
    sentInvitesInProgress,
  } = props;
  const intl = useIntl();
  const config = useConfiguration();

  // Check if user is a corporate partner
  const userType = currentUser?.attributes?.profile?.publicData?.userType;
  const isCorporatePartner = userType === 'corporate-partner';

  // State for stat detail modals
  const [statDetailModal, setStatDetailModal] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [processingListingId, setProcessingListingId] = useState(null);
  const [listingActionError, setListingActionError] = useState(null);
  const [removedListingIds, setRemovedListingIds] = useState([]);

  const title = intl.formatMessage({ id: 'CorporateDashboardPage.title' });

  // Compute onboarding items for corporate partners
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const companyName = publicData?.companyName;
  const companyLogo = currentUser?.profileImage?.id;
  const hasPostedProject = listings.length > 0;
  const hasReceivedApplication = inboxSales && inboxSales.length > 0;
  const hasAcceptedStudent = inboxSales?.some(tx => tx.attributes?.lastTransition === 'transition/accept');

  const onboardingItems = [
    {
      id: 'company-profile',
      label: 'Complete your company profile',
      description: 'Add your company name, logo, and description',
      completed: !!companyName,
      link: { name: 'ProfileSettingsPage' },
    },
    {
      id: 'logo',
      label: 'Upload your company logo',
      description: 'Help students recognize your brand',
      completed: !!companyLogo,
      link: { name: 'ProfileSettingsPage' },
    },
    {
      id: 'post-project',
      label: 'Post your first project',
      description: 'Create an opportunity for students',
      completed: hasPostedProject,
      link: { name: 'NewListingPage' },
    },
    {
      id: 'review-applicants',
      label: 'Review student applications',
      description: hasReceivedApplication
        ? 'Review and manage student applications in your Inbox'
        : 'No applications yet - search for students to invite',
      completed: hasReceivedApplication,
      link: { name: 'InboxPage', params: { tab: 'sales' } },
    },
    {
      id: 'search-students',
      label: 'Search for students',
      description: 'Find talented students to invite to your projects',
      completed: false,
      link: { name: 'SearchStudentsPage' },
    },
    {
      id: 'accept-student',
      label: 'Accept a student for a project',
      description: 'Connect with talented students for real project work',
      completed: hasAcceptedStudent,
      link: hasAcceptedStudent ? undefined : { name: 'InboxPage', params: { tab: 'sales' } },
    },
  ];

  const showOnboarding = !onboardingDismissed && !queryInProgress;

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

  // Handle close/delete project
  const handleCloseListing = async (listingId) => {
    setProcessingListingId(listingId);
    setListingActionError(null);
    try {
      await closeProjectListing(listingId);
      // Remove from local display
      setRemovedListingIds(prev => [...prev, listingId]);
    } catch (err) {
      console.error('Failed to close listing:', err);
      setListingActionError({ id: listingId, message: err?.message || 'Failed to close project. Please try again.' });
    } finally {
      setProcessingListingId(null);
    }
  };

  // Handle reopen project
  const handleReopenListing = async (listingId) => {
    setProcessingListingId(listingId);
    setListingActionError(null);
    try {
      await reopenProjectListing(listingId);
      // Remove from the removed list so it shows again
      setRemovedListingIds(prev => prev.filter(id => id !== listingId));
      // Force page reload to get fresh listing data
      window.location.reload();
    } catch (err) {
      console.error('Failed to reopen listing:', err);
      setListingActionError({ id: listingId, message: err?.message || 'Failed to reopen project. Please try again.' });
    } finally {
      setProcessingListingId(null);
    }
  };

  // Filter out removed listings from display
  const visibleListings = listings.filter(l => !removedListingIds.includes(l.id.uuid));

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

  // Check corporate partner approval status
  const approvalStatus = publicData?.approvalStatus;
  const isPending = approvalStatus === 'pending';
  const isRejected = approvalStatus === 'rejected';

  if (isCorporatePartner && (isPending || isRejected)) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.content}>
            <div className={css.approvalGate}>
              <div className={css.approvalIcon}>
                {isPending ? '⏳' : '✗'}
              </div>
              <h2 className={css.approvalTitle}>
                {isPending
                  ? 'Account Pending Approval'
                  : 'Account Not Approved'}
              </h2>
              <p className={css.approvalText}>
                {isPending
                  ? 'Your corporate partner account is currently under review. An administrator will review your application and approve your access. You will be able to post projects and connect with students once approved.'
                  : 'Your corporate partner account application was not approved. If you believe this is an error, please contact support or the institution administrator for more information.'}
              </p>
              {isPending && (
                <div className={css.approvalStatusBadge}>
                  <span className={css.approvalStatusDot} />
                  Under Review
                </div>
              )}
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

          {/* Onboarding Checklist */}
          {showOnboarding && (
            <OnboardingChecklist
              title="Get Started with Campus2Career"
              subtitle="Complete these steps to start connecting with top student talent"
              items={onboardingItems}
              variant="corporate"
              onDismiss={() => setOnboardingDismissed(true)}
            />
          )}

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

          {/* Application Inbox Card - Always visible */}
          <div className={css.applicationsSummarySection}>
            <div className={css.applicationsSummaryCard}>
              <div className={css.applicationsSummaryContent}>
                <div className={css.applicationsSummaryInfo}>
                  <h3 className={css.sectionTitle}>Student Applications</h3>
                  <p className={css.sectionDescription}>
                    Review applications, accept or decline students, message them, and leave reviews — all in your Inbox.
                  </p>
                </div>
                <NamedLink name="InboxPage" params={{ tab: 'sales' }} className={css.viewApplicationsButton}>
                  Open Inbox →
                </NamedLink>
              </div>
            </div>
          </div>

          {/* Sent Invites Section - Always visible */}
          <div className={css.sentInvitesSection}>
            <h3 className={css.sectionTitle}>Sent Invitations</h3>
            <p className={css.sectionDescription}>Track invitations you have sent to students to apply for your projects.</p>
            <SentInvitesPanel
              invites={sentInvites || []}
              stats={sentInvitesStats}
              isLoading={sentInvitesInProgress}
            />
          </div>

          {/* Enhanced Stats Section */}
          {dashboardStats && (
            <>
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
            <p className={css.sectionDescription}>Rate and provide feedback on students who have completed your projects.</p>
            <PendingAssessmentsPanel intl={intl} />
          </div>

          {/* Reviews - Available in each project's conversation via Inbox */}

          {/* Active Projects */}
          <div className={css.projectsSection}>
            <div className={css.actionBar}>
              <h3 className={css.sectionTitle}>
                {intl.formatMessage({ id: 'CorporateDashboardPage.activeProjectsTitle' })}
              </h3>
              {listings.length > 0 && (
                <NamedLink name="NewListingPage" className={css.postProjectButton}>
                  {intl.formatMessage({ id: 'CorporateDashboardPage.postProject' })}
                </NamedLink>
              )}
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
                {listingActionError && (
                  <div className={css.listingActionError}>{listingActionError.message}</div>
                )}
                {visibleListings.map(l => (
                  <ProjectCard
                    key={l.id.uuid}
                    listing={l}
                    onClose={handleCloseListing}
                    onReopen={handleReopenListing}
                    isProcessing={processingListingId === l.id.uuid}
                  />
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
    sentInvites,
    sentInvitesStats,
    sentInvitesInProgress,
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
    sentInvites,
    sentInvitesStats,
    sentInvitesInProgress,
  };
};

const CorporateDashboardPage = compose(connect(mapStateToProps))(CorporateDashboardPageComponent);

CorporateDashboardPage.loadData = (params, search, config) => {
  // loadData is handled via pageDataLoadingAPI
};

export default CorporateDashboardPage;
