import React, { useState, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  apiBaseUrl,
  fetchApplicationByTransaction,
  acceptProjectApplication,
  declineProjectApplication,
  markProjectCompleted,
  fetchTransactionReviews,
} from '../../util/api';

import {
  Page,
  LayoutSingleColumn,
  NamedLink,
  Avatar,
} from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './ApplicationsPage.module.css';

// ================ Helper Functions ================ //

const getTransactionStatus = (transaction) => {
  const lastTransition = transaction.attributes?.lastTransition;
  const statusMap = {
    'transition/inquire': 'pending',
    'transition/request-project-application': 'pending',
    'transition/apply': 'pending',
    'transition/accept': 'accepted',
    'transition/decline': 'declined',
    'transition/mark-completed': 'completed',
    'transition/complete': 'completed',
    'transition/review-1-by-provider': 'reviewed',
    'transition/review-1-by-customer': 'reviewed',
    'transition/review-2-by-provider': 'reviewed',
    'transition/review-2-by-customer': 'reviewed',
    'transition/expire-review-period': 'reviewed',
    'transition/expire-customer-review-period': 'reviewed',
    'transition/expire-provider-review-period': 'reviewed',
  };
  return statusMap[lastTransition] || 'pending';
};

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Pending Review',
    accepted: 'Accepted',
    declined: 'Declined',
    completed: 'Completed',
    reviewed: 'Reviewed',
  };
  return labels[status] || 'Pending';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ================ Application Detail Panel ================ //

