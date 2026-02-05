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
});

const AdminDashboardPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AdminDashboardPageComponent);

export default AdminDashboardPage;
