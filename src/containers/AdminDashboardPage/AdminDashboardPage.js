import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory, useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import classNames from 'classnames';

import { Page, LayoutSingleColumn, PaginationLinks } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import {
  fetchUsers,
  blockUserAction,
  unblockUserAction,
  deleteUserAction,
  createAdminUserAction,
  clearCreateAdminState,
  fetchMessages,
  sendMessage,
  fetchReports,
  clearMessageState,
  fetchDeposits,
  confirmDepositAction,
  revokeDepositAction,
  fetchContent,
  updateContentAction,
  addContentItemAction,
  updateContentItemAction,
  deleteContentItemAction,
  resetContentAction,
  clearContentState,
} from './AdminDashboardPage.duck';

import css from './AdminDashboardPage.module.css';

// ================ User Management Panel ================ //

const UserManagementPanel = props => {
  const {
    users,
    pagination,
    fetchInProgress,
    blockInProgress,
    deleteInProgress,
    onFetchUsers,
    onBlockUser,
    onUnblockUser,
    onDeleteUser,
    onMessageEducator,
  } = props;

  const [filters, setFilters] = useState({
    userType: '',
    status: '',
    search: '',
  });
  const [confirmModal, setConfirmModal] = useState(null);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    const params = {};
    if (filters.userType) params.userType = filters.userType;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    onFetchUsers(params);
  };

  const handleBlock = async userId => {
    try {
      await onBlockUser(userId);
      onFetchUsers({}); // Refresh list
    } catch (e) {
      console.error('Block failed:', e);
    }
    setConfirmModal(null);
  };

  const handleUnblock = async userId => {
    try {
      await onUnblockUser(userId);
      onFetchUsers({});
    } catch (e) {
      console.error('Unblock failed:', e);
    }
  };

  const handleDelete = async userId => {
    try {
      await onDeleteUser(userId);
      onFetchUsers({});
    } catch (e) {
      console.error('Delete failed:', e);
    }
    setConfirmModal(null);
  };

  const getUserStatus = user => {
    if (user.attributes?.deleted) return 'deleted';
    if (user.attributes?.banned) return 'banned';
    return 'active';
  };

  const getUserTypeLabel = userType => {
    const labels = {
      student: 'Student',
      'corporate-partner': 'Corporate',
      'educational-admin': 'Edu Admin',
      'system-admin': 'Sys Admin',
    };
    return labels[userType] || userType;
  };

  const getInitials = name => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>
          <FormattedMessage id="AdminDashboardPage.userManagement" />
        </h2>
      </div>

      {/* Filters */}
      <div className={css.filterBar}>
        <div className={css.filterItem}>
          <label className={css.filterLabel}>
            <FormattedMessage id="AdminDashboardPage.filterUserType" />
          </label>
          <select
            className={css.filterSelect}
            value={filters.userType}
            onChange={e => handleFilterChange('userType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="student">Students</option>
            <option value="corporate-partner">Corporate Partners</option>
            <option value="educational-admin">Educational Admins</option>
            <option value="system-admin">System Admins</option>
          </select>
        </div>

        <div className={css.filterItem}>
          <label className={css.filterLabel}>
            <FormattedMessage id="AdminDashboardPage.filterStatus" />
          </label>
          <select
            className={css.filterSelect}
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div className={css.filterItem}>
          <label className={css.filterLabel}>
            <FormattedMessage id="AdminDashboardPage.filterSearch" />
          </label>
          <input
            type="text"
            className={css.filterInput}
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>

        <button className={css.searchButton} onClick={handleSearch} disabled={fetchInProgress}>
          <FormattedMessage id="AdminDashboardPage.searchButton" />
        </button>
      </div>

      {/* Users Table */}
      {fetchInProgress ? (
        <div className={css.loadingState}>
          <FormattedMessage id="AdminDashboardPage.loading" />
        </div>
      ) : (
        <>
          <table className={css.usersTable}>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableUser" />
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableType" />
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableStatus" />
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableJoined" />
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableActions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const publicData = user.attributes?.profile?.publicData || {};
                const userType = publicData.userType || 'unknown';
                const status = getUserStatus(user);
                const displayName = user.attributes?.profile?.displayName || 'Unknown User';
                const createdAt = user.attributes?.createdAt
                  ? new Date(user.attributes.createdAt).toLocaleDateString()
                  : 'N/A';

                return (
                  <tr key={user.id}>
                    <td>
                      <div className={css.userCell}>
                        <div className={css.userAvatar}>
                          {user.profileImage ? (
                            <img
                              src={user.profileImage.attributes?.variants?.['square-small']?.url}
                              alt=""
                            />
                          ) : (
                            getInitials(displayName)
                          )}
                        </div>
                        <div className={css.userInfo}>
                          <span className={css.userName}>{displayName}</span>
                          <span className={css.userEmail}>
                            {user.attributes?.email || publicData.email || ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={classNames(css.userTypeBadge, css[userType])}>
                        {getUserTypeLabel(userType)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={classNames(css.statusBadge, {
                          [css.statusActive]: status === 'active',
                          [css.statusBanned]: status === 'banned',
                          [css.statusDeleted]: status === 'deleted',
                        })}
                      >
                        {status}
                      </span>
                    </td>
                    <td>{createdAt}</td>
                    <td>
                      <div className={css.actionButtons}>
                        {status !== 'deleted' && (
                          <>
                            {status === 'banned' ? (
                              <button
                                className={classNames(css.actionButton, css.unblockButton)}
                                onClick={() => handleUnblock(user.id)}
                                disabled={blockInProgress === user.id}
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                className={classNames(css.actionButton, css.blockButton)}
                                onClick={() => setConfirmModal({ type: 'block', user })}
                                disabled={blockInProgress === user.id}
                              >
                                Block
                              </button>
                            )}
                            <button
                              className={classNames(css.actionButton, css.deleteButton)}
                              onClick={() => setConfirmModal({ type: 'delete', user })}
                              disabled={deleteInProgress === user.id}
                            >
                              Delete
                            </button>
                            {userType === 'educational-admin' && (
                              <button
                                className={classNames(css.actionButton, css.messageButton)}
                                onClick={() => onMessageEducator(user)}
                              >
                                Message
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {pagination && pagination.totalPages > 1 && (
            <div className={css.paginationWrapper}>
              <PaginationLinks
                pageName="AdminDashboardPage"
                pageSearchParams={{ tab: 'users' }}
                pagination={{
                  ...pagination,
                  paginationUnsupported: false,
                }}
              />
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className={css.modalOverlay} onClick={() => setConfirmModal(null)}>
          <div className={css.modal} onClick={e => e.stopPropagation()}>
            <h3 className={css.modalTitle}>
              {confirmModal.type === 'block' ? 'Block User' : 'Delete User'}
            </h3>
            <p className={css.modalMessage}>
              {confirmModal.type === 'block'
                ? `Are you sure you want to block ${confirmModal.user.attributes?.profile?.displayName}? They will not be able to access the platform.`
                : `Are you sure you want to delete ${confirmModal.user.attributes?.profile?.displayName}? This action cannot be undone.`}
            </p>
            <div className={css.modalActions}>
              <button className={css.modalCancel} onClick={() => setConfirmModal(null)}>
                Cancel
              </button>
              <button
                className={css.modalConfirm}
                onClick={() =>
                  confirmModal.type === 'block'
                    ? handleBlock(confirmModal.user.id)
                    : handleDelete(confirmModal.user.id)
                }
                disabled={blockInProgress || deleteInProgress}
              >
                {confirmModal.type === 'block' ? 'Block' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ Messages Panel ================ //

const MessagesPanel = props => {
  const {
    messages,
    sendInProgress,
    sendError,
    sendSuccess,
    educationalAdmins,
    onSendMessage,
    onClearMessageState,
  } = props;

  const [formData, setFormData] = useState({
    recipientId: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    if (sendSuccess) {
      setFormData({ recipientId: '', subject: '', body: '' });
      // Clear success message after 3 seconds
      const timer = setTimeout(() => onClearMessageState(), 3000);
      return () => clearTimeout(timer);
    }
  }, [sendSuccess, onClearMessageState]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!formData.recipientId || !formData.subject || !formData.body) return;

    await onSendMessage(formData);
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className={css.messagesPanel}>
      {/* Compose Section */}
      <div className={css.composeSection}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage id="AdminDashboardPage.composeMessage" />
        </h3>

        {sendSuccess && (
          <div className={css.successMessage}>
            <FormattedMessage id="AdminDashboardPage.messageSent" />
          </div>
        )}

        {sendError && (
          <div className={css.errorMessage}>
            <FormattedMessage id="AdminDashboardPage.messageError" />
          </div>
        )}

        <form className={css.composeForm} onSubmit={handleSubmit}>
          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.recipientLabel" />
            </label>
            <select
              value={formData.recipientId}
              onChange={e => setFormData(prev => ({ ...prev, recipientId: e.target.value }))}
              required
            >
              <option value="">Select an educational admin...</option>
              {educationalAdmins.map(admin => (
                <option key={admin.id} value={admin.id}>
                  {admin.attributes?.profile?.displayName || 'Unknown'}
                  {admin.attributes?.profile?.publicData?.institutionName
                    ? ` (${admin.attributes.profile.publicData.institutionName})`
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.subjectLabel" />
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="Message subject..."
              required
            />
          </div>

          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.messageLabel" />
            </label>
            <textarea
              value={formData.body}
              onChange={e => setFormData(prev => ({ ...prev, body: e.target.value }))}
              placeholder="Write your message..."
              required
            />
          </div>

          <button
            type="submit"
            className={css.sendButton}
            disabled={
              sendInProgress || !formData.recipientId || !formData.subject || !formData.body
            }
          >
            {sendInProgress ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>

      {/* Messages List Section */}
      <div className={css.messagesListSection}>
        <h3 className={css.sectionTitle}>
          <FormattedMessage id="AdminDashboardPage.sentMessages" />
        </h3>

        {messages.length === 0 ? (
          <div className={css.noMessages}>
            <FormattedMessage id="AdminDashboardPage.noMessages" />
          </div>
        ) : (
          <div className={css.messagesList}>
            {messages.map(message => (
              <div key={message.id} className={css.messageItem}>
                <div className={css.messageHeader}>
                  <span className={css.messageRecipient}>
                    To: {message.recipientName || message.recipientId}
                  </span>
                  <span className={css.messageDate}>{formatDate(message.createdAt)}</span>
                </div>
                <div className={css.messageSubject}>{message.subject}</div>
                <div className={css.messageBody}>{message.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ================ Reports Panel ================ //

const ReportsPanel = props => {
  const { reports, fetchInProgress, currentReportType, onFetchReports } = props;

  const reportTypes = [
    { key: 'overview', label: 'Platform Overview' },
    { key: 'users', label: 'Users Report' },
    { key: 'institutions', label: 'Institutions' },
    { key: 'transactions', label: 'Transactions' },
  ];

  const renderOverviewReport = () => {
    if (!reports) return null;

    const { userCounts, transactionStats, growth, platformHealth } = reports;

    return (
      <>
        <div className={css.statsGrid}>
          <div className={css.statCard}>
            <p className={css.statValue}>{userCounts?.total || 0}</p>
            <p className={css.statLabel}>Total Users</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{userCounts?.students || 0}</p>
            <p className={css.statLabel}>Students</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{userCounts?.corporatePartners || 0}</p>
            <p className={css.statLabel}>Corporate Partners</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{userCounts?.educationalAdmins || 0}</p>
            <p className={css.statLabel}>Educational Admins</p>
          </div>
        </div>

        <div className={css.reportSection}>
          <h4 className={css.reportSectionTitle}>Transaction Statistics</h4>
          <div className={css.statsGrid}>
            <div className={css.statCard}>
              <p className={css.statValue}>{transactionStats?.total || 0}</p>
              <p className={css.statLabel}>Total Transactions</p>
            </div>
            <div className={css.statCard}>
              <p className={css.statValue}>{transactionStats?.thisMonth || 0}</p>
              <p className={css.statLabel}>This Month</p>
            </div>
            <div className={css.statCard}>
              <p className={css.statValue}>{transactionStats?.thisWeek || 0}</p>
              <p className={css.statLabel}>This Week</p>
            </div>
            <div className={css.statCard}>
              <p className={css.statValue}>{growth?.weeklyTransactionGrowth || 0}%</p>
              <p className={css.statLabel}>Weekly Growth</p>
            </div>
          </div>
        </div>

        <div className={css.reportSection}>
          <h4 className={css.reportSectionTitle}>Platform Health</h4>
          <div className={css.metricsBar}>
            <div className={css.metricItem}>
              <span className={css.metricValue}>{platformHealth?.activeUsersEstimate || 0}</span>
              <span className={css.metricLabel}>Est. Active Users</span>
            </div>
            <div className={css.metricItem}>
              <span className={css.metricValue}>{platformHealth?.engagementRate || 0}</span>
              <span className={css.metricLabel}>Engagement Rate</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderUsersReport = () => {
    if (!reports) return null;

    const { breakdown, summary } = reports;

    return (
      <>
        <div className={css.statsGrid}>
          <div className={css.statCard}>
            <p className={css.statValue}>{summary?.totalUsers || 0}</p>
            <p className={css.statLabel}>Total Users</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{summary?.totalActive || 0}</p>
            <p className={css.statLabel}>Active Users</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{summary?.totalBanned || 0}</p>
            <p className={css.statLabel}>Banned Users</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{summary?.newUsersThisMonth || 0}</p>
            <p className={css.statLabel}>New This Month</p>
          </div>
        </div>

        <div className={css.reportSection}>
          <h4 className={css.reportSectionTitle}>Breakdown by User Type</h4>
          <div className={css.breakdownGrid}>
            {breakdown &&
              Object.entries(breakdown).map(([userType, stats]) => (
                <div key={userType} className={css.breakdownCard}>
                  <h5 className={css.breakdownTitle}>{userType.replace('-', ' ')}</h5>
                  <div className={css.breakdownStats}>
                    <div className={css.breakdownStat}>
                      <span>Total</span>
                      <span>{stats.total}</span>
                    </div>
                    <div className={css.breakdownStat}>
                      <span>Active</span>
                      <span>{stats.active}</span>
                    </div>
                    <div className={css.breakdownStat}>
                      <span>Banned</span>
                      <span>{stats.banned}</span>
                    </div>
                    <div className={css.breakdownStat}>
                      <span>New This Month</span>
                      <span>{stats.newThisMonth}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </>
    );
  };

  const renderInstitutionsReport = () => {
    if (!reports) return null;

    const { totalInstitutions, institutions, summary } = reports;

    return (
      <>
        <div className={css.statsGrid}>
          <div className={css.statCard}>
            <p className={css.statValue}>{totalInstitutions || 0}</p>
            <p className={css.statLabel}>Total Institutions</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{summary?.totalStudentsWithInstitution || 0}</p>
            <p className={css.statLabel}>Students with Institution</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{summary?.avgStudentsPerInstitution || 0}</p>
            <p className={css.statLabel}>Avg Students/Institution</p>
          </div>
        </div>

        <div className={css.reportSection}>
          <h4 className={css.reportSectionTitle}>Institutions</h4>
          {institutions && institutions.length > 0 ? (
            <table className={css.institutionsTable}>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Domain</th>
                  <th>Students</th>
                  <th>Admins</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((inst, idx) => (
                  <tr key={idx}>
                    <td>{inst.name || 'Unknown'}</td>
                    <td>{inst.domain}</td>
                    <td>{inst.studentCount}</td>
                    <td>{inst.adminCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No institutions found.</p>
          )}
        </div>
      </>
    );
  };

  const renderTransactionsReport = () => {
    if (!reports) return null;

    const { totalTransactions, byState, metrics } = reports;

    return (
      <>
        <div className={css.statsGrid}>
          <div className={css.statCard}>
            <p className={css.statValue}>{totalTransactions || 0}</p>
            <p className={css.statLabel}>Total Transactions</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{metrics?.acceptanceRate || 0}%</p>
            <p className={css.statLabel}>Acceptance Rate</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{metrics?.completionRate || 0}%</p>
            <p className={css.statLabel}>Completion Rate</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{metrics?.avgDaysToDecision || 0}</p>
            <p className={css.statLabel}>Avg Days to Decision</p>
          </div>
        </div>

        <div className={css.reportSection}>
          <h4 className={css.reportSectionTitle}>Transaction States</h4>
          <div className={css.breakdownGrid}>
            {byState &&
              Object.entries(byState).map(([state, count]) => (
                <div key={state} className={css.breakdownCard}>
                  <h5 className={css.breakdownTitle}>{state}</h5>
                  <div className={css.breakdownStats}>
                    <div className={css.breakdownStat}>
                      <span>Count</span>
                      <span>{count}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className={css.reportSection}>
          <h4 className={css.reportSectionTitle}>Performance Metrics</h4>
          <div className={css.metricsBar}>
            <div className={css.metricItem}>
              <span className={css.metricValue}>{metrics?.avgDaysToDecision || 0}</span>
              <span className={css.metricLabel}>Avg Days to Decision</span>
            </div>
            <div className={css.metricItem}>
              <span className={css.metricValue}>{metrics?.avgDaysToCompletion || 0}</span>
              <span className={css.metricLabel}>Avg Days to Completion</span>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderReportContent = () => {
    if (fetchInProgress) {
      return <div className={css.loadingState}>Loading report...</div>;
    }

    switch (currentReportType) {
      case 'overview':
        return renderOverviewReport();
      case 'users':
        return renderUsersReport();
      case 'institutions':
        return renderInstitutionsReport();
      case 'transactions':
        return renderTransactionsReport();
      default:
        return renderOverviewReport();
    }
  };

  const handleExport = format => {
    const reportType = currentReportType || 'overview';
    window.open(`/api/admin/export/${reportType}?format=${format}`, '_blank');
  };

  return (
    <div className={css.reportsPanel}>
      <div className={css.reportTypeSelector}>
        {reportTypes.map(type => (
          <button
            key={type.key}
            className={classNames(css.reportTypeButton, {
              [css.reportTypeButtonActive]: currentReportType === type.key,
            })}
            onClick={() => onFetchReports(type.key)}
          >
            {type.label}
          </button>
        ))}
      </div>

      <div className={css.reportContent}>
        <div className={css.reportHeader}>
          <div className={css.reportHeaderLeft}>
            <h3 className={css.reportTitle}>
              {reportTypes.find(t => t.key === currentReportType)?.label || 'Platform Overview'}
            </h3>
            {reports?.generatedAt && (
              <span className={css.reportMeta}>
                Generated: {new Date(reports.generatedAt).toLocaleString()}
              </span>
            )}
          </div>
          <div className={css.exportButtons}>
            <button
              className={css.exportButton}
              onClick={() => handleExport('csv')}
              title="Download as CSV (Excel-compatible)"
            >
              <span className={css.exportIcon}>📊</span>
              <FormattedMessage id="AdminDashboardPage.exportCSV" />
            </button>
            <button
              className={css.exportButton}
              onClick={() => handleExport('html')}
              title="Download as HTML (Word-compatible)"
            >
              <span className={css.exportIcon}>📄</span>
              <FormattedMessage id="AdminDashboardPage.exportHTML" />
            </button>
          </div>
        </div>
        {renderReportContent()}
      </div>
    </div>
  );
};

// ================ Deposits Panel ================ //

const DepositsPanel = props => {
  const {
    deposits,
    fetchInProgress,
    confirmInProgress,
    revokeInProgress,
    onFetchDeposits,
    onConfirmDeposit,
    onRevokeDeposit,
  } = props;

  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmData, setConfirmData] = useState({
    amount: '',
    paymentMethod: 'check',
    notes: '',
  });
  const [revokeModal, setRevokeModal] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  const handleConfirmDeposit = async () => {
    if (!confirmModal) return;
    try {
      await onConfirmDeposit(confirmModal.id, {
        amount: confirmData.amount,
        paymentMethod: confirmData.paymentMethod,
        notes: confirmData.notes,
      });
      setConfirmModal(null);
      setConfirmData({ amount: '', paymentMethod: 'check', notes: '' });
      onFetchDeposits({});
    } catch (e) {
      console.error('Confirm deposit failed:', e);
    }
  };

  const handleRevokeDeposit = async () => {
    if (!revokeModal) return;
    try {
      await onRevokeDeposit(revokeModal.id, revokeReason);
      setRevokeModal(null);
      setRevokeReason('');
      onFetchDeposits({});
    } catch (e) {
      console.error('Revoke deposit failed:', e);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>
          <FormattedMessage id="AdminDashboardPage.depositsTitle" />
        </h2>
        <button
          className={css.refreshButton}
          onClick={() => onFetchDeposits({})}
          disabled={fetchInProgress}
        >
          <FormattedMessage id="AdminDashboardPage.refreshDeposits" />
        </button>
      </div>

      <p className={css.depositsDescription}>
        <FormattedMessage id="AdminDashboardPage.depositsDescription" />
      </p>

      {fetchInProgress ? (
        <div className={css.loadingState}>
          <FormattedMessage id="AdminDashboardPage.loading" />
        </div>
      ) : deposits.length === 0 ? (
        <div className={css.emptyState}>
          <FormattedMessage id="AdminDashboardPage.noDeposits" />
        </div>
      ) : (
        <table className={css.depositsTable}>
          <thead>
            <tr>
              <th>
                <FormattedMessage id="AdminDashboardPage.depositProject" />
              </th>
              <th>
                <FormattedMessage id="AdminDashboardPage.depositCorporate" />
              </th>
              <th>
                <FormattedMessage id="AdminDashboardPage.depositStudent" />
              </th>
              <th>
                <FormattedMessage id="AdminDashboardPage.depositDate" />
              </th>
              <th>
                <FormattedMessage id="AdminDashboardPage.depositStatus" />
              </th>
              <th>
                <FormattedMessage id="AdminDashboardPage.tableActions" />
              </th>
            </tr>
          </thead>
          <tbody>
            {deposits.map(deposit => {
              const isConfirmed = deposit.metadata?.depositConfirmed;
              return (
                <tr key={deposit.id}>
                  <td>
                    <div className={css.depositProject}>
                      <span className={css.depositProjectTitle}>
                        {deposit.listing?.title || 'Unknown Project'}
                      </span>
                      <span className={css.depositProjectId}>
                        ID: {deposit.id.substring(0, 8)}...
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={css.userCell}>
                      <div className={css.userInfo}>
                        <span className={css.userName}>
                          {deposit.provider?.displayName || 'Unknown'}
                        </span>
                        <span className={css.userEmail}>
                          {deposit.provider?.companyName || deposit.provider?.email || ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={css.userCell}>
                      <div className={css.userInfo}>
                        <span className={css.userName}>
                          {deposit.customer?.displayName || 'Unknown'}
                        </span>
                        <span className={css.userEmail}>{deposit.customer?.email || ''}</span>
                      </div>
                    </div>
                  </td>
                  <td>{formatDate(deposit.createdAt)}</td>
                  <td>
                    <span
                      className={classNames(css.depositStatusBadge, {
                        [css.depositPending]: !isConfirmed,
                        [css.depositConfirmed]: isConfirmed,
                      })}
                    >
                      {isConfirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div className={css.actionButtons}>
                      {!isConfirmed ? (
                        <button
                          className={classNames(css.actionButton, css.confirmButton)}
                          onClick={() => setConfirmModal(deposit)}
                          disabled={confirmInProgress === deposit.id}
                        >
                          <FormattedMessage id="AdminDashboardPage.confirmDeposit" />
                        </button>
                      ) : (
                        <button
                          className={classNames(css.actionButton, css.revokeButton)}
                          onClick={() => setRevokeModal(deposit)}
                          disabled={revokeInProgress === deposit.id}
                        >
                          <FormattedMessage id="AdminDashboardPage.revokeDeposit" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Confirm Deposit Modal */}
      {confirmModal && (
        <div className={css.modalOverlay} onClick={() => setConfirmModal(null)}>
          <div className={css.modal} onClick={e => e.stopPropagation()}>
            <h3 className={css.modalTitle}>
              <FormattedMessage id="AdminDashboardPage.confirmDepositTitle" />
            </h3>
            <p className={css.modalMessage}>
              <FormattedMessage
                id="AdminDashboardPage.confirmDepositMessage"
                values={{ project: confirmModal.listing?.title || 'Unknown Project' }}
              />
            </p>

            <div className={css.formField}>
              <label>
                <FormattedMessage id="AdminDashboardPage.depositAmount" />
              </label>
              <input
                type="text"
                value={confirmData.amount}
                onChange={e => setConfirmData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. $500"
              />
            </div>

            <div className={css.formField}>
              <label>
                <FormattedMessage id="AdminDashboardPage.depositPaymentMethod" />
              </label>
              <select
                value={confirmData.paymentMethod}
                onChange={e => setConfirmData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              >
                <option value="check">Check</option>
                <option value="wire">Wire Transfer</option>
                <option value="ach">ACH</option>
                <option value="credit-card">Credit Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={css.formField}>
              <label>
                <FormattedMessage id="AdminDashboardPage.depositNotes" />
              </label>
              <textarea
                value={confirmData.notes}
                onChange={e => setConfirmData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes about this deposit..."
              />
            </div>

            <div className={css.modalActions}>
              <button className={css.modalCancel} onClick={() => setConfirmModal(null)}>
                <FormattedMessage id="AdminDashboardPage.cancel" />
              </button>
              <button
                className={classNames(css.modalConfirm, css.modalConfirmGreen)}
                onClick={handleConfirmDeposit}
                disabled={confirmInProgress}
              >
                <FormattedMessage id="AdminDashboardPage.confirmDeposit" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Deposit Modal */}
      {revokeModal && (
        <div className={css.modalOverlay} onClick={() => setRevokeModal(null)}>
          <div className={css.modal} onClick={e => e.stopPropagation()}>
            <h3 className={css.modalTitle}>
              <FormattedMessage id="AdminDashboardPage.revokeDepositTitle" />
            </h3>
            <p className={css.modalMessage}>
              <FormattedMessage
                id="AdminDashboardPage.revokeDepositMessage"
                values={{ project: revokeModal.listing?.title || 'Unknown Project' }}
              />
            </p>

            <div className={css.formField}>
              <label>
                <FormattedMessage id="AdminDashboardPage.revokeReason" />
              </label>
              <textarea
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                placeholder="Reason for revoking deposit confirmation..."
              />
            </div>

            <div className={css.modalActions}>
              <button className={css.modalCancel} onClick={() => setRevokeModal(null)}>
                <FormattedMessage id="AdminDashboardPage.cancel" />
              </button>
              <button
                className={css.modalConfirm}
                onClick={handleRevokeDeposit}
                disabled={revokeInProgress}
              >
                <FormattedMessage id="AdminDashboardPage.revokeDeposit" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ Create Admin Panel ================ //

const CreateAdminPanel = props => {
  const {
    createInProgress,
    createError,
    createSuccess,
    onCreateAdmin,
    onClearCreateAdminState,
    onFetchUsers,
  } = props;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    userType: 'educational-admin',
    institutionName: '',
    adminRole: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (createSuccess) {
      // Reset form on success
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        userType: 'educational-admin',
        institutionName: '',
        adminRole: '',
      });
      // Refresh users list
      onFetchUsers({});
      // Clear success after 5 seconds
      const timer = setTimeout(() => onClearCreateAdminState(), 5000);
      return () => clearTimeout(timer);
    }
  }, [createSuccess, onClearCreateAdminState, onFetchUsers]);

  const handleSubmit = async e => {
    e.preventDefault();
    const { email, password, firstName, lastName, userType, institutionName, adminRole } = formData;

    if (!email || !password || !firstName || !lastName) {
      return;
    }

    if (userType === 'educational-admin' && !institutionName) {
      return;
    }

    try {
      await onCreateAdmin({
        email,
        password,
        firstName,
        lastName,
        userType,
        institutionName: userType === 'educational-admin' ? institutionName : undefined,
        adminRole: userType === 'educational-admin' && adminRole ? adminRole : undefined,
      });
    } catch (err) {
      console.error('Create admin failed:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear any previous errors when user starts typing
    if (createError) {
      onClearCreateAdminState();
    }
  };

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>
          <FormattedMessage id="AdminDashboardPage.createAdminTitle" />
        </h2>
      </div>

      <p className={css.panelDescription}>
        <FormattedMessage id="AdminDashboardPage.createAdminDescription" />
      </p>

      {createSuccess && (
        <div className={css.successMessage}>
          <FormattedMessage id="AdminDashboardPage.createAdminSuccess" />
        </div>
      )}

      {createError && (
        <div className={css.errorMessage}>
          {createError.message || <FormattedMessage id="AdminDashboardPage.createAdminError" />}
        </div>
      )}

      <form className={css.createAdminForm} onSubmit={handleSubmit}>
        <div className={css.formRow}>
          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.adminTypeLabel" />
            </label>
            <select
              value={formData.userType}
              onChange={e => handleChange('userType', e.target.value)}
              required
            >
              <option value="educational-admin">Educational Administrator</option>
              <option value="system-admin">System Administrator</option>
            </select>
          </div>
        </div>

        <div className={css.formRow}>
          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.firstNameLabel" />
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={e => handleChange('firstName', e.target.value)}
              placeholder="First name"
              required
            />
          </div>
          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.lastNameLabel" />
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={e => handleChange('lastName', e.target.value)}
              placeholder="Last name"
              required
            />
          </div>
        </div>

        <div className={css.formRow}>
          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.emailLabel" />
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="admin@institution.edu"
              required
            />
          </div>
        </div>

        <div className={css.formRow}>
          <div className={css.formField}>
            <label>
              <FormattedMessage id="AdminDashboardPage.passwordLabel" />
            </label>
            <div className={css.passwordField}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
                placeholder="Temporary password"
                minLength={8}
                required
              />
              <button
                type="button"
                className={css.showPasswordButton}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className={css.fieldHint}>
              <FormattedMessage id="AdminDashboardPage.passwordHint" />
            </span>
          </div>
        </div>

        {formData.userType === 'educational-admin' && (
          <>
            <div className={css.formRow}>
              <div className={css.formField}>
                <label>
                  <FormattedMessage id="AdminDashboardPage.institutionNameLabel" />
                </label>
                <input
                  type="text"
                  value={formData.institutionName}
                  onChange={e => handleChange('institutionName', e.target.value)}
                  placeholder="e.g. Harvard University"
                  required
                />
              </div>
            </div>

            <div className={css.formRow}>
              <div className={css.formField}>
                <label>
                  <FormattedMessage id="AdminDashboardPage.adminRoleLabel" />
                </label>
                <select
                  value={formData.adminRole}
                  onChange={e => handleChange('adminRole', e.target.value)}
                >
                  <option value="">Select role (optional)</option>
                  <option value="career-services">Career Services</option>
                  <option value="student-affairs">Student Affairs</option>
                  <option value="department-admin">Department Administrator</option>
                  <option value="dean">Dean</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div className={css.formActions}>
          <button type="submit" className={css.createAdminButton} disabled={createInProgress}>
            {createInProgress ? (
              <FormattedMessage id="AdminDashboardPage.creating" />
            ) : (
              <FormattedMessage id="AdminDashboardPage.createAdminButton" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ================ Institution Management Panel ================ //

const InstitutionManagementPanel = props => {
  const [institutions, setInstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    domain: '',
    name: '',
    membershipStatus: 'active',
    membershipStartDate: '',
    membershipEndDate: '',
    aiCoachingEnabled: false,
    aiCoachingUrl: '',
  });
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchInstitutions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/institutions', { credentials: 'include' });
      const data = await response.json();
      setInstitutions(data.data || []);
    } catch (error) {
      console.error('Failed to fetch institutions:', error);
      setErrorMessage('Failed to load institutions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaveInProgress(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/admin/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccessMessage(editingInstitution ? 'Institution updated!' : 'Institution added!');
        setTimeout(() => setSuccessMessage(''), 3000);
        setShowAddForm(false);
        setEditingInstitution(null);
        setFormData({
          domain: '',
          name: '',
          membershipStatus: 'active',
          membershipStartDate: '',
          membershipEndDate: '',
          aiCoachingEnabled: false,
          aiCoachingUrl: '',
        });
        fetchInstitutions();
      } else {
        setErrorMessage(data.error || 'Failed to save institution');
      }
    } catch (error) {
      setErrorMessage('Failed to save institution');
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleEdit = (institution) => {
    setFormData({
      domain: institution.domain,
      name: institution.name,
      membershipStatus: institution.membershipStatus || 'pending',
      membershipStartDate: institution.membershipStartDate || '',
      membershipEndDate: institution.membershipEndDate || '',
      aiCoachingEnabled: institution.aiCoachingEnabled || false,
      aiCoachingUrl: institution.aiCoachingUrl || '',
    });
    setEditingInstitution(institution);
    setShowAddForm(true);
  };

  const handleDelete = async (domain) => {
    if (!window.confirm('Are you sure you want to delete this institution?')) return;
    try {
      const response = await fetch(`/api/admin/institutions/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setSuccessMessage('Institution deleted!');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchInstitutions();
      }
    } catch (error) {
      setErrorMessage('Failed to delete institution');
    }
  };

  const handleToggleCoaching = async (institution) => {
    try {
      const response = await fetch(`/api/admin/institutions/${encodeURIComponent(institution.domain)}/coaching`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aiCoachingEnabled: !institution.aiCoachingEnabled,
        }),
      });
      if (response.ok) {
        fetchInstitutions();
      }
    } catch (error) {
      setErrorMessage('Failed to update coaching status');
    }
  };

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>Institution Management</h2>
        <button
          className={css.addButton}
          onClick={() => {
            setShowAddForm(true);
            setEditingInstitution(null);
            setFormData({
              domain: '',
              name: '',
              membershipStatus: 'active',
              membershipStartDate: '',
              membershipEndDate: '',
              aiCoachingEnabled: false,
              aiCoachingUrl: '',
            });
          }}
        >
          + Add Institution
        </button>
      </div>

      <p className={css.panelDescription}>
        Manage educational institution memberships and AI coaching access. Only students from member institutions can sign up.
      </p>

      {successMessage && <div className={css.successMessage}>{successMessage}</div>}
      {errorMessage && <div className={css.errorMessage}>{errorMessage}</div>}

      {showAddForm && (
        <div className={css.institutionForm}>
          <h3 className={css.formTitle}>
            {editingInstitution ? 'Edit Institution' : 'Add New Institution'}
          </h3>

          <div className={css.formRow}>
            <div className={css.formField}>
              <label>Email Domain</label>
              <input
                type="text"
                value={formData.domain}
                onChange={e => handleInputChange('domain', e.target.value)}
                placeholder="e.g. harvard.edu"
                disabled={!!editingInstitution}
              />
              <span className={css.fieldHint}>The email domain students use (e.g., harvard.edu)</span>
            </div>
          </div>

          <div className={css.formRow}>
            <div className={css.formField}>
              <label>Institution Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                placeholder="e.g. Harvard University"
              />
            </div>
          </div>

          <div className={css.formRow}>
            <div className={css.formField}>
              <label>Membership Status</label>
              <select
                value={formData.membershipStatus}
                onChange={e => handleInputChange('membershipStatus', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className={css.formRow}>
            <div className={css.formField}>
              <label>Membership Start Date</label>
              <input
                type="date"
                value={formData.membershipStartDate}
                onChange={e => handleInputChange('membershipStartDate', e.target.value)}
              />
            </div>
            <div className={css.formField}>
              <label>Membership End Date</label>
              <input
                type="date"
                value={formData.membershipEndDate}
                onChange={e => handleInputChange('membershipEndDate', e.target.value)}
              />
            </div>
          </div>

          <div className={css.formRow}>
            <div className={css.formField}>
              <label className={css.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.aiCoachingEnabled}
                  onChange={e => handleInputChange('aiCoachingEnabled', e.target.checked)}
                />
                <span>Enable AI Career Coaching for this institution</span>
              </label>
            </div>
          </div>

          {formData.aiCoachingEnabled && (
            <div className={css.formRow}>
              <div className={css.formField}>
                <label>AI Coaching Platform URL</label>
                <input
                  type="url"
                  value={formData.aiCoachingUrl}
                  onChange={e => handleInputChange('aiCoachingUrl', e.target.value)}
                  placeholder="https://coaching.example.com/harvard"
                />
                <span className={css.fieldHint}>The URL students will be directed to for AI coaching</span>
              </div>
            </div>
          )}

          <div className={css.formActions}>
            <button
              className={css.cancelButton}
              onClick={() => {
                setShowAddForm(false);
                setEditingInstitution(null);
              }}
            >
              Cancel
            </button>
            <button
              className={css.saveButton}
              onClick={handleSave}
              disabled={saveInProgress || !formData.domain || !formData.name}
            >
              {saveInProgress ? 'Saving...' : editingInstitution ? 'Update Institution' : 'Add Institution'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={css.loadingState}>Loading institutions...</div>
      ) : institutions.length === 0 ? (
        <div className={css.emptyState}>
          No institutions added yet. Add your first institution to allow students to sign up.
        </div>
      ) : (
        <table className={css.institutionsTable}>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Domain</th>
              <th>Status</th>
              <th>AI Coaching</th>
              <th>Valid Until</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {institutions.map(inst => (
              <tr key={inst.domain}>
                <td>
                  <span className={css.institutionName}>{inst.name}</span>
                </td>
                <td>
                  <span className={css.institutionDomain}>@{inst.domain}</span>
                </td>
                <td>
                  <span
                    className={classNames(css.statusBadge, {
                      [css.statusActive]: inst.membershipStatus === 'active',
                      [css.statusPending]: inst.membershipStatus === 'pending',
                      [css.statusInactive]: inst.membershipStatus === 'inactive',
                    })}
                  >
                    {inst.membershipStatus}
                  </span>
                </td>
                <td>
                  <button
                    className={classNames(css.toggleButton, {
                      [css.toggleOn]: inst.aiCoachingEnabled,
                      [css.toggleOff]: !inst.aiCoachingEnabled,
                    })}
                    onClick={() => handleToggleCoaching(inst)}
                    title={inst.aiCoachingEnabled ? 'Click to disable' : 'Click to enable'}
                  >
                    {inst.aiCoachingEnabled ? '✓ Enabled' : '✗ Disabled'}
                  </button>
                </td>
                <td>
                  {inst.membershipEndDate
                    ? new Date(inst.membershipEndDate).toLocaleDateString()
                    : 'No expiry'}
                </td>
                <td>
                  <div className={css.actionButtons}>
                    <button
                      className={classNames(css.actionButton, css.editButton)}
                      onClick={() => handleEdit(inst)}
                    >
                      Edit
                    </button>
                    <button
                      className={classNames(css.actionButton, css.deleteButton)}
                      onClick={() => handleDelete(inst.domain)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ================ Content Management Panel ================ //

const ContentManagementPanel = props => {
  const {
    content,
    fetchInProgress,
    updateInProgress,
    updateSuccess,
    onFetchContent,
    onUpdateContent,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onResetContent,
    onClearContentState,
  } = props;

  const [activeSection, setActiveSection] = useState('branding');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    if (!content) {
      onFetchContent();
    }
  }, [content, onFetchContent]);

  useEffect(() => {
    if (updateSuccess) {
      setSuccessMessage('Content updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        onClearContentState();
      }, 3000);
      onFetchContent(); // Refresh content
    }
  }, [updateSuccess, onClearContentState, onFetchContent]);

  const sections = [
    { key: 'branding', label: 'Logo & Branding', icon: '🎨' },
    { key: 'hero', label: 'Hero Section', icon: '🏠' },
    { key: 'features', label: 'Features', icon: '✨' },
    { key: 'howItWorks', label: 'How It Works', icon: '📋' },
    { key: 'videoTestimonial', label: 'Video Testimonial', icon: '🎬' },
    { key: 'testimonials', label: 'Written Testimonials', icon: '💬' },
    { key: 'cta', label: 'Call to Action', icon: '🎯' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // File upload handler
  const handleFileUpload = async (file, uploadType) => {
    if (!file) return;

    setUploadInProgress(true);
    setUploadError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      // Determine the upload endpoint based on type
      const endpoints = {
        logo: '/api/admin/upload/logo',
        favicon: '/api/admin/upload/favicon',
        heroImage: '/api/admin/upload/hero-image',
        heroVideo: '/api/admin/upload/hero-video',
      };

      const endpoint = endpoints[uploadType];
      if (!endpoint) {
        throw new Error('Invalid upload type');
      }

      // Use the API base URL for dev server
      const baseUrl = typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
        ? `http://localhost:${process.env.REACT_APP_DEV_API_SERVER_PORT || 3500}`
        : '';

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        body: formDataUpload,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update the form data with the uploaded file URL
      const fieldMap = {
        logo: 'logoUrl',
        favicon: 'faviconUrl',
        heroImage: 'backgroundImage',
        heroVideo: 'backgroundVideo',
      };

      const field = fieldMap[uploadType];
      handleInputChange(field, result.url);
      setSuccessMessage(`${uploadType.charAt(0).toUpperCase() + uploadType.slice(1)} uploaded successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload file');
    } finally {
      setUploadInProgress(false);
    }
  };

  const handleSaveSection = async () => {
    try {
      await onUpdateContent(activeSection, formData);
      setFormData({});
    } catch (e) {
      console.error('Failed to update content:', e);
    }
  };

  const handleAddItem = async () => {
    try {
      const newItem =
        activeSection === 'testimonials'
          ? { quote: 'New testimonial...', author: 'Name', role: 'Role', initials: 'NN' }
          : activeSection === 'features'
          ? { icon: '⭐', title: 'New Feature', description: 'Description here...' }
          : { number: '?', title: 'New Step', description: 'Description here...' };
      await onAddItem(activeSection, newItem);
    } catch (e) {
      console.error('Failed to add item:', e);
    }
  };

  const handleUpdateItem = async (itemId, data) => {
    try {
      await onUpdateItem(activeSection, itemId, data);
      setEditingItem(null);
    } catch (e) {
      console.error('Failed to update item:', e);
    }
  };

  const handleDeleteItem = async itemId => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await onDeleteItem(activeSection, itemId);
      } catch (e) {
        console.error('Failed to delete item:', e);
      }
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all content to defaults? This cannot be undone.')) {
      try {
        await onResetContent();
      } catch (e) {
        console.error('Failed to reset content:', e);
      }
    }
  };

  const renderSectionEditor = () => {
    const sectionData = content?.[activeSection];
    if (!sectionData) return <p>No content data available.</p>;

    switch (activeSection) {
      case 'branding':
        return (
          <div className={css.contentForm}>
            <h4 className={css.subSectionTitle}>Logo & Branding</h4>
            <p className={css.formHint}>
              Upload your company logo and set the site tagline. These appear across the entire site.
            </p>

            {uploadError && (
              <div className={css.uploadError}>
                {uploadError}
              </div>
            )}

            <div className={css.formGroup}>
              <label className={css.formLabel}>Logo</label>
              <div className={css.uploadSection}>
                <div className={css.fileUploadWrapper}>
                  <input
                    type="file"
                    id="logo-upload"
                    className={css.fileInput}
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'logo');
                    }}
                    disabled={uploadInProgress}
                  />
                  <label htmlFor="logo-upload" className={css.fileUploadButton}>
                    {uploadInProgress ? 'Uploading...' : '📁 Choose Logo File'}
                  </label>
                  <span className={css.uploadHint}>PNG, JPG, SVG, GIF, WebP (max 5MB)</span>
                </div>
                <div className={css.orDivider}>
                  <span>OR</span>
                </div>
                <input
                  type="url"
                  className={css.formInput}
                  placeholder="Enter logo URL"
                  defaultValue={sectionData?.logoUrl || ''}
                  onChange={e => handleInputChange('logoUrl', e.target.value)}
                />
              </div>
              {(formData.logoUrl || sectionData?.logoUrl) && (
                <div className={css.imagePreview}>
                  <img
                    src={formData.logoUrl || sectionData.logoUrl}
                    alt="Logo preview"
                    className={css.previewImage}
                  />
                </div>
              )}
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Site Tagline</label>
              <input
                type="text"
                className={css.formInput}
                placeholder="Your company tagline"
                defaultValue={sectionData?.tagline || ''}
                onChange={e => handleInputChange('tagline', e.target.value)}
              />
              <span className={css.formHint}>
                A short, memorable phrase that describes your platform (e.g., "Connecting Ivy League Talent with Industry Leaders")
              </span>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Favicon (optional)</label>
              <div className={css.uploadSection}>
                <div className={css.fileUploadWrapper}>
                  <input
                    type="file"
                    id="favicon-upload"
                    className={css.fileInput}
                    accept="image/x-icon,image/vnd.microsoft.icon,image/png"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'favicon');
                    }}
                    disabled={uploadInProgress}
                  />
                  <label htmlFor="favicon-upload" className={css.fileUploadButton}>
                    {uploadInProgress ? 'Uploading...' : '📁 Choose Favicon File'}
                  </label>
                  <span className={css.uploadHint}>ICO, PNG (max 1MB, 32x32 or 64x64)</span>
                </div>
                <div className={css.orDivider}>
                  <span>OR</span>
                </div>
                <input
                  type="url"
                  className={css.formInput}
                  placeholder="Enter favicon URL"
                  defaultValue={sectionData?.faviconUrl || ''}
                  onChange={e => handleInputChange('faviconUrl', e.target.value)}
                />
              </div>
            </div>

            <button
              className={css.saveButton}
              onClick={handleSaveSection}
              disabled={updateInProgress || uploadInProgress}
            >
              {updateInProgress ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        );

      case 'hero':
        return (
          <div className={css.contentForm}>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Title</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.title}
                onChange={e => handleInputChange('title', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Subtitle</label>
              <textarea
                className={css.formTextarea}
                rows={3}
                defaultValue={sectionData.subtitle}
                onChange={e => handleInputChange('subtitle', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Primary Button Text</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.primaryButtonText}
                onChange={e => handleInputChange('primaryButtonText', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Secondary Button Text</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.secondaryButtonText}
                onChange={e => handleInputChange('secondaryButtonText', e.target.value)}
              />
            </div>

            {/* Background Settings */}
            <h4 className={css.subSectionTitle}>Background Settings</h4>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Background Type</label>
              <select
                className={css.formSelect}
                defaultValue={sectionData.backgroundType || 'image'}
                onChange={e => handleInputChange('backgroundType', e.target.value)}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Background Image</label>
              <div className={css.uploadSection}>
                <div className={css.fileUploadWrapper}>
                  <input
                    type="file"
                    id="hero-image-upload"
                    className={css.fileInput}
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'heroImage');
                    }}
                    disabled={uploadInProgress}
                  />
                  <label htmlFor="hero-image-upload" className={css.fileUploadButton}>
                    {uploadInProgress ? 'Uploading...' : '📁 Choose Background Image'}
                  </label>
                  <span className={css.uploadHint}>PNG, JPG, GIF, WebP (max 5MB, recommended 1920x1080)</span>
                </div>
                <div className={css.orDivider}>
                  <span>OR</span>
                </div>
                <input
                  type="url"
                  className={css.formInput}
                  placeholder="Enter image URL"
                  defaultValue={sectionData.backgroundImage || ''}
                  onChange={e => handleInputChange('backgroundImage', e.target.value)}
                />
              </div>
              {(formData.backgroundImage || sectionData.backgroundImage) && (
                <div className={css.imagePreview}>
                  <img
                    src={formData.backgroundImage || sectionData.backgroundImage}
                    alt="Background preview"
                    className={css.previewImage}
                  />
                </div>
              )}
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Background Video (optional)</label>
              <div className={css.uploadSection}>
                <div className={css.fileUploadWrapper}>
                  <input
                    type="file"
                    id="hero-video-upload"
                    className={css.fileInput}
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'heroVideo');
                    }}
                    disabled={uploadInProgress}
                  />
                  <label htmlFor="hero-video-upload" className={css.fileUploadButton}>
                    {uploadInProgress ? 'Uploading...' : '🎬 Choose Background Video'}
                  </label>
                  <span className={css.uploadHint}>MP4, WebM, OGG (max 50MB)</span>
                </div>
                <div className={css.orDivider}>
                  <span>OR</span>
                </div>
                <input
                  type="url"
                  className={css.formInput}
                  placeholder="Enter video URL"
                  defaultValue={sectionData.backgroundVideo || ''}
                  onChange={e => handleInputChange('backgroundVideo', e.target.value)}
                />
              </div>
              <span className={css.formHint}>
                The video will autoplay muted in the background when selected as background type.
              </span>
            </div>

            <button
              className={css.saveButton}
              onClick={handleSaveSection}
              disabled={updateInProgress || uploadInProgress}
            >
              {updateInProgress ? 'Saving...' : 'Save Hero Section'}
            </button>
          </div>
        );

      case 'features':
      case 'howItWorks':
        return (
          <div className={css.contentForm}>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Section Title</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.sectionTitle}
                onChange={e => handleInputChange('sectionTitle', e.target.value)}
              />
            </div>
            <button
              className={css.saveButton}
              onClick={handleSaveSection}
              disabled={updateInProgress}
              style={{ marginBottom: '20px' }}
            >
              {updateInProgress ? 'Saving...' : 'Save Section Title'}
            </button>

            <h4 className={css.subSectionTitle}>
              {activeSection === 'features' ? 'Feature Cards' : 'Steps'}
            </h4>
            <div className={css.itemsList}>
              {sectionData.items?.map((item, idx) => (
                <div key={item.id} className={css.itemCard}>
                  {editingItem === item.id ? (
                    <div className={css.editItemForm}>
                      {activeSection === 'features' ? (
                        <>
                          <input
                            type="text"
                            className={css.formInput}
                            defaultValue={item.icon}
                            placeholder="Icon (emoji)"
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], icon: e.target.value },
                              }))
                            }
                          />
                          <input
                            type="text"
                            className={css.formInput}
                            defaultValue={item.title}
                            placeholder="Title"
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], title: e.target.value },
                              }))
                            }
                          />
                          <textarea
                            className={css.formTextarea}
                            defaultValue={item.description}
                            placeholder="Description"
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], description: e.target.value },
                              }))
                            }
                          />
                        </>
                      ) : (
                        <>
                          <input
                            type="text"
                            className={css.formInput}
                            defaultValue={item.number}
                            placeholder="Step Number"
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], number: e.target.value },
                              }))
                            }
                          />
                          <input
                            type="text"
                            className={css.formInput}
                            defaultValue={item.title}
                            placeholder="Title"
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], title: e.target.value },
                              }))
                            }
                          />
                          <textarea
                            className={css.formTextarea}
                            defaultValue={item.description}
                            placeholder="Description"
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], description: e.target.value },
                              }))
                            }
                          />
                        </>
                      )}
                      <div className={css.itemActions}>
                        <button
                          className={css.saveItemButton}
                          onClick={() => handleUpdateItem(item.id, formData[item.id])}
                        >
                          Save
                        </button>
                        <button
                          className={css.cancelButton}
                          onClick={() => setEditingItem(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={css.itemPreview}>
                        <span className={css.itemIcon}>
                          {activeSection === 'features' ? item.icon : item.number}
                        </span>
                        <div className={css.itemContent}>
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </div>
                      </div>
                      <div className={css.itemActions}>
                        <button
                          className={css.editButton}
                          onClick={() => setEditingItem(item.id)}
                        >
                          Edit
                        </button>
                        <button
                          className={css.deleteButton}
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button className={css.addButton} onClick={handleAddItem}>
              + Add {activeSection === 'features' ? 'Feature' : 'Step'}
            </button>
          </div>
        );

      case 'videoTestimonial':
        return (
          <div className={css.contentForm}>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Section Title</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.sectionTitle}
                onChange={e => handleInputChange('sectionTitle', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>YouTube Video URL</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.videoUrl}
                placeholder="https://www.youtube.com/embed/..."
                onChange={e => handleInputChange('videoUrl', e.target.value)}
              />
              <small className={css.formHint}>
                Use the embed URL format: https://www.youtube.com/embed/VIDEO_ID
              </small>
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Placeholder Text</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.videoPlaceholderText}
                onChange={e => handleInputChange('videoPlaceholderText', e.target.value)}
              />
            </div>
            {sectionData.videoUrl && (
              <div className={css.videoPreview}>
                <h5>Preview:</h5>
                <iframe
                  width="320"
                  height="180"
                  src={sectionData.videoUrl}
                  title="Video preview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
            <button
              className={css.saveButton}
              onClick={handleSaveSection}
              disabled={updateInProgress}
            >
              {updateInProgress ? 'Saving...' : 'Save Video Section'}
            </button>
          </div>
        );

      case 'testimonials':
        return (
          <div className={css.contentForm}>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Section Title</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.sectionTitle}
                onChange={e => handleInputChange('sectionTitle', e.target.value)}
              />
            </div>
            <button
              className={css.saveButton}
              onClick={handleSaveSection}
              disabled={updateInProgress}
              style={{ marginBottom: '20px' }}
            >
              {updateInProgress ? 'Saving...' : 'Save Section Title'}
            </button>

            <h4 className={css.subSectionTitle}>Testimonials</h4>
            <div className={css.itemsList}>
              {sectionData.items?.map(item => (
                <div key={item.id} className={css.testimonialCard}>
                  {editingItem === item.id ? (
                    <div className={css.editItemForm}>
                      <textarea
                        className={css.formTextarea}
                        rows={3}
                        defaultValue={item.quote}
                        placeholder="Quote"
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], quote: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="text"
                        className={css.formInput}
                        defaultValue={item.author}
                        placeholder="Author Name"
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], author: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="text"
                        className={css.formInput}
                        defaultValue={item.role}
                        placeholder="Role/Title"
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], role: e.target.value },
                          }))
                        }
                      />
                      <input
                        type="text"
                        className={css.formInput}
                        defaultValue={item.initials}
                        placeholder="Initials (2 letters)"
                        maxLength={2}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], initials: e.target.value.toUpperCase() },
                          }))
                        }
                      />
                      <div className={css.itemActions}>
                        <button
                          className={css.saveItemButton}
                          onClick={() => handleUpdateItem(item.id, formData[item.id])}
                        >
                          Save
                        </button>
                        <button
                          className={css.cancelButton}
                          onClick={() => setEditingItem(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={css.testimonialPreview}>
                        <div className={css.testimonialAvatar}>{item.initials}</div>
                        <div className={css.testimonialContent}>
                          <p className={css.testimonialQuote}>"{item.quote}"</p>
                          <p className={css.testimonialAuthor}>
                            <strong>{item.author}</strong> - {item.role}
                          </p>
                        </div>
                      </div>
                      <div className={css.itemActions}>
                        <button
                          className={css.editButton}
                          onClick={() => setEditingItem(item.id)}
                        >
                          Edit
                        </button>
                        <button
                          className={css.deleteButton}
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button className={css.addButton} onClick={handleAddItem}>
              + Add Testimonial
            </button>
          </div>
        );

      case 'cta':
        return (
          <div className={css.contentForm}>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Title</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.title}
                onChange={e => handleInputChange('title', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Description</label>
              <textarea
                className={css.formTextarea}
                rows={2}
                defaultValue={sectionData.description}
                onChange={e => handleInputChange('description', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Button Text</label>
              <input
                type="text"
                className={css.formInput}
                defaultValue={sectionData.buttonText}
                onChange={e => handleInputChange('buttonText', e.target.value)}
              />
            </div>
            <button
              className={css.saveButton}
              onClick={handleSaveSection}
              disabled={updateInProgress}
            >
              {updateInProgress ? 'Saving...' : 'Save CTA Section'}
            </button>
          </div>
        );

      default:
        return <p>Select a section to edit.</p>;
    }
  };

  if (fetchInProgress && !content) {
    return (
      <div className={css.panel}>
        <div className={css.loadingState}>Loading content...</div>
      </div>
    );
  }

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>Content Management</h2>
        <p className={css.panelDescription}>
          Edit the landing page content including text, images, videos, and testimonials.
        </p>
      </div>

      {successMessage && <div className={css.successMessage}>{successMessage}</div>}

      <div className={css.cmsLayout}>
        {/* Section Navigation */}
        <div className={css.cmsSidebar}>
          <h4 className={css.sidebarTitle}>Sections</h4>
          {sections.map(section => (
            <button
              key={section.key}
              className={classNames(css.sectionButton, {
                [css.sectionButtonActive]: activeSection === section.key,
              })}
              onClick={() => {
                setActiveSection(section.key);
                setEditingItem(null);
                setFormData({});
              }}
            >
              <span className={css.sectionIcon}>{section.icon}</span>
              {section.label}
            </button>
          ))}
          <hr className={css.sidebarDivider} />
          <button className={css.resetButton} onClick={handleReset}>
            Reset to Defaults
          </button>
        </div>

        {/* Content Editor */}
        <div className={css.cmsContent}>
          <h3 className={css.sectionEditorTitle}>
            {sections.find(s => s.key === activeSection)?.icon}{' '}
            {sections.find(s => s.key === activeSection)?.label}
          </h3>
          {renderSectionEditor()}
        </div>
      </div>
    </div>
  );
};

// ================ Main Component ================ //

const AdminDashboardPageComponent = props => {
  const {
    scrollingDisabled,
    currentUser,
    // Users
    users,
    usersPagination,
    fetchUsersInProgress,
    blockInProgress,
    deleteInProgress,
    // Create Admin
    createAdminInProgress,
    createAdminError,
    createAdminSuccess,
    // Messages
    messages,
    sendMessageInProgress,
    sendMessageError,
    sendMessageSuccess,
    // Reports
    reports,
    currentReportType,
    fetchReportsInProgress,
    // Deposits
    deposits,
    fetchDepositsInProgress,
    confirmDepositInProgress,
    revokeDepositInProgress,
    // Content Management
    content,
    fetchContentInProgress,
    updateContentInProgress,
    updateContentSuccess,
    // Actions
    onFetchUsers,
    onBlockUser,
    onUnblockUser,
    onDeleteUser,
    onCreateAdmin,
    onClearCreateAdminState,
    onFetchMessages,
    onSendMessage,
    onFetchReports,
    onClearMessageState,
    onFetchDeposits,
    onConfirmDeposit,
    onRevokeDeposit,
    onFetchContent,
    onUpdateContent,
    onAddItem,
    onUpdateItem,
    onDeleteItem,
    onResetContent,
    onClearContentState,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const params = useParams();
  const activeTab = params.tab || 'users';

  // Access check: only system-admin can access this page
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const isSystemAdmin = publicData?.userType === 'system-admin';

  // Get educational admins for messaging
  const educationalAdmins = users.filter(
    u => u.attributes?.profile?.publicData?.userType === 'educational-admin'
  );

  const [selectedEducator, setSelectedEducator] = useState(null);

  const handleTabChange = useCallback(
    tab => {
      history.push(`/admin/${tab}`);
    },
    [history]
  );

  const handleMessageEducator = user => {
    setSelectedEducator(user);
    handleTabChange('messages');
  };

  const title = intl.formatMessage({ id: 'AdminDashboardPage.title' });

  // Access control
  if (currentUser && !isSystemAdmin) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.noAccess}>
            <h1>
              <FormattedMessage id="AdminDashboardPage.noAccessTitle" />
            </h1>
            <p>
              <FormattedMessage id="AdminDashboardPage.noAccessMessage" />
            </p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          <h1 className={css.pageHeading}>
            <FormattedMessage id="AdminDashboardPage.heading" />
          </h1>
          <p className={css.pageSubtitle}>
            <FormattedMessage id="AdminDashboardPage.subtitle" />
          </p>

          {/* Tab Navigation */}
          <div className={css.tabNavigation}>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'users' })}
              onClick={() => handleTabChange('users')}
            >
              <FormattedMessage id="AdminDashboardPage.tabUsers" />
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'create-admin' })}
              onClick={() => handleTabChange('create-admin')}
            >
              <FormattedMessage id="AdminDashboardPage.tabCreateAdmin" />
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'deposits' })}
              onClick={() => handleTabChange('deposits')}
            >
              <FormattedMessage id="AdminDashboardPage.tabDeposits" />
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'messages' })}
              onClick={() => handleTabChange('messages')}
            >
              <FormattedMessage id="AdminDashboardPage.tabMessages" />
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'reports' })}
              onClick={() => handleTabChange('reports')}
            >
              <FormattedMessage id="AdminDashboardPage.tabReports" />
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'content' })}
              onClick={() => handleTabChange('content')}
            >
              <FormattedMessage id="AdminDashboardPage.tabContent" />
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'institutions' })}
              onClick={() => handleTabChange('institutions')}
            >
              <FormattedMessage id="AdminDashboardPage.tabInstitutions" />
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' && (
            <UserManagementPanel
              users={users}
              pagination={usersPagination}
              fetchInProgress={fetchUsersInProgress}
              blockInProgress={blockInProgress}
              deleteInProgress={deleteInProgress}
              onFetchUsers={onFetchUsers}
              onBlockUser={onBlockUser}
              onUnblockUser={onUnblockUser}
              onDeleteUser={onDeleteUser}
              onMessageEducator={handleMessageEducator}
            />
          )}

          {activeTab === 'create-admin' && (
            <CreateAdminPanel
              createInProgress={createAdminInProgress}
              createError={createAdminError}
              createSuccess={createAdminSuccess}
              onCreateAdmin={onCreateAdmin}
              onClearCreateAdminState={onClearCreateAdminState}
              onFetchUsers={onFetchUsers}
            />
          )}

          {activeTab === 'deposits' && (
            <DepositsPanel
              deposits={deposits}
              fetchInProgress={fetchDepositsInProgress}
              confirmInProgress={confirmDepositInProgress}
              revokeInProgress={revokeDepositInProgress}
              onFetchDeposits={onFetchDeposits}
              onConfirmDeposit={onConfirmDeposit}
              onRevokeDeposit={onRevokeDeposit}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesPanel
              messages={messages}
              sendInProgress={sendMessageInProgress}
              sendError={sendMessageError}
              sendSuccess={sendMessageSuccess}
              educationalAdmins={educationalAdmins}
              selectedEducator={selectedEducator}
              onSendMessage={onSendMessage}
              onClearMessageState={onClearMessageState}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsPanel
              reports={reports}
              fetchInProgress={fetchReportsInProgress}
              currentReportType={currentReportType}
              onFetchReports={onFetchReports}
            />
          )}

          {activeTab === 'content' && (
            <ContentManagementPanel
              content={content}
              fetchInProgress={fetchContentInProgress}
              updateInProgress={updateContentInProgress}
              updateSuccess={updateContentSuccess}
              onFetchContent={onFetchContent}
              onUpdateContent={onUpdateContent}
              onAddItem={onAddItem}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onResetContent={onResetContent}
              onClearContentState={onClearContentState}
            />
          )}

          {activeTab === 'institutions' && (
            <InstitutionManagementPanel />
          )}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    users,
    usersPagination,
    fetchUsersInProgress,
    blockInProgress,
    deleteInProgress,
    createAdminInProgress,
    createAdminError,
    createAdminSuccess,
    messages,
    sendMessageInProgress,
    sendMessageError,
    sendMessageSuccess,
    reports,
    currentReportType,
    fetchReportsInProgress,
    deposits,
    fetchDepositsInProgress,
    confirmDepositInProgress,
    revokeDepositInProgress,
    content,
    fetchContentInProgress,
    updateContentInProgress,
    updateContentSuccess,
  } = state.AdminDashboardPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    users,
    usersPagination,
    fetchUsersInProgress,
    blockInProgress,
    deleteInProgress,
    createAdminInProgress,
    createAdminError,
    createAdminSuccess,
    messages,
    sendMessageInProgress,
    sendMessageError,
    sendMessageSuccess,
    reports,
    currentReportType,
    fetchReportsInProgress,
    deposits,
    fetchDepositsInProgress,
    confirmDepositInProgress,
    revokeDepositInProgress,
    content,
    fetchContentInProgress,
    updateContentInProgress,
    updateContentSuccess,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchUsers: params => dispatch(fetchUsers(params)),
  onBlockUser: userId => dispatch(blockUserAction(userId)),
  onUnblockUser: userId => dispatch(unblockUserAction(userId)),
  onDeleteUser: userId => dispatch(deleteUserAction(userId)),
  onCreateAdmin: data => dispatch(createAdminUserAction(data)),
  onClearCreateAdminState: () => dispatch(clearCreateAdminState()),
  onFetchMessages: params => dispatch(fetchMessages(params)),
  onSendMessage: body => dispatch(sendMessage(body)),
  onFetchReports: type => dispatch(fetchReports(type)),
  onClearMessageState: () => dispatch(clearMessageState()),
  onFetchDeposits: params => dispatch(fetchDeposits(params)),
  onConfirmDeposit: (transactionId, data) => dispatch(confirmDepositAction(transactionId, data)),
  onRevokeDeposit: (transactionId, reason) => dispatch(revokeDepositAction(transactionId, reason)),
  onFetchContent: () => dispatch(fetchContent()),
  onUpdateContent: (section, data) => dispatch(updateContentAction(section, data)),
  onAddItem: (section, item) => dispatch(addContentItemAction(section, item)),
  onUpdateItem: (section, itemId, data) => dispatch(updateContentItemAction(section, itemId, data)),
  onDeleteItem: (section, itemId) => dispatch(deleteContentItemAction(section, itemId)),
  onResetContent: () => dispatch(resetContentAction()),
  onClearContentState: () => dispatch(clearContentState()),
});

const AdminDashboardPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AdminDashboardPageComponent);

export default AdminDashboardPage;