const ApplicationDetailPanel = ({ applicationData, isLoading }) => {
  if (isLoading) {
    return <div className={css.detailLoading}>Loading application details...</div>;
  }
  if (!applicationData) {
    return <div className={css.detailEmpty}>No detailed application data available.</div>;
  }

  const baseUrl = apiBaseUrl();

  return (
    <div className={css.detailPanel}>
      {/* Cover Letter */}
      <div className={css.detailSection}>
        <h4 className={css.detailSectionTitle}>Cover Letter</h4>
        <p className={css.detailText}>{applicationData.coverLetter || 'Not provided'}</p>
      </div>

      {/* Interest Reason */}
      {applicationData.interestReason && (
        <div className={css.detailSection}>
          <h4 className={css.detailSectionTitle}>Why They're Interested</h4>
          <p className={css.detailText}>{applicationData.interestReason}</p>
        </div>
      )}

      {/* Skills */}
      {applicationData.skills?.length > 0 && (
        <div className={css.detailSection}>
          <h4 className={css.detailSectionTitle}>Relevant Skills</h4>
          <div className={css.skillTags}>
            {applicationData.skills.map(skill => (
              <span key={skill} className={css.skillTag}>{skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Key Info Grid */}
      <div className={css.detailGrid}>
        {applicationData.availabilityDate && (
          <div className={css.detailGridItem}>
            <span className={css.detailGridLabel}>Available From</span>
            <span className={css.detailGridValue}>{formatDate(applicationData.availabilityDate)}</span>
          </div>
        )}
        {applicationData.hoursPerWeek && (
          <div className={css.detailGridItem}>
            <span className={css.detailGridLabel}>Hours/Week</span>
            <span className={css.detailGridValue}>{applicationData.hoursPerWeek}</span>
          </div>
        )}
        {applicationData.gpa && (
          <div className={css.detailGridItem}>
            <span className={css.detailGridLabel}>GPA</span>
            <span className={css.detailGridValue}>{applicationData.gpa}</span>
          </div>
        )}
        {applicationData.relevantCoursework && (
          <div className={css.detailGridItem}>
            <span className={css.detailGridLabel}>Coursework</span>
            <span className={css.detailGridValue}>{applicationData.relevantCoursework}</span>
          </div>
        )}
      </div>

      {/* Resume */}
      {applicationData.resumeAttachment && (
        <div className={css.detailSection}>
          <h4 className={css.detailSectionTitle}>Resume</h4>
          <a
            href={`${baseUrl}/api/attachments/${applicationData.resumeAttachment.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className={css.resumeLink}
          >
            &#128196; {applicationData.resumeAttachment.name} ({applicationData.resumeAttachment.size})
          </a>
        </div>
      )}

      {/* References */}
      {applicationData.referencesText && (
        <div className={css.detailSection}>
          <h4 className={css.detailSectionTitle}>References</h4>
          <p className={css.detailText}>{applicationData.referencesText}</p>
        </div>
      )}
    </div>
  );
};

// ================ Application Row Component ================ //

const ApplicationRow = ({ application, onAccept, onDecline, onMarkDone, isProcessing, actionError, expandedId, onToggleExpand, applicationDetails, detailsLoading }) => {
  const student = application.customer;
  const status = getTransactionStatus(application);
  const appliedDate = application.attributes?.createdAt;
  const applicationId = application.id?.uuid;
  const isExpanded = expandedId === applicationId;

  const studentName = student?.attributes?.profile?.displayName || 'Unknown Student';
  const studentInitials = student?.attributes?.profile?.abbreviatedName || '??';
  const university = student?.attributes?.profile?.publicData?.university || 'Not specified';
  const major = student?.attributes?.profile?.publicData?.major || 'Not specified';

  const hasError = actionError?.id === applicationId;

  return (
    <>
      <tr
        className={classNames(css.applicationRow, { [css.applicationRowExpanded]: isExpanded })}
        onClick={() => onToggleExpand(applicationId)}
      >
        <td className={css.studentCell}>
          <div className={css.studentInfo}>
            <div className={css.avatarWrapper}>
              {student?.profileImage ? (
                <Avatar user={student} className={css.avatar} />
              ) : (
                <div className={css.avatarPlaceholder}>{studentInitials}</div>
              )}
            </div>
            <div className={css.studentDetails}>
              <span className={css.studentName}>{studentName}</span>
              <span className={css.studentMeta}>{university}</span>
            </div>
          </div>
        </td>
        <td className={css.majorCell}>{major}</td>
        <td className={css.dateCell}>{formatDate(appliedDate)}</td>
        <td className={css.statusCell}>
          <span className={classNames(css.statusBadge, css[`status${status.charAt(0).toUpperCase() + status.slice(1)}`])}>
            {getStatusLabel(status)}
          </span>
        </td>
        <td className={css.actionsCell}>
          <div className={css.actionButtons} onClick={(e) => e.stopPropagation()}>
            {status === 'pending' && (
              <>
                <button
                  className={css.acceptButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccept(application);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Accept'}
                </button>
                <button
                  className={css.declineButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecline(application);
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Decline'}
                </button>
              </>
            )}
            {status === 'accepted' && (
              <button
                className={css.markDoneButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDone(application);
                }}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : '✓ Mark Done'}
              </button>
            )}
            {(status === 'completed' || status === 'reviewed') && (
              <NamedLink
                name="SaleDetailsPage"
                params={{ id: applicationId }}
                className={css.reviewButton}
                onClick={(e) => e.stopPropagation()}
              >
                {status === 'reviewed' ? '★ View Reviews' : '★ Leave Review'}
              </NamedLink>
            )}
          </div>
          <button
            className={css.expandButton}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(applicationId);
            }}
          >
            {isExpanded ? '▲ Hide' : '▼ Details'}
          </button>
        </td>
      </tr>
      {hasError && (
        <tr className={css.errorRow}>
          <td colSpan="5">
            <div className={css.actionErrorMessage}>
              {actionError.message}
            </div>
          </td>
        </tr>
      )}
      {isExpanded && (
        <tr className={css.detailRow}>
          <td colSpan="5">
            <ApplicationDetailPanel
              applicationData={applicationDetails[applicationId]}
              isLoading={detailsLoading[applicationId]}
            />
          </td>
        </tr>
      )}
    </>
  );
};

// ================ Project Section Component ================ //

const ProjectSection = ({ project, applications, onAccept, onDecline, onMarkDone, sortConfig, onSort, processingId, actionError, expandedId, onToggleExpand, applicationDetails, detailsLoading }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const sortedApplications = useMemo(() => {
    if (!sortConfig.key) return applications;

    return [...applications].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'name':
          aValue = a.customer?.attributes?.profile?.displayName || '';
          bValue = b.customer?.attributes?.profile?.displayName || '';
          break;
        case 'major':
          aValue = a.customer?.attributes?.profile?.publicData?.major || '';
          bValue = b.customer?.attributes?.profile?.publicData?.major || '';
          break;
        case 'date':
          aValue = new Date(a.attributes?.createdAt || 0);
          bValue = new Date(b.attributes?.createdAt || 0);
          break;
        case 'status':
          aValue = getTransactionStatus(a);
          bValue = getTransactionStatus(b);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [applications, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const pendingCount = applications.filter(a => getTransactionStatus(a) === 'pending').length;
  const acceptedCount = applications.filter(a => getTransactionStatus(a) === 'accepted').length;

  return (
    <div className={css.projectSection}>
      <div
        className={css.projectHeader}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={css.projectHeaderLeft}>
          <span className={css.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
          <h3 className={css.projectTitle}>{project.title}</h3>
          <span className={css.applicationCount}>
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className={css.projectHeaderRight}>
          {pendingCount > 0 && (
            <span className={css.pendingBadge}>{pendingCount} pending</span>
          )}
          {acceptedCount > 0 && (
            <span className={css.acceptedBadge}>{acceptedCount} accepted</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className={css.applicationsTable}>
          <table className={css.table}>
            <thead>
              <tr>
                <th
                  className={classNames(css.tableHeader, css.sortable)}
                  onClick={() => onSort('name')}
                >
                  Student {getSortIcon('name')}
                </th>
                <th
                  className={classNames(css.tableHeader, css.sortable)}
                  onClick={() => onSort('major')}
                >
                  Major {getSortIcon('major')}
                </th>
                <th
                  className={classNames(css.tableHeader, css.sortable)}
                  onClick={() => onSort('date')}
                >
                  Applied {getSortIcon('date')}
                </th>
                <th
                  className={classNames(css.tableHeader, css.sortable)}
                  onClick={() => onSort('status')}
                >
                  Status {getSortIcon('status')}
                </th>
                <th className={css.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedApplications.map((application) => (
                <ApplicationRow
                  key={application.id?.uuid || application.id}
                  application={application}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  onMarkDone={onMarkDone}
                  isProcessing={processingId === application.id?.uuid}
                  actionError={actionError}
                  expandedId={expandedId}
                  onToggleExpand={onToggleExpand}
                  applicationDetails={applicationDetails}
                  detailsLoading={detailsLoading}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ================ Main Component ================ //

const ApplicationsPageComponent = (props) => {
  const { scrollingDisabled, currentUser } = props;

  const intl = useIntl();
  const history = useHistory();

  const [applications, setApplications] = useState([]);
  const [listings, setListings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [applicationDetails, setApplicationDetails] = useState({});
  const [detailsLoading, setDetailsLoading] = useState({});

  // Fetch applications data
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setIsLoading(true);
        const baseUrl = apiBaseUrl();

        // Fetch transactions where current user is the provider (corporate)
        const response = await fetch(`${baseUrl}/api/corporate/applications`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setApplications(data.applications || []);
          setListings(data.listings || {});
        } else {
          // Fallback: If API doesn't exist yet, we'll show empty state
          setApplications([]);
          setListings({});
        }
      } catch (err) {
        console.error('Failed to fetch applications:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) {
      fetchApplications();
    }
  }, [currentUser]);

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Handle toggle expand to show application details
  const handleToggleExpand = async (applicationId) => {
    if (expandedId === applicationId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(applicationId);

    // If we already have details cached, don't re-fetch
    if (applicationDetails[applicationId]) return;

    setDetailsLoading(prev => ({ ...prev, [applicationId]: true }));
    try {
      const data = await fetchApplicationByTransaction(applicationId);
      setApplicationDetails(prev => ({ ...prev, [applicationId]: data?.application || data }));
    } catch (err) {
      console.error('Failed to fetch application details:', err);
      setApplicationDetails(prev => ({ ...prev, [applicationId]: null }));
    } finally {
      setDetailsLoading(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  // Handle accept application
  const handleAccept = async (application) => {
    const transactionId = application.id?.uuid;
    setProcessingId(transactionId);
    setActionError(null);

    try {
      // Find the project-application ID from cached details or fetch it
      const details = applicationDetails[transactionId];
      let appId = details?.id;
      if (!appId) {
        const appData = await fetchApplicationByTransaction(transactionId);
        const app = appData?.application || appData;
        appId = app?.id;
      }

      if (appId) {
        await acceptProjectApplication(appId);
      } else {
        throw new Error('Could not find application record');
      }

      // Update local state after confirmed success
      setApplications(prev => prev.map(app =>
        app.id?.uuid === transactionId
          ? { ...app, attributes: { ...app.attributes, lastTransition: 'transition/accept' } }
          : app
      ));
    } catch (err) {
      console.error('Failed to accept application:', err);
      const errorMessage = err?.message || 'Failed to accept application. Please try again.';
      setActionError({ id: transactionId, message: errorMessage, type: 'accept' });
    } finally {
      setProcessingId(null);
    }
  };

  // Handle mark project done
  const handleMarkDone = async (application) => {
    const transactionId = application.id?.uuid;
    if (!window.confirm('Are you sure you want to mark this project as completed? This will start the review process for both you and the student.')) {
      return;
    }
    setProcessingId(transactionId);
    setActionError(null);

    try {
      await markProjectCompleted(transactionId);

      // Update local state
      setApplications(prev => prev.map(app =>
        app.id?.uuid === transactionId
          ? { ...app, attributes: { ...app.attributes, lastTransition: 'transition/mark-completed' } }
          : app
      ));
    } catch (err) {
      console.error('Failed to mark project as done:', err);
      const errorMessage = err?.message || 'Failed to mark project as done. Please try again.';
      setActionError({ id: transactionId, message: errorMessage, type: 'markDone' });
    } finally {
      setProcessingId(null);
    }
  };

  // Handle decline application
  const handleDecline = async (application) => {
    const transactionId = application.id?.uuid;
    setProcessingId(transactionId);
    setActionError(null);

    try {
      // Find the project-application ID from cached details or fetch it
      const details = applicationDetails[transactionId];
      let appId = details?.id;
      if (!appId) {
        const appData = await fetchApplicationByTransaction(transactionId);
        const app = appData?.application || appData;
        appId = app?.id;
      }

      if (appId) {
        await declineProjectApplication(appId);
      } else {
        throw new Error('Could not find application record');
      }

      // Update local state after confirmed success
      setApplications(prev => prev.map(app =>
        app.id?.uuid === transactionId
          ? { ...app, attributes: { ...app.attributes, lastTransition: 'transition/decline' } }
          : app
      ));
    } catch (err) {
      console.error('Failed to decline application:', err);
      const errorMessage = err?.message || 'Failed to decline application. Please try again.';
      setActionError({ id: transactionId, message: errorMessage, type: 'decline' });
    } finally {
      setProcessingId(null);
    }
  };

  // Group applications by project/listing
  const applicationsByProject = useMemo(() => {
    const grouped = {};

    applications.forEach(app => {
      const listingId = app.listing?.id?.uuid || app.relationships?.listing?.data?.id;
      if (!listingId) return;

      const status = getTransactionStatus(app);
      if (filterStatus !== 'all' && status !== filterStatus) return;

      if (!grouped[listingId]) {
        grouped[listingId] = {
          listing: app.listing || listings[listingId] || {
            id: { uuid: listingId },
            attributes: { title: 'Unknown Project' }
          },
          applications: [],
        };
      }
      grouped[listingId].applications.push(app);
    });

    return Object.values(grouped);
  }, [applications, listings, filterStatus]);

  // Stats
  const totalApplications = applications.length;
  const pendingApplications = applications.filter(a => getTransactionStatus(a) === 'pending').length;
  const acceptedApplications = applications.filter(a => getTransactionStatus(a) === 'accepted').length;

  const title = intl.formatMessage({ id: 'ApplicationsPage.title' });

  // Check access - allow both 'corporate' and 'corporate-partner' user types
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const userType = publicData?.userType;
  const isCorporate = userType === 'corporate' || userType === 'corporate-partner';

  if (currentUser && !isCorporate) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.noAccess}>
            <h1>Access Denied</h1>
            <p>This page is only available for corporate partners.</p>
            <NamedLink name="LandingPage" className={css.backLink}>
              Return to Home
            </NamedLink>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          {/* Header */}
          <div className={css.header}>
            <div className={css.headerLeft}>
              <NamedLink name="CorporateDashboardPage" className={css.backToDashboard}>
                ← Back to Dashboard
              </NamedLink>
              <h1 className={css.pageTitle}>Student Applications</h1>
              <p className={css.pageSubtitle}>
                Review and manage applications from students interested in your projects
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={css.statsBar}>
            <div className={css.statItem}>
              <span className={css.statValue}>{totalApplications}</span>
              <span className={css.statLabel}>Total Applications</span>
            </div>
            <div className={css.statItem}>
              <span className={classNames(css.statValue, css.pendingValue)}>{pendingApplications}</span>
              <span className={css.statLabel}>Pending Review</span>
            </div>
            <div className={css.statItem}>
              <span className={classNames(css.statValue, css.acceptedValue)}>{acceptedApplications}</span>
              <span className={css.statLabel}>Accepted</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={css.filterBar}>
            <div className={css.filterGroup}>
              <label className={css.filterLabel}>Filter by Status:</label>
              <select
                className={css.filterSelect}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Applications</option>
                <option value="pending">Pending Review</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="completed">Completed</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
            <NamedLink name="SearchStudentsPage" className={css.inviteStudentsButton}>
              <span>🔍</span> Search & Invite Students
            </NamedLink>
          </div>

          {/* Content */}
          <div className={css.content}>
            {isLoading ? (
              <div className={css.loadingState}>
                <div className={css.spinner}></div>
                <p>Loading applications...</p>
              </div>
            ) : error ? (
              <div className={css.errorState}>
                <span className={css.errorIcon}>⚠️</span>
                <h3>Unable to load applications</h3>
                <p>Please try refreshing the page.</p>
              </div>
            ) : applicationsByProject.length === 0 ? (
              <div className={css.emptyState}>
                <span className={css.emptyIcon}>📭</span>
                <h3>No Applications Yet</h3>
                <p>
                  {filterStatus === 'all'
                    ? "You haven't received any student applications yet. Create projects and invite students to apply!"
                    : `No applications with status "${getStatusLabel(filterStatus)}".`
                  }
                </p>
                <div className={css.emptyActions}>
                  <NamedLink name="NewListingPage" className={css.createProjectButton}>
                    Create a Project
                  </NamedLink>
                  <NamedLink name="SearchStudentsPage" className={css.searchStudentsButton}>
                    Search Students
                  </NamedLink>
                </div>
              </div>
            ) : (
              <div className={css.projectsList}>
                {applicationsByProject.map(({ listing, applications: projectApps }) => (
                  <ProjectSection
                    key={listing.id?.uuid || listing.id}
                    project={{
                      id: listing.id?.uuid || listing.id,
                      title: listing.attributes?.title || 'Unknown Project',
                    }}
                    applications={projectApps}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onMarkDone={handleMarkDone}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    processingId={processingId}
                    actionError={actionError}
                    expandedId={expandedId}
                    onToggleExpand={handleToggleExpand}
                    applicationDetails={applicationDetails}
                    detailsLoading={detailsLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = (state) => {
  const { currentUser } = state.user;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
  };
};

const ApplicationsPage = compose(
  connect(mapStateToProps)
)(ApplicationsPageComponent);

export default ApplicationsPage;
