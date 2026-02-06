import React, { useState, useEffect, useCallback } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory, useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import classNames from 'classnames';

import { Page, LayoutSingleColumn, PaginationLinks, NamedLink } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
import { exportAdminReport } from '../../util/api';

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
  fetchUserStatsAction,
  fetchApplications,
  approveApplicationAction,
  rejectApplicationAction,
  fetchEducationalAdmins,
  updateSubscriptionAction,
  clearSubscriptionState,
  // Corporate partner deposits
  fetchCorporateDeposits,
  fetchCorporatePartnerDepositsAction,
  clearWorkHoldAction,
  reinstateWorkHoldAction,
  clearAllHoldsForPartnerAction,
  clearSelectedPartner,
} from './AdminDashboardPage.duck';

import css from './AdminDashboardPage.module.css';

// ================ User Stats Cell ================ //

const UserStatsCell = ({ user, userStats, onFetchStats }) => {
  const [expanded, setExpanded] = useState(false);
  const publicData = user.attributes?.profile?.publicData || {};
  const userType = publicData.userType;

  const statsData = userStats?.[user.id];
  const stats = statsData?.stats;
  const isLoading = statsData?.isLoading;

  const handleToggle = () => {
    if (!expanded && !statsData && onFetchStats) {
      onFetchStats(user.id);
    }
    setExpanded(!expanded);
  };

  // Only show stats for students and corporate partners
  if (userType !== 'student' && userType !== 'corporate-partner') {
    return <span className={css.statsNA}>N/A</span>;
  }

  return (
    <div className={css.statsCell}>
      <button
        type="button"
        className={css.statsToggleBtn}
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        <span className={css.statsToggleText}>
          {expanded ? 'Hide Stats' : 'View Stats'}
        </span>
        <span className={`${css.statsToggleIcon} ${expanded ? css.expanded : ''}`}>▼</span>
      </button>

      {expanded && (
        <div className={css.statsDropdown}>
          {isLoading && <span className={css.statsLoading}>Loading...</span>}

          {!isLoading && stats && userType === 'student' && (
            <div className={css.statsItems}>
              <div className={css.statsItem}>
                <span className={css.statsValue}>{stats.completedProjects || 0}</span>
                <span className={css.statsLabel}>Completed</span>
              </div>
              <div className={css.statsItem}>
                <span className={css.statsValue}>{stats.activeProjects || 0}</span>
                <span className={css.statsLabel}>Active</span>
              </div>
              <div className={css.statsItem}>
                <span className={css.statsValue}>{stats.pendingProjects || 0}</span>
                <span className={css.statsLabel}>Pending</span>
              </div>
            </div>
          )}

          {!isLoading && stats && userType === 'corporate-partner' && (
            <div className={css.statsItems}>
              <div className={css.statsItem}>
                <span className={css.statsValue}>{stats.openProjects || 0}</span>
                <span className={css.statsLabel}>Open</span>
              </div>
              <div className={css.statsItem}>
                <span className={css.statsValue}>{stats.completedTransactions || 0}</span>
                <span className={css.statsLabel}>Completed</span>
              </div>
              <div className={css.statsItem}>
                <span className={css.statsValue}>{stats.activeTransactions || 0}</span>
                <span className={css.statsLabel}>Active</span>
              </div>
            </div>
          )}

          {!isLoading && !stats && (
            <span className={css.statsError}>Stats unavailable</span>
          )}
        </div>
      )}
    </div>
  );
};

// ================ User Management Panel ================ //

const UserManagementPanel = props => {
  const {
    users,
    pagination,
    fetchInProgress,
    blockInProgress,
    deleteInProgress,
    userStats,
    onFetchUsers,
    onBlockUser,
    onUnblockUser,
    onDeleteUser,
    onMessageEducator,
    onFetchUserStats,
  } = props;

  const [filters, setFilters] = useState({
    userType: '',
    status: '',
    search: '',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [confirmModal, setConfirmModal] = useState(null);

  // Sorting function for users
  const sortUsers = (usersToSort) => {
    if (!sortConfig.key) return usersToSort;

    return [...usersToSort].sort((a, b) => {
      let aValue, bValue;

      switch (sortConfig.key) {
        case 'name':
          aValue = a.attributes?.profile?.displayName?.toLowerCase() || '';
          bValue = b.attributes?.profile?.displayName?.toLowerCase() || '';
          break;
        case 'location':
          // For students: use state from publicData
          // For corporate: use company location/state
          const aPublic = a.attributes?.profile?.publicData || {};
          const bPublic = b.attributes?.profile?.publicData || {};
          aValue = (aPublic.state || aPublic.city || aPublic.location || '').toLowerCase();
          bValue = (bPublic.state || bPublic.city || bPublic.location || '').toLowerCase();
          break;
        case 'college':
          // For students: university, For corporate: companyName
          const aData = a.attributes?.profile?.publicData || {};
          const bData = b.attributes?.profile?.publicData || {};
          aValue = (aData.university || aData.companyName || aData.institutionName || '').toLowerCase();
          bValue = (bData.university || bData.companyName || bData.institutionName || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.attributes?.createdAt || 0).getTime();
          bValue = new Date(b.attributes?.createdAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const sortedUsers = sortUsers(users);

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
                <th
                  className={css.sortableHeader}
                  onClick={() => handleSort('name')}
                  title="Sort by name"
                >
                  <FormattedMessage id="AdminDashboardPage.tableUser" />
                  <span className={css.sortIndicator}>{getSortIndicator('name')}</span>
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableType" />
                </th>
                <th
                  className={css.sortableHeader}
                  onClick={() => handleSort('college')}
                  title="Sort by college/company"
                >
                  College/Company
                  <span className={css.sortIndicator}>{getSortIndicator('college')}</span>
                </th>
                <th
                  className={css.sortableHeader}
                  onClick={() => handleSort('location')}
                  title="Sort by location"
                >
                  Location
                  <span className={css.sortIndicator}>{getSortIndicator('location')}</span>
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableStats" />
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableStatus" />
                </th>
                <th
                  className={css.sortableHeader}
                  onClick={() => handleSort('createdAt')}
                  title="Sort by join date"
                >
                  <FormattedMessage id="AdminDashboardPage.tableJoined" />
                  <span className={css.sortIndicator}>{getSortIndicator('createdAt')}</span>
                </th>
                <th>
                  <FormattedMessage id="AdminDashboardPage.tableActions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map(user => {
                const publicData = user.attributes?.profile?.publicData || {};
                const userType = publicData.userType || 'unknown';
                const status = getUserStatus(user);
                const displayName = user.attributes?.profile?.displayName || 'Unknown User';
                const createdAt = user.attributes?.createdAt
                  ? new Date(user.attributes.createdAt).toLocaleDateString()
                  : 'N/A';

                // Get college/company name based on user type
                const collegeOrCompany = publicData.university || publicData.companyName || publicData.institutionName || '-';

                // Get location (state/city)
                const location = publicData.state || publicData.city || publicData.location || '-';

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
                          <NamedLink
                            className={css.userNameLink}
                            name="ProfilePage"
                            params={{ id: user.id }}
                          >
                            {displayName}
                            <span className={css.profileArrow}>→</span>
                          </NamedLink>
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
                    <td className={css.collegeCell}>{collegeOrCompany}</td>
                    <td className={css.locationCell}>{location}</td>
                    <td>
                      <UserStatsCell
                        user={user}
                        userStats={userStats}
                        onFetchStats={onFetchUserStats}
                      />
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
    students,
    onSendMessage,
    onClearMessageState,
  } = props;

  const [activeMessageTab, setActiveMessageTab] = useState('sent'); // 'inbox', 'sent', 'compose'
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [formData, setFormData] = useState({
    recipientId: '',
    subject: '',
    body: '',
  });

  // Recipient search and sort state
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientSort, setRecipientSort] = useState({ key: 'name', direction: 'asc' });
  const [recipientTypeFilter, setRecipientTypeFilter] = useState('all'); // 'all', 'students', 'admins'

  // Sort recipients function
  const sortRecipients = (recipients) => {
    return [...recipients].sort((a, b) => {
      let aValue, bValue;
      const aPublic = a.attributes?.profile?.publicData || {};
      const bPublic = b.attributes?.profile?.publicData || {};

      switch (recipientSort.key) {
        case 'name':
          aValue = a.attributes?.profile?.displayName?.toLowerCase() || '';
          bValue = b.attributes?.profile?.displayName?.toLowerCase() || '';
          break;
        case 'college':
          aValue = (aPublic.university || aPublic.institutionName || '').toLowerCase();
          bValue = (bPublic.university || bPublic.institutionName || '').toLowerCase();
          break;
        case 'location':
          aValue = (aPublic.state || aPublic.city || aPublic.location || '').toLowerCase();
          bValue = (bPublic.state || bPublic.city || bPublic.location || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return recipientSort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return recipientSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Filter and sort recipients
  const getFilteredRecipients = () => {
    let allRecipients = [];

    if (recipientTypeFilter === 'all' || recipientTypeFilter === 'admins') {
      allRecipients = [...allRecipients, ...educationalAdmins.map(a => ({ ...a, _type: 'admin' }))];
    }
    if (recipientTypeFilter === 'all' || recipientTypeFilter === 'students') {
      allRecipients = [...allRecipients, ...(students || []).map(s => ({ ...s, _type: 'student' }))];
    }

    // Apply search filter
    if (recipientSearch.trim()) {
      const searchLower = recipientSearch.toLowerCase();
      allRecipients = allRecipients.filter(r => {
        const name = r.attributes?.profile?.displayName?.toLowerCase() || '';
        const publicData = r.attributes?.profile?.publicData || {};
        const university = (publicData.university || '').toLowerCase();
        const institution = (publicData.institutionName || '').toLowerCase();
        const state = (publicData.state || '').toLowerCase();
        const city = (publicData.city || '').toLowerCase();

        return name.includes(searchLower) ||
               university.includes(searchLower) ||
               institution.includes(searchLower) ||
               state.includes(searchLower) ||
               city.includes(searchLower);
      });
    }

    // Apply sorting
    return sortRecipients(allRecipients);
  };

  const handleRecipientSort = (key) => {
    setRecipientSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getRecipientSortIndicator = (key) => {
    if (recipientSort.key !== key) return ' ↕';
    return recipientSort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const filteredRecipients = getFilteredRecipients();

  useEffect(() => {
    if (sendSuccess) {
      setFormData({ recipientId: '', subject: '', body: '' });
      setActiveMessageTab('sent');
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

  // For system admin: sent messages are what they sent
  const sentMessages = messages;
  const inboxMessages = []; // System admin typically receives messages through different channels

  const renderMessageList = (messageList, isSent = false) => {
    if (messageList.length === 0) {
      return (
        <div className={css.noMessages}>
          {isSent ? 'No sent messages yet.' : 'No messages in your inbox.'}
        </div>
      );
    }

    return (
      <div className={css.emailList}>
        <table className={css.emailTable}>
          <thead>
            <tr>
              <th className={css.emailTableHeader}>{isSent ? 'To' : 'From'}</th>
              <th className={css.emailTableHeader}>Subject</th>
              <th className={css.emailTableHeader}>Date</th>
            </tr>
          </thead>
          <tbody>
            {messageList.map(message => (
              <tr
                key={message.id}
                className={classNames(css.emailRow, { [css.emailRowUnread]: !message.read && !isSent })}
                onClick={() => setSelectedMessage(message)}
              >
                <td className={css.emailFrom}>
                  {isSent
                    ? (message.recipientName || message.recipientId)
                    : (message.senderName || 'System')
                  }
                </td>
                <td className={css.emailSubject}>{message.subject}</td>
                <td className={css.emailDate}>{formatDate(message.createdAt)}</td>
              </tr>
            ))}
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
            <h3 className={css.messageDetailSubject}>{selectedMessage.subject}</h3>
            <div className={css.messageDetailMeta}>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>From:</span>
                <span>{selectedMessage.senderName || 'System Admin'}</span>
              </div>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>To:</span>
                <span>{selectedMessage.recipientName || selectedMessage.recipientId}</span>
              </div>
              <div className={css.messageDetailMetaRow}>
                <span className={css.messageDetailLabel}>Date:</span>
                <span>{formatFullDate(selectedMessage.createdAt)}</span>
              </div>
            </div>
            <div className={css.messageDetailBody}>
              {selectedMessage.content || selectedMessage.body}
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
            className={classNames(css.messageTab, { [css.messageTabActive]: activeMessageTab === 'inbox' })}
            onClick={() => setActiveMessageTab('inbox')}
          >
            📥 Inbox
          </button>
          <button
            className={classNames(css.messageTab, { [css.messageTabActive]: activeMessageTab === 'sent' })}
            onClick={() => setActiveMessageTab('sent')}
          >
            📤 Sent
          </button>
          <button
            className={classNames(css.messageTab, css.messageTabCompose, { [css.messageTabActive]: activeMessageTab === 'compose' })}
            onClick={() => setActiveMessageTab('compose')}
          >
            ✏️ Compose
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeMessageTab === 'inbox' && (
        <div className={css.messagesListSection}>
          <h3 className={css.sectionTitle}>Inbox</h3>
          {renderMessageList(inboxMessages, false)}
        </div>
      )}

      {activeMessageTab === 'sent' && (
        <div className={css.messagesListSection}>
          <h3 className={css.sectionTitle}>Sent Messages</h3>
          {renderMessageList(sentMessages, true)}
        </div>
      )}

      {activeMessageTab === 'compose' && (
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

              {/* Recipient Search and Filter Controls */}
              <div className={css.recipientControls}>
                <input
                  type="text"
                  className={css.recipientSearch}
                  placeholder="Search by name, college, or location..."
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                />
                <select
                  className={css.recipientTypeFilter}
                  value={recipientTypeFilter}
                  onChange={e => setRecipientTypeFilter(e.target.value)}
                >
                  <option value="all">All Recipients</option>
                  <option value="students">Students Only</option>
                  <option value="admins">Edu Admins Only</option>
                </select>
              </div>

              {/* Sortable Recipient Table */}
              <div className={css.recipientTableContainer}>
                <table className={css.recipientTable}>
                  <thead>
                    <tr>
                      <th className={css.recipientTableSelect}></th>
                      <th
                        className={css.recipientTableSortable}
                        onClick={() => handleRecipientSort('name')}
                      >
                        Name{getRecipientSortIndicator('name')}
                      </th>
                      <th>Type</th>
                      <th
                        className={css.recipientTableSortable}
                        onClick={() => handleRecipientSort('college')}
                      >
                        College/Institution{getRecipientSortIndicator('college')}
                      </th>
                      <th
                        className={css.recipientTableSortable}
                        onClick={() => handleRecipientSort('location')}
                      >
                        Location{getRecipientSortIndicator('location')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecipients.length === 0 ? (
                      <tr>
                        <td colSpan="5" className={css.noRecipientsMessage}>
                          No recipients found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredRecipients.map(recipient => {
                        const publicData = recipient.attributes?.profile?.publicData || {};
                        const displayName = recipient.attributes?.profile?.displayName || 'Unknown';
                        const college = publicData.university || publicData.institutionName || '-';
                        const location = publicData.state || publicData.city || publicData.location || '-';
                        const isSelected = formData.recipientId === recipient.id;
                        const typeLabel = recipient._type === 'student' ? 'Student' : 'Edu Admin';

                        return (
                          <tr
                            key={recipient.id}
                            className={classNames(css.recipientRow, { [css.recipientRowSelected]: isSelected })}
                            onClick={() => setFormData(prev => ({ ...prev, recipientId: recipient.id }))}
                          >
                            <td className={css.recipientTableSelect}>
                              <input
                                type="radio"
                                name="recipient"
                                checked={isSelected}
                                onChange={() => setFormData(prev => ({ ...prev, recipientId: recipient.id }))}
                              />
                            </td>
                            <td className={css.recipientName}>{displayName}</td>
                            <td>
                              <span className={classNames(css.recipientTypeBadge, {
                                [css.recipientTypeStudent]: recipient._type === 'student',
                                [css.recipientTypeAdmin]: recipient._type === 'admin'
                              })}>
                                {typeLabel}
                              </span>
                            </td>
                            <td>{college}</td>
                            <td>{location}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {formData.recipientId && (
                <div className={css.selectedRecipient}>
                  Selected: <strong>{filteredRecipients.find(r => r.id === formData.recipientId)?.attributes?.profile?.displayName || 'Unknown'}</strong>
                </div>
              )}
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
      )}

      {/* Message Detail Modal */}
      {selectedMessage && renderMessageDetail()}
    </div>
  );
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
      <p className={css.statValue}>{value}</p>
      <p className={css.statLabel}>{label}</p>
      {isClickable && <span className={css.statClickHint}>Click to view details</span>}
    </div>
  );
};

// ================ Reports Panel ================ //

const ReportsPanel = props => {
  const { reports, fetchInProgress, currentReportType, onFetchReports, users } = props;

  const [statDetailModal, setStatDetailModal] = useState(null);

  const reportTypes = [
    { key: 'overview', label: 'Platform Overview' },
    { key: 'users', label: 'Users Report' },
    { key: 'institutions', label: 'Institutions' },
    { key: 'transactions', label: 'Transactions' },
  ];

  // Helper to get users by type
  const getUsersByType = (userType) => {
    if (!users) return [];
    return users.filter(u => u.attributes?.profile?.publicData?.userType === userType);
  };

  // Render user item in modal - clickable to view profile
  const renderUserItem = (user) => {
    const displayName = user.attributes?.profile?.displayName || 'Unknown User';
    const email = user.attributes?.email || '';
    const userType = user.attributes?.profile?.publicData?.userType || 'unknown';
    const userId = user.id?.uuid || user.id;

    return (
      <NamedLink
        name="ProfilePage"
        params={{ id: userId }}
        className={css.statDetailLink}
      >
        <div className={css.statDetailUserInfo}>
          <span className={css.statDetailUserName}>{displayName}</span>
          <span className={css.statDetailUserEmail}>{email}</span>
        </div>
        <div className={css.statDetailUserRight}>
          <span className={classNames(css.statDetailUserType, css[userType])}>
            {userType.replace('-', ' ')}
          </span>
          <span className={css.viewProfileArrow}>→</span>
        </div>
      </NamedLink>
    );
  };

  // Handle stat click
  const handleStatClick = (modalType) => {
    let modalData = null;

    switch (modalType) {
      case 'totalUsers':
        modalData = { title: 'All Users', items: users || [], renderItem: renderUserItem };
        break;
      case 'students':
        modalData = { title: 'Students', items: getUsersByType('student'), renderItem: renderUserItem };
        break;
      case 'corporatePartners':
        modalData = { title: 'Corporate Partners', items: getUsersByType('corporate-partner'), renderItem: renderUserItem };
        break;
      case 'educationalAdmins':
        modalData = { title: 'Educational Admins', items: getUsersByType('educational-admin'), renderItem: renderUserItem };
        break;
      case 'activeUsers':
        modalData = {
          title: 'Active Users',
          items: (users || []).filter(u => !u.attributes?.banned && !u.attributes?.deleted),
          renderItem: renderUserItem
        };
        break;
      case 'bannedUsers':
        modalData = {
          title: 'Banned Users',
          items: (users || []).filter(u => u.attributes?.banned),
          renderItem: renderUserItem
        };
        break;
      default:
        break;
    }

    setStatDetailModal(modalData);
  };

  const renderOverviewReport = () => {
    if (!reports) return null;

    const { userCounts, transactionStats, growth, platformHealth } = reports;

    return (
      <>
        <div className={css.statsGrid}>
          <ClickableStatCard
            value={userCounts?.total || 0}
            label="Total Users"
            onClick={() => handleStatClick('totalUsers')}
            hasData={users?.length > 0}
          />
          <ClickableStatCard
            value={userCounts?.students || 0}
            label="Students"
            onClick={() => handleStatClick('students')}
            hasData={users?.length > 0}
          />
          <ClickableStatCard
            value={userCounts?.corporatePartners || 0}
            label="Corporate Partners"
            onClick={() => handleStatClick('corporatePartners')}
            hasData={users?.length > 0}
          />
          <ClickableStatCard
            value={userCounts?.educationalAdmins || 0}
            label="Educational Admins"
            onClick={() => handleStatClick('educationalAdmins')}
            hasData={users?.length > 0}
          />
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
          <ClickableStatCard
            value={summary?.totalUsers || 0}
            label="Total Users"
            onClick={() => handleStatClick('totalUsers')}
            hasData={users?.length > 0}
          />
          <ClickableStatCard
            value={summary?.totalActive || 0}
            label="Active Users"
            onClick={() => handleStatClick('activeUsers')}
            hasData={users?.length > 0}
          />
          <ClickableStatCard
            value={summary?.totalBanned || 0}
            label="Banned Users"
            onClick={() => handleStatClick('bannedUsers')}
            hasData={users?.length > 0}
          />
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

  const handleExport = async format => {
    const reportType = currentReportType || 'overview';
    try {
      await exportAdminReport(reportType, format);
    } catch (error) {
      console.error('Export failed:', error);
      // Could show a toast notification here
    }
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

      {/* Stat Detail Modal */}
      {statDetailModal && (
        <StatDetailModal
          title={statDetailModal.title}
          items={statDetailModal.items}
          onClose={() => setStatDetailModal(null)}
          renderItem={statDetailModal.renderItem}
        />
      )}
    </div>
  );
};

// ================ Deposits Panel ================ //

// ================ Unified Deposits Panel ================ //

const UnifiedDepositsPanel = props => {
  const {
    // Corporate partner deposits (work hold management)
    corporatePartners,
    fetchCorporateInProgress,
    selectedPartner,
    selectedPartnerDeposits,
    fetchPartnerInProgress,
    clearHoldInProgress,
    reinstateHoldInProgress,
    clearAllHoldsInProgress,
    onFetchCorporateDeposits,
    onFetchPartnerDeposits,
    onClearWorkHold,
    onReinstateWorkHold,
    onClearAllHolds,
    onClearSelectedPartner,
    // Payment confirmations
    deposits,
    fetchDepositsInProgress,
    confirmInProgress,
    revokeInProgress,
    onFetchDeposits,
    onConfirmDeposit,
    onRevokeDeposit,
  } = props;

  const [activeSubTab, setActiveSubTab] = useState('work-holds');

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>
          <FormattedMessage id="AdminDashboardPage.depositsTitle" />
        </h2>
      </div>

      {/* Sub-tabs for switching between work holds and payment confirmations */}
      <div className={css.depositSubTabs}>
        <button
          className={classNames(css.depositSubTab, {
            [css.depositSubTabActive]: activeSubTab === 'work-holds',
          })}
          onClick={() => setActiveSubTab('work-holds')}
        >
          <span className={css.depositSubTabIcon}>🔒</span>
          Work Hold Management
        </button>
        <button
          className={classNames(css.depositSubTab, {
            [css.depositSubTabActive]: activeSubTab === 'payment-confirmations',
          })}
          onClick={() => setActiveSubTab('payment-confirmations')}
        >
          <span className={css.depositSubTabIcon}>💳</span>
          Payment Confirmations
        </button>
      </div>

      {/* Work Hold Management Sub-panel */}
      {activeSubTab === 'work-holds' && (
        <WorkHoldsSubPanel
          corporatePartners={corporatePartners}
          fetchInProgress={fetchCorporateInProgress}
          selectedPartner={selectedPartner}
          selectedPartnerDeposits={selectedPartnerDeposits}
          fetchPartnerInProgress={fetchPartnerInProgress}
          clearHoldInProgress={clearHoldInProgress}
          reinstateHoldInProgress={reinstateHoldInProgress}
          clearAllHoldsInProgress={clearAllHoldsInProgress}
          onFetchCorporateDeposits={onFetchCorporateDeposits}
          onFetchPartnerDeposits={onFetchPartnerDeposits}
          onClearWorkHold={onClearWorkHold}
          onReinstateWorkHold={onReinstateWorkHold}
          onClearAllHolds={onClearAllHolds}
          onClearSelectedPartner={onClearSelectedPartner}
        />
      )}

      {/* Payment Confirmations Sub-panel */}
      {activeSubTab === 'payment-confirmations' && (
        <PaymentConfirmationsSubPanel
          deposits={deposits}
          fetchInProgress={fetchDepositsInProgress}
          confirmInProgress={confirmInProgress}
          revokeInProgress={revokeInProgress}
          onFetchDeposits={onFetchDeposits}
          onConfirmDeposit={onConfirmDeposit}
          onRevokeDeposit={onRevokeDeposit}
        />
      )}
    </div>
  );
};

// ================ Work Holds Sub-Panel ================ //

const WorkHoldsSubPanel = props => {
  const {
    corporatePartners,
    fetchInProgress,
    selectedPartner,
    selectedPartnerDeposits,
    fetchPartnerInProgress,
    clearHoldInProgress,
    reinstateHoldInProgress,
    clearAllHoldsInProgress,
    onFetchCorporateDeposits,
    onFetchPartnerDeposits,
    onClearWorkHold,
    onReinstateWorkHold,
    onClearAllHolds,
    onClearSelectedPartner,
  } = props;

  const [clearHoldModal, setClearHoldModal] = useState(null);
  const [clearHoldNotes, setClearHoldNotes] = useState('');
  const [reinstateModal, setReinstateModal] = useState(null);
  const [reinstateReason, setReinstateReason] = useState('');
  const [clearAllModal, setClearAllModal] = useState(null);
  const [clearAllNotes, setClearAllNotes] = useState('');

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewPartner = async partnerId => {
    try {
      await onFetchPartnerDeposits(partnerId);
    } catch (e) {
      console.error('Failed to fetch partner deposits:', e);
    }
  };

  const handleClearWorkHold = async () => {
    if (!clearHoldModal) return;
    try {
      await onClearWorkHold(clearHoldModal.id, clearHoldNotes);
      setClearHoldModal(null);
      setClearHoldNotes('');
    } catch (e) {
      console.error('Clear work hold failed:', e);
    }
  };

  const handleReinstateWorkHold = async () => {
    if (!reinstateModal) return;
    try {
      await onReinstateWorkHold(reinstateModal.id, reinstateReason);
      setReinstateModal(null);
      setReinstateReason('');
    } catch (e) {
      console.error('Reinstate work hold failed:', e);
    }
  };

  const handleClearAllHolds = async () => {
    if (!clearAllModal) return;
    try {
      await onClearAllHolds(clearAllModal.id, clearAllNotes);
      setClearAllModal(null);
      setClearAllNotes('');
    } catch (e) {
      console.error('Clear all holds failed:', e);
    }
  };

  // If viewing a specific partner's deposits
  if (selectedPartner) {
    const pendingHolds = selectedPartnerDeposits.filter(tx => !tx.workHoldCleared);

    return (
      <div className={css.subPanelContent}>
        <div className={css.subPanelHeader}>
          <div className={css.panelHeaderLeft}>
            <button className={css.backButton} onClick={onClearSelectedPartner}>
              ← Back to Partners
            </button>
            <h3 className={css.subPanelTitle}>
              {selectedPartner.displayName || selectedPartner.companyName || 'Unknown Partner'}
            </h3>
          </div>
          {pendingHolds.length > 0 && (
            <button
              className={classNames(css.actionButton, css.confirmButton)}
              onClick={() => setClearAllModal(selectedPartner)}
              disabled={clearAllHoldsInProgress}
            >
              Clear All Holds ({pendingHolds.length})
            </button>
          )}
        </div>

        <div className={css.partnerStatsRow}>
          <div className={css.miniStatCard}>
            <span className={css.miniStatValue}>{selectedPartnerDeposits.length}</span>
            <span className={css.miniStatLabel}>Total Hired</span>
          </div>
          <div className={css.miniStatCard}>
            <span className={classNames(css.miniStatValue, css.warningValue)}>
              {pendingHolds.length}
            </span>
            <span className={css.miniStatLabel}>Pending Holds</span>
          </div>
          <div className={css.miniStatCard}>
            <span className={classNames(css.miniStatValue, css.successValue)}>
              {selectedPartnerDeposits.filter(tx => tx.workHoldCleared).length}
            </span>
            <span className={css.miniStatLabel}>Cleared</span>
          </div>
        </div>

        {fetchPartnerInProgress ? (
          <div className={css.loadingState}>
            <FormattedMessage id="AdminDashboardPage.loading" />
          </div>
        ) : selectedPartnerDeposits.length === 0 ? (
          <div className={css.emptyState}>No transactions found for this partner.</div>
        ) : (
          <table className={css.depositsTable}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Student</th>
                <th>Hired Date</th>
                <th>Work Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedPartnerDeposits.map(tx => {
                const isWorkHoldCleared = tx.workHoldCleared;

                return (
                  <tr key={tx.id}>
                    <td>
                      <div className={css.depositProject}>
                        <span className={css.depositProjectTitle}>
                          {tx.listingTitle || 'Unknown Project'}
                        </span>
                        <span className={css.depositProjectId}>ID: {tx.id.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td>
                      <div className={css.userCell}>
                        <div className={css.userInfo}>
                          <span className={css.userName}>{tx.studentName || 'Unknown'}</span>
                          <span className={css.userEmail}>{tx.studentEmail || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(tx.hiredAt)}</td>
                    <td>
                      <span
                        className={classNames(css.depositStatusBadge, {
                          [css.depositPending]: !isWorkHoldCleared,
                          [css.depositConfirmed]: isWorkHoldCleared,
                        })}
                      >
                        {isWorkHoldCleared ? 'Can Work' : 'On Hold'}
                      </span>
                    </td>
                    <td>
                      <div className={css.actionButtons}>
                        {!isWorkHoldCleared ? (
                          <button
                            className={classNames(css.actionButton, css.confirmButton)}
                            onClick={() => setClearHoldModal(tx)}
                            disabled={clearHoldInProgress === tx.id}
                          >
                            Clear Hold
                          </button>
                        ) : (
                          <button
                            className={classNames(css.actionButton, css.revokeButton)}
                            onClick={() => setReinstateModal(tx)}
                            disabled={reinstateHoldInProgress === tx.id}
                          >
                            Reinstate Hold
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

        {/* Clear Work Hold Modal */}
        {clearHoldModal && (
          <div className={css.modalOverlay} onClick={() => setClearHoldModal(null)}>
            <div className={css.modal} onClick={e => e.stopPropagation()}>
              <h3 className={css.modalTitle}>Clear Work Hold</h3>
              <p className={css.modalMessage}>
                Allow <strong>{clearHoldModal.studentName}</strong> to proceed with work on{' '}
                <strong>{clearHoldModal.listingTitle}</strong>?
              </p>
              <p className={css.modalWarning}>
                This will allow the student to access the project workspace and begin working.
              </p>

              <div className={css.formField}>
                <label>Notes (Optional)</label>
                <textarea
                  value={clearHoldNotes}
                  onChange={e => setClearHoldNotes(e.target.value)}
                  placeholder="e.g., Deposit received via wire transfer..."
                />
              </div>

              <div className={css.modalActions}>
                <button className={css.modalCancel} onClick={() => setClearHoldModal(null)}>
                  Cancel
                </button>
                <button
                  className={classNames(css.modalConfirm, css.modalConfirmGreen)}
                  onClick={handleClearWorkHold}
                  disabled={clearHoldInProgress}
                >
                  Clear Hold
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reinstate Work Hold Modal */}
        {reinstateModal && (
          <div className={css.modalOverlay} onClick={() => setReinstateModal(null)}>
            <div className={css.modal} onClick={e => e.stopPropagation()}>
              <h3 className={css.modalTitle}>Reinstate Work Hold</h3>
              <p className={css.modalMessage}>
                Block <strong>{reinstateModal.studentName}</strong> from continuing work on{' '}
                <strong>{reinstateModal.listingTitle}</strong>?
              </p>
              <p className={css.modalWarning}>
                Warning: This will prevent the student from accessing the project workspace.
              </p>

              <div className={css.formField}>
                <label>Reason</label>
                <textarea
                  value={reinstateReason}
                  onChange={e => setReinstateReason(e.target.value)}
                  placeholder="Reason for reinstating the hold..."
                  required
                />
              </div>

              <div className={css.modalActions}>
                <button className={css.modalCancel} onClick={() => setReinstateModal(null)}>
                  Cancel
                </button>
                <button
                  className={css.modalConfirm}
                  onClick={handleReinstateWorkHold}
                  disabled={reinstateHoldInProgress || !reinstateReason.trim()}
                >
                  Reinstate Hold
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Holds Modal */}
        {clearAllModal && (
          <div className={css.modalOverlay} onClick={() => setClearAllModal(null)}>
            <div className={css.modal} onClick={e => e.stopPropagation()}>
              <h3 className={css.modalTitle}>Clear All Work Holds</h3>
              <p className={css.modalMessage}>
                Clear all work holds for{' '}
                <strong>{clearAllModal.displayName || clearAllModal.companyName}</strong>?
              </p>
              <p className={css.modalWarning}>
                This will allow all {pendingHolds.length} hired students to proceed with their work.
              </p>

              <div className={css.formField}>
                <label>Notes (Optional)</label>
                <textarea
                  value={clearAllNotes}
                  onChange={e => setClearAllNotes(e.target.value)}
                  placeholder="e.g., Bulk payment received..."
                />
              </div>

              <div className={css.modalActions}>
                <button className={css.modalCancel} onClick={() => setClearAllModal(null)}>
                  Cancel
                </button>
                <button
                  className={classNames(css.modalConfirm, css.modalConfirmGreen)}
                  onClick={handleClearAllHolds}
                  disabled={clearAllHoldsInProgress}
                >
                  Clear All Holds
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main view - list of corporate partners
  return (
    <div className={css.subPanelContent}>
      <div className={css.subPanelHeader}>
        <p className={css.subPanelDescription}>
          Track deposits by corporate partner and control when students can begin working on
          projects. Students cannot access project workspaces until the work hold is cleared.
        </p>
        <button
          className={css.refreshButton}
          onClick={() => onFetchCorporateDeposits({})}
          disabled={fetchInProgress}
        >
          <FormattedMessage id="AdminDashboardPage.refreshDeposits" />
        </button>
      </div>

      {fetchInProgress ? (
        <div className={css.loadingState}>
          <FormattedMessage id="AdminDashboardPage.loading" />
        </div>
      ) : corporatePartners.length === 0 ? (
        <div className={css.emptyState}>No corporate partners with hired students found.</div>
      ) : (
        <table className={css.depositsTable}>
          <thead>
            <tr>
              <th>Corporate Partner</th>
              <th>Total Hired</th>
              <th>Pending Holds</th>
              <th>Cleared</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {corporatePartners.map(partner => {
              const hasPendingHolds = partner.pendingHolds > 0;

              return (
                <tr key={partner.id}>
                  <td>
                    <div className={css.userCell}>
                      <div className={css.userInfo}>
                        <span className={css.userName}>{partner.displayName || 'Unknown'}</span>
                        <span className={css.userEmail}>
                          {partner.companyName || partner.email || ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{partner.totalHired || 0}</td>
                  <td>
                    <span
                      className={classNames(css.depositStatusBadge, {
                        [css.depositPending]: hasPendingHolds,
                        [css.depositConfirmed]: !hasPendingHolds,
                      })}
                    >
                      {partner.pendingHolds || 0}
                    </span>
                  </td>
                  <td>{partner.depositsConfirmed || 0}</td>
                  <td>
                    <div className={css.actionButtons}>
                      <button
                        className={classNames(css.actionButton, css.viewButton)}
                        onClick={() => handleViewPartner(partner.id)}
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ================ Payment Confirmations Sub-Panel ================ //

const PaymentConfirmationsSubPanel = props => {
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
    <div className={css.subPanelContent}>
      <div className={css.subPanelHeader}>
        <p className={css.subPanelDescription}>
          <FormattedMessage id="AdminDashboardPage.depositsDescription" />
        </p>
        <button
          className={css.refreshButton}
          onClick={() => onFetchDeposits({})}
          disabled={fetchInProgress}
        >
          <FormattedMessage id="AdminDashboardPage.refreshDeposits" />
        </button>
      </div>

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
                onChange={e =>
                  setConfirmData(prev => ({ ...prev, paymentMethod: e.target.value }))
                }
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

// ================ Legacy Deposits Panel (kept for backwards compatibility) ================ //

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

// ================ Corporate Partner Deposits Panel ================ //

const CorporateDepositsPanel = props => {
  const {
    corporatePartners,
    fetchInProgress,
    selectedPartner,
    selectedPartnerDeposits,
    fetchPartnerInProgress,
    clearHoldInProgress,
    reinstateHoldInProgress,
    clearAllHoldsInProgress,
    onFetchCorporateDeposits,
    onFetchPartnerDeposits,
    onClearWorkHold,
    onReinstateWorkHold,
    onClearAllHolds,
    onClearSelectedPartner,
  } = props;

  const [clearHoldModal, setClearHoldModal] = useState(null);
  const [clearHoldNotes, setClearHoldNotes] = useState('');
  const [reinstateModal, setReinstateModal] = useState(null);
  const [reinstateReason, setReinstateReason] = useState('');
  const [clearAllModal, setClearAllModal] = useState(null);
  const [clearAllNotes, setClearAllNotes] = useState('');

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleViewPartner = async (partnerId) => {
    try {
      await onFetchPartnerDeposits(partnerId);
    } catch (e) {
      console.error('Failed to fetch partner deposits:', e);
    }
  };

  const handleClearWorkHold = async () => {
    if (!clearHoldModal) return;
    try {
      await onClearWorkHold(clearHoldModal.id, clearHoldNotes);
      setClearHoldModal(null);
      setClearHoldNotes('');
    } catch (e) {
      console.error('Clear work hold failed:', e);
    }
  };

  const handleReinstateWorkHold = async () => {
    if (!reinstateModal) return;
    try {
      await onReinstateWorkHold(reinstateModal.id, reinstateReason);
      setReinstateModal(null);
      setReinstateReason('');
    } catch (e) {
      console.error('Reinstate work hold failed:', e);
    }
  };

  const handleClearAllHolds = async () => {
    if (!clearAllModal) return;
    try {
      await onClearAllHolds(clearAllModal.id, clearAllNotes);
      setClearAllModal(null);
      setClearAllNotes('');
    } catch (e) {
      console.error('Clear all holds failed:', e);
    }
  };

  // If viewing a specific partner's deposits
  if (selectedPartner) {
    const pendingHolds = selectedPartnerDeposits.filter(tx => !tx.workHoldCleared);

    return (
      <div className={css.panel}>
        <div className={css.panelHeader}>
          <div className={css.panelHeaderLeft}>
            <button
              className={css.backButton}
              onClick={onClearSelectedPartner}
            >
              ← Back to Partners
            </button>
            <h2 className={css.panelTitle}>
              {selectedPartner.displayName || selectedPartner.companyName || 'Unknown Partner'}
            </h2>
          </div>
          {pendingHolds.length > 0 && (
            <button
              className={classNames(css.actionButton, css.confirmButton)}
              onClick={() => setClearAllModal(selectedPartner)}
              disabled={clearAllHoldsInProgress}
            >
              Clear All Holds ({pendingHolds.length})
            </button>
          )}
        </div>

        <div className={css.partnerStatsRow}>
          <div className={css.statCard}>
            <span className={css.statValue}>{selectedPartnerDeposits.length}</span>
            <span className={css.statLabel}>Total Hired</span>
          </div>
          <div className={css.statCard}>
            <span className={classNames(css.statValue, css.warningValue)}>{pendingHolds.length}</span>
            <span className={css.statLabel}>Pending Holds</span>
          </div>
          <div className={css.statCard}>
            <span className={classNames(css.statValue, css.successValue)}>
              {selectedPartnerDeposits.filter(tx => tx.workHoldCleared).length}
            </span>
            <span className={css.statLabel}>Cleared</span>
          </div>
        </div>

        {fetchPartnerInProgress ? (
          <div className={css.loadingState}>
            <FormattedMessage id="AdminDashboardPage.loading" />
          </div>
        ) : selectedPartnerDeposits.length === 0 ? (
          <div className={css.emptyState}>
            No transactions found for this partner.
          </div>
        ) : (
          <table className={css.depositsTable}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Student</th>
                <th>Hired Date</th>
                <th>Deposit Status</th>
                <th>Work Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedPartnerDeposits.map(tx => {
                const isDepositConfirmed = tx.depositConfirmed;
                const isWorkHoldCleared = tx.workHoldCleared;

                return (
                  <tr key={tx.id}>
                    <td>
                      <div className={css.depositProject}>
                        <span className={css.depositProjectTitle}>
                          {tx.listingTitle || 'Unknown Project'}
                        </span>
                        <span className={css.depositProjectId}>
                          ID: {tx.id.substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={css.userCell}>
                        <div className={css.userInfo}>
                          <span className={css.userName}>
                            {tx.studentName || 'Unknown'}
                          </span>
                          <span className={css.userEmail}>{tx.studentEmail || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(tx.hiredAt)}</td>
                    <td>
                      <span
                        className={classNames(css.depositStatusBadge, {
                          [css.depositPending]: !isDepositConfirmed,
                          [css.depositConfirmed]: isDepositConfirmed,
                        })}
                      >
                        {isDepositConfirmed ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={classNames(css.depositStatusBadge, {
                          [css.depositPending]: !isWorkHoldCleared,
                          [css.depositConfirmed]: isWorkHoldCleared,
                        })}
                      >
                        {isWorkHoldCleared ? 'Can Work' : 'On Hold'}
                      </span>
                    </td>
                    <td>
                      <div className={css.actionButtons}>
                        {!isWorkHoldCleared ? (
                          <button
                            className={classNames(css.actionButton, css.confirmButton)}
                            onClick={() => setClearHoldModal(tx)}
                            disabled={clearHoldInProgress === tx.id}
                          >
                            Clear Hold
                          </button>
                        ) : (
                          <button
                            className={classNames(css.actionButton, css.revokeButton)}
                            onClick={() => setReinstateModal(tx)}
                            disabled={reinstateHoldInProgress === tx.id}
                          >
                            Reinstate Hold
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

        {/* Clear Work Hold Modal */}
        {clearHoldModal && (
          <div className={css.modalOverlay} onClick={() => setClearHoldModal(null)}>
            <div className={css.modal} onClick={e => e.stopPropagation()}>
              <h3 className={css.modalTitle}>Clear Work Hold</h3>
              <p className={css.modalMessage}>
                Allow <strong>{clearHoldModal.studentName}</strong> to proceed with work on{' '}
                <strong>{clearHoldModal.listingTitle}</strong>?
              </p>
              <p className={css.modalWarning}>
                This will allow the student to access the project workspace and begin working.
              </p>

              <div className={css.formField}>
                <label>Notes (Optional)</label>
                <textarea
                  value={clearHoldNotes}
                  onChange={e => setClearHoldNotes(e.target.value)}
                  placeholder="e.g., Deposit received via wire transfer..."
                />
              </div>

              <div className={css.modalActions}>
                <button className={css.modalCancel} onClick={() => setClearHoldModal(null)}>
                  Cancel
                </button>
                <button
                  className={classNames(css.modalConfirm, css.modalConfirmGreen)}
                  onClick={handleClearWorkHold}
                  disabled={clearHoldInProgress}
                >
                  Clear Hold
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reinstate Work Hold Modal */}
        {reinstateModal && (
          <div className={css.modalOverlay} onClick={() => setReinstateModal(null)}>
            <div className={css.modal} onClick={e => e.stopPropagation()}>
              <h3 className={css.modalTitle}>Reinstate Work Hold</h3>
              <p className={css.modalMessage}>
                Block <strong>{reinstateModal.studentName}</strong> from continuing work on{' '}
                <strong>{reinstateModal.listingTitle}</strong>?
              </p>
              <p className={css.modalWarning}>
                Warning: This will prevent the student from accessing the project workspace.
              </p>

              <div className={css.formField}>
                <label>Reason</label>
                <textarea
                  value={reinstateReason}
                  onChange={e => setReinstateReason(e.target.value)}
                  placeholder="Reason for reinstating the hold..."
                  required
                />
              </div>

              <div className={css.modalActions}>
                <button className={css.modalCancel} onClick={() => setReinstateModal(null)}>
                  Cancel
                </button>
                <button
                  className={css.modalConfirm}
                  onClick={handleReinstateWorkHold}
                  disabled={reinstateHoldInProgress || !reinstateReason.trim()}
                >
                  Reinstate Hold
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clear All Holds Modal */}
        {clearAllModal && (
          <div className={css.modalOverlay} onClick={() => setClearAllModal(null)}>
            <div className={css.modal} onClick={e => e.stopPropagation()}>
              <h3 className={css.modalTitle}>Clear All Work Holds</h3>
              <p className={css.modalMessage}>
                Clear all work holds for <strong>{clearAllModal.displayName || clearAllModal.companyName}</strong>?
              </p>
              <p className={css.modalWarning}>
                This will allow all {pendingHolds.length} hired students to proceed with their work.
              </p>

              <div className={css.formField}>
                <label>Notes (Optional)</label>
                <textarea
                  value={clearAllNotes}
                  onChange={e => setClearAllNotes(e.target.value)}
                  placeholder="e.g., Bulk payment received..."
                />
              </div>

              <div className={css.modalActions}>
                <button className={css.modalCancel} onClick={() => setClearAllModal(null)}>
                  Cancel
                </button>
                <button
                  className={classNames(css.modalConfirm, css.modalConfirmGreen)}
                  onClick={handleClearAllHolds}
                  disabled={clearAllHoldsInProgress}
                >
                  Clear All Holds
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main view - list of corporate partners
  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>
          Corporate Partner Deposits
        </h2>
        <button
          className={css.refreshButton}
          onClick={() => onFetchCorporateDeposits({})}
          disabled={fetchInProgress}
        >
          <FormattedMessage id="AdminDashboardPage.refreshDeposits" />
        </button>
      </div>

      <p className={css.depositsDescription}>
        Track deposits by corporate partner and control when students can begin working on projects.
        Students cannot access project workspaces until the work hold is cleared.
      </p>

      {fetchInProgress ? (
        <div className={css.loadingState}>
          <FormattedMessage id="AdminDashboardPage.loading" />
        </div>
      ) : corporatePartners.length === 0 ? (
        <div className={css.emptyState}>
          No corporate partners with hired students found.
        </div>
      ) : (
        <table className={css.depositsTable}>
          <thead>
            <tr>
              <th>Corporate Partner</th>
              <th>Total Hired</th>
              <th>Pending Holds</th>
              <th>Deposits Confirmed</th>
              <th>Projects Completed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {corporatePartners.map(partner => {
              const hasPendingHolds = partner.pendingHolds > 0;

              return (
                <tr key={partner.id}>
                  <td>
                    <div className={css.userCell}>
                      <div className={css.userInfo}>
                        <span className={css.userName}>
                          {partner.displayName || 'Unknown'}
                        </span>
                        <span className={css.userEmail}>
                          {partner.companyName || partner.email || ''}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>{partner.totalHired || 0}</td>
                  <td>
                    <span
                      className={classNames(css.depositStatusBadge, {
                        [css.depositPending]: hasPendingHolds,
                        [css.depositConfirmed]: !hasPendingHolds,
                      })}
                    >
                      {partner.pendingHolds || 0}
                    </span>
                  </td>
                  <td>{partner.depositsConfirmed || 0}</td>
                  <td>{partner.projectsCompleted || 0}</td>
                  <td>
                    <div className={css.actionButtons}>
                      <button
                        className={classNames(css.actionButton, css.viewButton)}
                        onClick={() => handleViewPartner(partner.id)}
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ================ Promote to Admin Panel ================ //

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
    userType: 'educational-admin',
    institutionName: '',
    adminRole: '',
  });

  useEffect(() => {
    if (createSuccess) {
      // Reset form on success
      setFormData({
        email: '',
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
    const { email, userType, institutionName, adminRole } = formData;

    if (!email) {
      return;
    }

    if (userType === 'educational-admin' && !institutionName) {
      return;
    }

    try {
      await onCreateAdmin({
        email,
        userType,
        institutionName: userType === 'educational-admin' ? institutionName : undefined,
        adminRole: userType === 'educational-admin' && adminRole ? adminRole : undefined,
      });
    } catch (err) {
      console.error('Promote to admin failed:', err);
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
          Promote User to Admin
        </h2>
      </div>

      <p className={css.panelDescription}>
        Promote an existing user to an administrator role. The user must have already signed up on the platform.
      </p>

      {createSuccess && (
        <div className={css.successMessage}>
          User has been promoted to administrator successfully!
        </div>
      )}

      {createError && (
        <div className={css.errorMessage}>
          {createError.message || 'Failed to promote user. Please try again.'}
        </div>
      )}

      <form className={css.createAdminForm} onSubmit={handleSubmit}>
        <div className={css.formRow}>
          <div className={css.formField}>
            <label>Admin Type</label>
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
            <label>User Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              placeholder="Enter the email of an existing user"
              required
            />
            <span className={css.fieldHint}>
              The user must have already signed up on the platform.
            </span>
          </div>
        </div>

        {formData.userType === 'educational-admin' && (
          <>
            <div className={css.formRow}>
              <div className={css.formField}>
                <label>Institution Name</label>
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
                <label>Admin Role</label>
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
            {createInProgress ? 'Promoting...' : 'Promote to Admin'}
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

// ================ Educational Admin Applications Panel ================ //

// ================ Unified Institution Management Panel ================ //

const UnifiedInstitutionManagementPanel = props => {
  const {
    applications,
    applicationStats,
    educationalAdmins,
    fetchApplicationsInProgress,
    fetchEducationalAdminsInProgress,
    approveInProgress,
    rejectInProgress,
    updateSubscriptionInProgress,
    updateSubscriptionSuccess,
    onFetchApplications,
    onApproveApplication,
    onRejectApplication,
    onFetchEducationalAdmins,
    onUpdateSubscription,
    onClearSubscriptionState,
  } = props;

  const [activeSection, setActiveSection] = useState('applications'); // 'applications' | 'admins' | 'domains'

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>
          <FormattedMessage id="AdminDashboardPage.institutionManagementTitle" />
        </h2>
      </div>

      {/* Section Sub-tabs */}
      <div className={css.depositSubTabs}>
        <button
          className={classNames(css.depositSubTab, {
            [css.depositSubTabActive]: activeSection === 'applications',
          })}
          onClick={() => setActiveSection('applications')}
        >
          <span className={css.depositSubTabIcon}>📋</span>
          Applications
          {applicationStats?.pending > 0 && (
            <span className={css.badgeCount}>{applicationStats.pending}</span>
          )}
        </button>
        <button
          className={classNames(css.depositSubTab, {
            [css.depositSubTabActive]: activeSection === 'admins',
          })}
          onClick={() => {
            setActiveSection('admins');
            onFetchEducationalAdmins({});
          }}
        >
          <span className={css.depositSubTabIcon}>🎓</span>
          Educational Admins
        </button>
        <button
          className={classNames(css.depositSubTab, {
            [css.depositSubTabActive]: activeSection === 'domains',
          })}
          onClick={() => setActiveSection('domains')}
        >
          <span className={css.depositSubTabIcon}>🏛️</span>
          Institution Domains
        </button>
      </div>

      {/* Sub-panel Content */}
      {activeSection === 'applications' && (
        <ApplicationsSubPanel
          applications={applications}
          applicationStats={applicationStats}
          fetchApplicationsInProgress={fetchApplicationsInProgress}
          approveInProgress={approveInProgress}
          rejectInProgress={rejectInProgress}
          onFetchApplications={onFetchApplications}
          onApproveApplication={onApproveApplication}
          onRejectApplication={onRejectApplication}
        />
      )}

      {activeSection === 'admins' && (
        <EducationalAdminsSubPanel
          educationalAdmins={educationalAdmins}
          fetchEducationalAdminsInProgress={fetchEducationalAdminsInProgress}
          updateSubscriptionInProgress={updateSubscriptionInProgress}
          updateSubscriptionSuccess={updateSubscriptionSuccess}
          onUpdateSubscription={onUpdateSubscription}
          onClearSubscriptionState={onClearSubscriptionState}
        />
      )}

      {activeSection === 'domains' && <InstitutionDomainsSubPanel />}
    </div>
  );
};

// ================ Applications Sub-Panel ================ //

const ApplicationsSubPanel = props => {
  const {
    applications,
    applicationStats,
    fetchApplicationsInProgress,
    approveInProgress,
    rejectInProgress,
    onFetchApplications,
    onApproveApplication,
    onRejectApplication,
  } = props;

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('pending');

  const handleApprove = async applicationId => {
    try {
      await onApproveApplication(applicationId);
      onFetchApplications({ status: applicationFilter === 'all' ? '' : applicationFilter });
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await onRejectApplication(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      onFetchApplications({ status: applicationFilter === 'all' ? '' : applicationFilter });
    } catch (e) {
      console.error('Reject failed:', e);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getDepartmentLabel = department => {
    const labels = {
      'career-services': 'Career Services',
      'student-affairs': 'Student Affairs',
      'academic-affairs': 'Academic Affairs',
      'experiential-learning': 'Experiential Learning',
      'internship-office': 'Internship Office',
      'alumni-relations': 'Alumni Relations',
      other: 'Other',
    };
    return labels[department] || department;
  };

  return (
    <div className={css.subPanelContent}>
      {/* Stats Overview */}
      {applicationStats && (
        <div className={css.statsGrid}>
          <div className={css.miniStatCard}>
            <span className={css.miniStatValue}>{applicationStats.pending || 0}</span>
            <span className={css.miniStatLabel}>Pending Review</span>
          </div>
          <div className={css.miniStatCard}>
            <span className={css.miniStatValue}>{applicationStats.approved || 0}</span>
            <span className={css.miniStatLabel}>Approved</span>
          </div>
          <div className={css.miniStatCard}>
            <span className={css.miniStatValue}>{applicationStats.rejected || 0}</span>
            <span className={css.miniStatLabel}>Rejected</span>
          </div>
          <div className={css.miniStatCard}>
            <span className={css.miniStatValue}>{applicationStats.total || 0}</span>
            <span className={css.miniStatLabel}>Total</span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className={css.filterBar}>
        <div className={css.filterItem}>
          <label className={css.filterLabel}>Filter by Status</label>
          <select
            className={css.filterSelect}
            value={applicationFilter}
            onChange={e => {
              setApplicationFilter(e.target.value);
              onFetchApplications({ status: e.target.value === 'all' ? '' : e.target.value });
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      {fetchApplicationsInProgress ? (
        <div className={css.loadingState}>Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className={css.emptyState}>
          No {applicationFilter !== 'all' ? applicationFilter : ''} applications found.
        </div>
      ) : (
        <table className={css.usersTable}>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Institution</th>
              <th>Department</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id}>
                <td>
                  <div className={css.userCell}>
                    <div className={css.userInfo}>
                      <span className={css.userName}>
                        {app.firstName} {app.lastName}
                      </span>
                      <span className={css.userEmail}>{app.email}</span>
                      <span className={css.userEmail}>{app.jobTitle}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div>
                    <span className={css.institutionName}>{app.institutionName}</span>
                    <br />
                    <span className={css.institutionDomain}>@{app.emailDomain}</span>
                  </div>
                </td>
                <td>{getDepartmentLabel(app.department)}</td>
                <td>{formatDate(app.submittedAt)}</td>
                <td>
                  <span
                    className={classNames(css.statusBadge, {
                      [css.statusPending]: app.status === 'pending',
                      [css.statusActive]: app.status === 'approved',
                      [css.statusBanned]: app.status === 'rejected',
                    })}
                  >
                    {app.status}
                  </span>
                </td>
                <td>
                  {app.status === 'pending' && (
                    <div className={css.actionButtons}>
                      <button
                        className={classNames(css.actionButton, css.approveButton)}
                        onClick={() => handleApprove(app.id)}
                        disabled={approveInProgress === app.id}
                      >
                        {approveInProgress === app.id ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        className={classNames(css.actionButton, css.rejectButton)}
                        onClick={() => setRejectModal(app)}
                        disabled={rejectInProgress === app.id}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className={css.modalOverlay} onClick={() => setRejectModal(null)}>
          <div className={css.modal} onClick={e => e.stopPropagation()}>
            <h3 className={css.modalTitle}>Reject Application</h3>
            <p className={css.modalMessage}>
              Are you sure you want to reject the application from{' '}
              <strong>
                {rejectModal.firstName} {rejectModal.lastName}
              </strong>{' '}
              ({rejectModal.institutionName})?
            </p>
            <div className={css.formField}>
              <label>Reason for Rejection (optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejecting this application..."
                rows={3}
              />
            </div>
            <div className={css.modalActions}>
              <button className={css.modalCancel} onClick={() => setRejectModal(null)}>
                Cancel
              </button>
              <button
                className={css.modalConfirm}
                onClick={handleReject}
                disabled={rejectInProgress === rejectModal.id}
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ Educational Admins Sub-Panel ================ //

const EducationalAdminsSubPanel = props => {
  const {
    educationalAdmins,
    fetchEducationalAdminsInProgress,
    updateSubscriptionInProgress,
    updateSubscriptionSuccess,
    onUpdateSubscription,
    onClearSubscriptionState,
  } = props;

  useEffect(() => {
    if (updateSubscriptionSuccess) {
      const timer = setTimeout(() => onClearSubscriptionState(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSubscriptionSuccess, onClearSubscriptionState]);

  const handleUpdateSubscription = async (userId, field, value) => {
    try {
      await onUpdateSubscription(userId, { [field]: value });
    } catch (e) {
      console.error('Update subscription failed:', e);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={css.subPanelContent}>
      <p className={css.subPanelDescription}>
        Manage subscription status for educational administrators. Toggle deposit and AI coaching
        access for each institution.
      </p>

      {updateSubscriptionSuccess && (
        <div className={css.successMessage}>Subscription status updated successfully!</div>
      )}

      {fetchEducationalAdminsInProgress ? (
        <div className={css.loadingState}>Loading educational administrators...</div>
      ) : educationalAdmins.length === 0 ? (
        <div className={css.emptyState}>
          No educational administrators found. Approve applications to create educational admins.
        </div>
      ) : (
        <table className={css.usersTable}>
          <thead>
            <tr>
              <th>Administrator</th>
              <th>Institution</th>
              <th>Deposit Paid</th>
              <th>AI Coaching</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {educationalAdmins.map(admin => {
              const publicData = admin.attributes?.profile?.publicData || {};
              return (
                <tr key={admin.id}>
                  <td>
                    <div className={css.userCell}>
                      <div className={css.userInfo}>
                        <span className={css.userName}>
                          {admin.attributes?.profile?.displayName || 'Unknown'}
                        </span>
                        <span className={css.userEmail}>{admin.attributes?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className={css.institutionName}>
                        {publicData.institutionName || 'N/A'}
                      </span>
                      <br />
                      <span className={css.institutionDomain}>
                        @{publicData.institutionDomain || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      className={classNames(css.toggleButton, {
                        [css.toggleOn]: publicData.depositPaid,
                        [css.toggleOff]: !publicData.depositPaid,
                      })}
                      onClick={() =>
                        handleUpdateSubscription(admin.id, 'depositPaid', !publicData.depositPaid)
                      }
                      disabled={updateSubscriptionInProgress === admin.id}
                    >
                      {publicData.depositPaid ? '✓ Paid' : '✗ Not Paid'}
                    </button>
                    {publicData.depositPaidDate && (
                      <span className={css.dateInfo}>{formatDate(publicData.depositPaidDate)}</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={classNames(css.toggleButton, {
                        [css.toggleOn]: publicData.aiCoachingApproved,
                        [css.toggleOff]: !publicData.aiCoachingApproved,
                      })}
                      onClick={() =>
                        handleUpdateSubscription(
                          admin.id,
                          'aiCoachingApproved',
                          !publicData.aiCoachingApproved
                        )
                      }
                      disabled={updateSubscriptionInProgress === admin.id}
                    >
                      {publicData.aiCoachingApproved ? '✓ Approved' : '✗ Not Approved'}
                    </button>
                    {publicData.aiCoachingApprovedDate && (
                      <span className={css.dateInfo}>
                        {formatDate(publicData.aiCoachingApprovedDate)}
                      </span>
                    )}
                  </td>
                  <td>{formatDate(admin.attributes?.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ================ Institution Domains Sub-Panel ================ //

const InstitutionDomainsSubPanel = () => {
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

  const handleEdit = institution => {
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

  const handleDelete = async domain => {
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

  const handleToggleCoaching = async institution => {
    try {
      const response = await fetch(
        `/api/admin/institutions/${encodeURIComponent(institution.domain)}/coaching`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            aiCoachingEnabled: !institution.aiCoachingEnabled,
          }),
        }
      );
      if (response.ok) {
        fetchInstitutions();
      }
    } catch (error) {
      setErrorMessage('Failed to update coaching status');
    }
  };

  return (
    <div className={css.subPanelContent}>
      <div className={css.subPanelHeader}>
        <p className={css.subPanelDescription}>
          Manage educational institution email domains and AI coaching access. Only students from
          member institutions can sign up.
        </p>
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
              <span className={css.fieldHint}>
                The email domain students use (e.g., harvard.edu)
              </span>
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
                <span className={css.fieldHint}>
                  The URL students will be directed to for AI coaching
                </span>
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
              {saveInProgress
                ? 'Saving...'
                : editingInstitution
                ? 'Update Institution'
                : 'Add Institution'}
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

// ================ Legacy Educational Admin Applications Panel (kept for backwards compatibility) ================ //

const EducationalAdminApplicationsPanel = props => {
  const {
    applications,
    applicationStats,
    educationalAdmins,
    fetchApplicationsInProgress,
    fetchEducationalAdminsInProgress,
    approveInProgress,
    rejectInProgress,
    updateSubscriptionInProgress,
    updateSubscriptionSuccess,
    onFetchApplications,
    onApproveApplication,
    onRejectApplication,
    onFetchEducationalAdmins,
    onUpdateSubscription,
    onClearSubscriptionState,
  } = props;

  const [activeSection, setActiveSection] = useState('applications'); // 'applications' | 'admins'
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'

  useEffect(() => {
    if (updateSubscriptionSuccess) {
      const timer = setTimeout(() => onClearSubscriptionState(), 3000);
      return () => clearTimeout(timer);
    }
  }, [updateSubscriptionSuccess, onClearSubscriptionState]);

  const handleApprove = async applicationId => {
    try {
      await onApproveApplication(applicationId);
      onFetchApplications({ status: applicationFilter === 'all' ? '' : applicationFilter });
    } catch (e) {
      console.error('Approve failed:', e);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await onRejectApplication(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      onFetchApplications({ status: applicationFilter === 'all' ? '' : applicationFilter });
    } catch (e) {
      console.error('Reject failed:', e);
    }
  };

  const handleUpdateSubscription = async (userId, field, value) => {
    try {
      await onUpdateSubscription(userId, { [field]: value });
    } catch (e) {
      console.error('Update subscription failed:', e);
    }
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getDepartmentLabel = department => {
    const labels = {
      'career-services': 'Career Services',
      'student-affairs': 'Student Affairs',
      'academic-affairs': 'Academic Affairs',
      'experiential-learning': 'Experiential Learning',
      'internship-office': 'Internship Office',
      'alumni-relations': 'Alumni Relations',
      'other': 'Other',
    };
    return labels[department] || department;
  };

  const renderApplicationsSection = () => (
    <div className={css.applicationsSection}>
      {/* Stats Overview */}
      {applicationStats && (
        <div className={css.statsGrid}>
          <div className={css.statCard}>
            <p className={css.statValue}>{applicationStats.pending || 0}</p>
            <p className={css.statLabel}>Pending Review</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{applicationStats.approved || 0}</p>
            <p className={css.statLabel}>Approved</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{applicationStats.rejected || 0}</p>
            <p className={css.statLabel}>Rejected</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{applicationStats.total || 0}</p>
            <p className={css.statLabel}>Total Applications</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className={css.filterBar}>
        <div className={css.filterItem}>
          <label className={css.filterLabel}>Filter by Status</label>
          <select
            className={css.filterSelect}
            value={applicationFilter}
            onChange={e => {
              setApplicationFilter(e.target.value);
              onFetchApplications({ status: e.target.value === 'all' ? '' : e.target.value });
            }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      {fetchApplicationsInProgress ? (
        <div className={css.loadingState}>Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className={css.emptyState}>
          No {applicationFilter !== 'all' ? applicationFilter : ''} applications found.
        </div>
      ) : (
        <table className={css.usersTable}>
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Institution</th>
              <th>Department</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id}>
                <td>
                  <div className={css.userCell}>
                    <div className={css.userInfo}>
                      <span className={css.userName}>{app.firstName} {app.lastName}</span>
                      <span className={css.userEmail}>{app.email}</span>
                      <span className={css.userEmail}>{app.jobTitle}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div>
                    <span className={css.institutionName}>{app.institutionName}</span>
                    <br />
                    <span className={css.institutionDomain}>@{app.emailDomain}</span>
                  </div>
                </td>
                <td>{getDepartmentLabel(app.department)}</td>
                <td>{formatDate(app.submittedAt)}</td>
                <td>
                  <span
                    className={classNames(css.statusBadge, {
                      [css.statusPending]: app.status === 'pending',
                      [css.statusActive]: app.status === 'approved',
                      [css.statusBanned]: app.status === 'rejected',
                    })}
                  >
                    {app.status}
                  </span>
                </td>
                <td>
                  {app.status === 'pending' && (
                    <div className={css.actionButtons}>
                      <button
                        className={classNames(css.actionButton, css.approveButton)}
                        onClick={() => handleApprove(app.id)}
                        disabled={approveInProgress === app.id}
                      >
                        {approveInProgress === app.id ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        className={classNames(css.actionButton, css.rejectButton)}
                        onClick={() => setRejectModal(app)}
                        disabled={rejectInProgress === app.id}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderAdminsSection = () => (
    <div className={css.adminsSection}>
      <p className={css.panelDescription}>
        Manage subscription status for educational administrators. Toggle deposit and AI coaching access for each institution.
      </p>

      {updateSubscriptionSuccess && (
        <div className={css.successMessage}>Subscription status updated successfully!</div>
      )}

      {fetchEducationalAdminsInProgress ? (
        <div className={css.loadingState}>Loading educational administrators...</div>
      ) : educationalAdmins.length === 0 ? (
        <div className={css.emptyState}>
          No educational administrators found. Approve applications to create educational admins.
        </div>
      ) : (
        <table className={css.usersTable}>
          <thead>
            <tr>
              <th>Administrator</th>
              <th>Institution</th>
              <th>Deposit Paid</th>
              <th>AI Coaching</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {educationalAdmins.map(admin => {
              const publicData = admin.attributes?.profile?.publicData || {};
              return (
                <tr key={admin.id}>
                  <td>
                    <div className={css.userCell}>
                      <div className={css.userInfo}>
                        <span className={css.userName}>
                          {admin.attributes?.profile?.displayName || 'Unknown'}
                        </span>
                        <span className={css.userEmail}>{admin.attributes?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span className={css.institutionName}>{publicData.institutionName || 'N/A'}</span>
                      <br />
                      <span className={css.institutionDomain}>
                        @{publicData.institutionDomain || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      className={classNames(css.toggleButton, {
                        [css.toggleOn]: publicData.depositPaid,
                        [css.toggleOff]: !publicData.depositPaid,
                      })}
                      onClick={() => handleUpdateSubscription(admin.id, 'depositPaid', !publicData.depositPaid)}
                      disabled={updateSubscriptionInProgress === admin.id}
                    >
                      {publicData.depositPaid ? '✓ Paid' : '✗ Not Paid'}
                    </button>
                    {publicData.depositPaidDate && (
                      <span className={css.dateInfo}>{formatDate(publicData.depositPaidDate)}</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={classNames(css.toggleButton, {
                        [css.toggleOn]: publicData.aiCoachingApproved,
                        [css.toggleOff]: !publicData.aiCoachingApproved,
                      })}
                      onClick={() => handleUpdateSubscription(admin.id, 'aiCoachingApproved', !publicData.aiCoachingApproved)}
                      disabled={updateSubscriptionInProgress === admin.id}
                    >
                      {publicData.aiCoachingApproved ? '✓ Approved' : '✗ Not Approved'}
                    </button>
                    {publicData.aiCoachingApprovedDate && (
                      <span className={css.dateInfo}>{formatDate(publicData.aiCoachingApprovedDate)}</span>
                    )}
                  </td>
                  <td>{formatDate(admin.attributes?.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>Educational Institution Management</h2>
      </div>

      {/* Section Tabs */}
      <div className={css.sectionTabs}>
        <button
          className={classNames(css.sectionTab, { [css.sectionTabActive]: activeSection === 'applications' })}
          onClick={() => setActiveSection('applications')}
        >
          📋 Applications
          {applicationStats?.pending > 0 && (
            <span className={css.badgeCount}>{applicationStats.pending}</span>
          )}
        </button>
        <button
          className={classNames(css.sectionTab, { [css.sectionTabActive]: activeSection === 'admins' })}
          onClick={() => {
            setActiveSection('admins');
            onFetchEducationalAdmins({});
          }}
        >
          🎓 Educational Admins
        </button>
      </div>

      {activeSection === 'applications' && renderApplicationsSection()}
      {activeSection === 'admins' && renderAdminsSection()}

      {/* Reject Modal */}
      {rejectModal && (
        <div className={css.modalOverlay} onClick={() => setRejectModal(null)}>
          <div className={css.modal} onClick={e => e.stopPropagation()}>
            <h3 className={css.modalTitle}>Reject Application</h3>
            <p className={css.modalMessage}>
              Are you sure you want to reject the application from{' '}
              <strong>{rejectModal.firstName} {rejectModal.lastName}</strong> ({rejectModal.institutionName})?
            </p>
            <div className={css.formField}>
              <label>Reason for Rejection (optional)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejecting this application..."
                rows={3}
              />
            </div>
            <div className={css.modalActions}>
              <button className={css.modalCancel} onClick={() => setRejectModal(null)}>
                Cancel
              </button>
              <button
                className={css.modalConfirm}
                onClick={handleReject}
                disabled={rejectInProgress === rejectModal.id}
              >
                {rejectInProgress === rejectModal.id ? 'Rejecting...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
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

  // Clear form data when changing sections
  useEffect(() => {
    setFormData({});
  }, [activeSection]);

  useEffect(() => {
    if (updateSuccess) {
      setSuccessMessage('Content updated successfully!');

      // Clear formData immediately - the content is already updated in Redux state
      // from the fulfilled reducer before updateSuccess becomes true
      setFormData({});

      setTimeout(() => {
        setSuccessMessage('');
        onClearContentState();
      }, 3000);
      onFetchContent(); // Refresh content to get the latest from server
    }
  }, [updateSuccess, onClearContentState, onFetchContent, content, activeSection]);

  const sections = [
    { key: 'branding', label: 'Logo & Branding', icon: '🎨' },
    { key: 'hero', label: 'Hero Section', icon: '🏠' },
    { key: 'features', label: 'Features', icon: '✨' },
    { key: 'howItWorks', label: 'How It Works', icon: '📋' },
    { key: 'videoTestimonial', label: 'Video Testimonial', icon: '🎬' },
    { key: 'testimonials', label: 'Written Testimonials', icon: '💬' },
    { key: 'cta', label: 'Call to Action', icon: '🎯' },
    { key: 'legalPages', label: 'Legal Pages', icon: '📜' },
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
      // Merge current section data with form changes to ensure all fields are sent
      const currentSectionData = content?.[activeSection] || {};
      const dataToSave = { ...currentSectionData, ...formData };

      // Remove non-editable fields that shouldn't be sent
      delete dataToSave.id;
      delete dataToSave.section;
      delete dataToSave.updatedAt;
      delete dataToSave.updatedBy;

      console.log('=== Saving Section ===');
      console.log('Section:', activeSection);
      console.log('formData:', formData);
      console.log('currentSectionData:', currentSectionData);
      console.log('dataToSave:', dataToSave);

      await onUpdateContent(activeSection, dataToSave);
      console.log('Save completed successfully');
      // Note: formData will be cleared in the updateSuccess effect after content is refreshed
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

    // Debug logging for form state
    if (activeSection === 'branding') {
      console.log('=== Branding Form Debug ===');
      console.log('sectionData.tagline:', sectionData?.tagline);
      console.log('formData.tagline:', formData.tagline);
      console.log('formData.tagline !== undefined:', formData.tagline !== undefined);
      console.log('Displayed value:', formData.tagline !== undefined ? formData.tagline : (sectionData?.tagline || ''));
    }

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
                  value={formData.logoUrl !== undefined ? formData.logoUrl : (sectionData?.logoUrl || '')}
                  onChange={e => handleInputChange('logoUrl', e.target.value)}
                />
              </div>
              {(formData.logoUrl || sectionData?.logoUrl) && (
                <div className={css.imagePreview}>
                  <img
                    src={formData.logoUrl || sectionData.logoUrl}
                    alt="Logo preview"
                    className={css.previewImage}
                    style={{
                      height: `${formData.logoHeight || sectionData?.logoHeight || 36}px`,
                      width: 'auto'
                    }}
                  />
                </div>
              )}
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Logo Size</label>
              <div className={css.logoSizeSelector}>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="logoHeight"
                    value="24"
                    checked={(formData.logoHeight || sectionData?.logoHeight || 36) === 24}
                    onChange={() => handleInputChange('logoHeight', 24)}
                  />
                  <span className={css.radioText}>Small (24px)</span>
                </label>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="logoHeight"
                    value="36"
                    checked={(formData.logoHeight || sectionData?.logoHeight || 36) === 36}
                    onChange={() => handleInputChange('logoHeight', 36)}
                  />
                  <span className={css.radioText}>Medium (36px) - Default</span>
                </label>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="logoHeight"
                    value="48"
                    checked={(formData.logoHeight || sectionData?.logoHeight || 36) === 48}
                    onChange={() => handleInputChange('logoHeight', 48)}
                  />
                  <span className={css.radioText}>Large (48px)</span>
                </label>
              </div>
              <span className={css.formHint}>
                Choose the logo height for the navigation bar
              </span>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Site Tagline</label>
              <input
                type="text"
                className={css.formInput}
                placeholder="Your company tagline"
                value={formData.tagline !== undefined ? formData.tagline : (sectionData?.tagline || '')}
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
                  value={formData.faviconUrl !== undefined ? formData.faviconUrl : (sectionData?.faviconUrl || '')}
                  onChange={e => handleInputChange('faviconUrl', e.target.value)}
                />
              </div>
            </div>

            <h4 className={css.subSectionTitle} style={{ marginTop: '30px' }}>Social Media Links</h4>
            <p className={css.formHint}>
              Add your social media profile URLs. These will appear in the site footer.
            </p>

            <div className={css.formGroup}>
              <label className={css.formLabel}>
                <span className={css.socialIcon}>📘</span> Facebook
              </label>
              <input
                type="url"
                className={css.formInput}
                placeholder="https://facebook.com/yourpage"
                value={formData.socialFacebook !== undefined ? formData.socialFacebook : (sectionData?.socialFacebook || '')}
                onChange={e => handleInputChange('socialFacebook', e.target.value)}
              />
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>
                <span className={css.socialIcon}>🐦</span> Twitter / X
              </label>
              <input
                type="url"
                className={css.formInput}
                placeholder="https://twitter.com/yourhandle"
                value={formData.socialTwitter !== undefined ? formData.socialTwitter : (sectionData?.socialTwitter || '')}
                onChange={e => handleInputChange('socialTwitter', e.target.value)}
              />
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>
                <span className={css.socialIcon}>📸</span> Instagram
              </label>
              <input
                type="url"
                className={css.formInput}
                placeholder="https://instagram.com/yourhandle"
                value={formData.socialInstagram !== undefined ? formData.socialInstagram : (sectionData?.socialInstagram || '')}
                onChange={e => handleInputChange('socialInstagram', e.target.value)}
              />
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>
                <span className={css.socialIcon}>💼</span> LinkedIn
              </label>
              <input
                type="url"
                className={css.formInput}
                placeholder="https://linkedin.com/company/yourcompany"
                value={formData.socialLinkedin !== undefined ? formData.socialLinkedin : (sectionData?.socialLinkedin || '')}
                onChange={e => handleInputChange('socialLinkedin', e.target.value)}
              />
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>
                <span className={css.socialIcon}>▶️</span> YouTube
              </label>
              <input
                type="url"
                className={css.formInput}
                placeholder="https://youtube.com/@yourchannel"
                value={formData.socialYoutube !== undefined ? formData.socialYoutube : (sectionData?.socialYoutube || '')}
                onChange={e => handleInputChange('socialYoutube', e.target.value)}
              />
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>
                <span className={css.socialIcon}>🎵</span> TikTok
              </label>
              <input
                type="url"
                className={css.formInput}
                placeholder="https://tiktok.com/@yourhandle"
                value={formData.socialTiktok !== undefined ? formData.socialTiktok : (sectionData?.socialTiktok || '')}
                onChange={e => handleInputChange('socialTiktok', e.target.value)}
              />
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

      case 'legalPages':
        const legalPageTypes = [
          { key: 'privacyPolicy', label: 'Privacy Policy', description: 'Explain how you collect, use, and protect user data.' },
          { key: 'termsOfService', label: 'Terms of Service', description: 'Define the rules and guidelines for using your platform.' },
          { key: 'cookiePolicy', label: 'Cookie Policy', description: 'Describe what cookies you use and why.' },
          { key: 'disclaimer', label: 'Disclaimer', description: 'Limit your liability and clarify your responsibilities.' },
          { key: 'acceptableUse', label: 'Acceptable Use Policy', description: 'Define what behavior is acceptable on your platform.' },
          { key: 'refundPolicy', label: 'Refund Policy', description: 'Explain your refund and cancellation policies.' },
        ];

        return (
          <div className={css.contentForm}>
            <h4 className={css.subSectionTitle}>Legal Pages</h4>
            <p className={css.formHint}>
              Manage your legal documents. These pages are accessible from the footer and during user registration.
              Use HTML or Markdown formatting for the content.
            </p>

            {legalPageTypes.map(pageType => {
              const pageData = sectionData?.[pageType.key] || {};
              const isExpanded = formData[`${pageType.key}_expanded`];

              return (
                <div key={pageType.key} className={css.legalPageCard}>
                  <div className={css.legalPageHeader}>
                    <div className={css.legalPageInfo}>
                      <h5 className={css.legalPageTitle}>{pageType.label}</h5>
                      <p className={css.legalPageDescription}>{pageType.description}</p>
                      {pageData.lastUpdated && (
                        <span className={css.legalPageDate}>
                          Last updated: {new Date(pageData.lastUpdated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className={css.legalPageActions}>
                      <label className={css.toggleLabel}>
                        <input
                          type="checkbox"
                          checked={formData[`${pageType.key}_isActive`] !== undefined
                            ? formData[`${pageType.key}_isActive`]
                            : pageData.isActive}
                          onChange={e => handleInputChange(`${pageType.key}_isActive`, e.target.checked)}
                        />
                        <span>Active</span>
                      </label>
                      <button
                        type="button"
                        className={css.expandButton}
                        onClick={() => handleInputChange(`${pageType.key}_expanded`, !isExpanded)}
                      >
                        {isExpanded ? '▲ Collapse' : '▼ Edit'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={css.legalPageEditor}>
                      <div className={css.formGroup}>
                        <label className={css.formLabel}>Page Title</label>
                        <input
                          type="text"
                          className={css.formInput}
                          value={formData[`${pageType.key}_title`] !== undefined
                            ? formData[`${pageType.key}_title`]
                            : (pageData.title || pageType.label)}
                          onChange={e => handleInputChange(`${pageType.key}_title`, e.target.value)}
                        />
                      </div>
                      <div className={css.formGroup}>
                        <label className={css.formLabel}>Content (HTML or Markdown)</label>
                        <textarea
                          className={css.formTextarea}
                          rows={15}
                          placeholder={`Enter your ${pageType.label} content here...`}
                          value={formData[`${pageType.key}_content`] !== undefined
                            ? formData[`${pageType.key}_content`]
                            : (pageData.content || '')}
                          onChange={e => handleInputChange(`${pageType.key}_content`, e.target.value)}
                        />
                        <span className={css.formHint}>
                          Tip: You can use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, etc.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              className={css.saveButton}
              onClick={() => {
                // Build the legal pages data structure
                const legalPagesData = {};
                legalPageTypes.forEach(pageType => {
                  const currentData = sectionData?.[pageType.key] || {};
                  legalPagesData[pageType.key] = {
                    title: formData[`${pageType.key}_title`] !== undefined
                      ? formData[`${pageType.key}_title`]
                      : currentData.title,
                    content: formData[`${pageType.key}_content`] !== undefined
                      ? formData[`${pageType.key}_content`]
                      : currentData.content,
                    isActive: formData[`${pageType.key}_isActive`] !== undefined
                      ? formData[`${pageType.key}_isActive`]
                      : currentData.isActive,
                    lastUpdated: new Date().toISOString(),
                  };
                });
                onUpdateContent('legalPages', legalPagesData);
                setFormData({});
              }}
              disabled={updateInProgress}
            >
              {updateInProgress ? 'Saving...' : 'Save Legal Pages'}
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
    // User Stats
    userStats,
    // Educational Admin Applications
    eduApplications,
    eduApplicationsStats,
    fetchApplicationsInProgress,
    approveApplicationInProgress,
    rejectApplicationInProgress,
    // Educational Admins (institutions)
    educationalAdminsList,
    fetchEducationalAdminsInProgress,
    updateSubscriptionInProgress,
    updateSubscriptionSuccess,
    // Corporate Partner Deposits
    corporatePartners,
    corporatePartnersPagination,
    fetchCorporateDepositsInProgress,
    selectedPartner,
    selectedPartnerDeposits,
    fetchPartnerDepositsInProgress,
    clearHoldInProgress,
    reinstateHoldInProgress,
    clearAllHoldsInProgress,
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
    onFetchUserStats,
    onFetchApplications,
    onApproveApplication,
    onRejectApplication,
    onFetchEducationalAdmins,
    onUpdateSubscription,
    onClearSubscriptionState,
    // Corporate Partner Deposit Actions
    onFetchCorporateDeposits,
    onFetchPartnerDeposits,
    onClearWorkHold,
    onReinstateWorkHold,
    onClearAllHolds,
    onClearSelectedPartner,
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

  // Get students for messaging
  const students = users.filter(
    u => u.attributes?.profile?.publicData?.userType === 'student'
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
              userStats={userStats}
              onFetchUsers={onFetchUsers}
              onBlockUser={onBlockUser}
              onUnblockUser={onUnblockUser}
              onDeleteUser={onDeleteUser}
              onMessageEducator={handleMessageEducator}
              onFetchUserStats={onFetchUserStats}
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
            <UnifiedDepositsPanel
              // Corporate partner deposits (work hold management)
              corporatePartners={corporatePartners}
              fetchCorporateInProgress={fetchCorporateDepositsInProgress}
              selectedPartner={selectedPartner}
              selectedPartnerDeposits={selectedPartnerDeposits}
              fetchPartnerInProgress={fetchPartnerDepositsInProgress}
              clearHoldInProgress={clearHoldInProgress}
              reinstateHoldInProgress={reinstateHoldInProgress}
              clearAllHoldsInProgress={clearAllHoldsInProgress}
              onFetchCorporateDeposits={onFetchCorporateDeposits}
              onFetchPartnerDeposits={onFetchPartnerDeposits}
              onClearWorkHold={onClearWorkHold}
              onReinstateWorkHold={onReinstateWorkHold}
              onClearAllHolds={onClearAllHolds}
              onClearSelectedPartner={onClearSelectedPartner}
              // Payment confirmations
              deposits={deposits}
              fetchDepositsInProgress={fetchDepositsInProgress}
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
              students={students}
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
              users={users}
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
            <UnifiedInstitutionManagementPanel
              applications={eduApplications}
              applicationStats={eduApplicationsStats}
              educationalAdmins={educationalAdminsList}
              fetchApplicationsInProgress={fetchApplicationsInProgress}
              fetchEducationalAdminsInProgress={fetchEducationalAdminsInProgress}
              approveInProgress={approveApplicationInProgress}
              rejectInProgress={rejectApplicationInProgress}
              updateSubscriptionInProgress={updateSubscriptionInProgress}
              updateSubscriptionSuccess={updateSubscriptionSuccess}
              onFetchApplications={onFetchApplications}
              onApproveApplication={onApproveApplication}
              onRejectApplication={onRejectApplication}
              onFetchEducationalAdmins={onFetchEducationalAdmins}
              onUpdateSubscription={onUpdateSubscription}
              onClearSubscriptionState={onClearSubscriptionState}
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
    content,
    fetchContentInProgress,
    updateContentInProgress,
    updateContentSuccess,
    userStats,
    // Educational Admin Applications
    eduApplications,
    eduApplicationsStats,
    fetchApplicationsInProgress,
    approveApplicationInProgress,
    rejectApplicationInProgress,
    // Educational Admins
    educationalAdmins,
    fetchEducationalAdminsInProgress,
    updateSubscriptionInProgress,
    updateSubscriptionSuccess,
    // Corporate Partner Deposits
    corporatePartners,
    corporatePartnersPagination,
    fetchCorporateDepositsInProgress,
    selectedPartner,
    selectedPartnerDeposits,
    fetchPartnerDepositsInProgress,
    clearHoldInProgress,
    reinstateHoldInProgress,
    clearAllHoldsInProgress,
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
    userStats,
    // Educational Admin Applications
    eduApplications,
    eduApplicationsStats,
    fetchApplicationsInProgress,
    approveApplicationInProgress,
    rejectApplicationInProgress,
    // Educational Admins (renamed to avoid conflict with component's local variable)
    educationalAdminsList: educationalAdmins,
    fetchEducationalAdminsInProgress,
    updateSubscriptionInProgress,
    updateSubscriptionSuccess,
    // Corporate Partner Deposits
    corporatePartners,
    corporatePartnersPagination,
    fetchCorporateDepositsInProgress,
    selectedPartner,
    selectedPartnerDeposits,
    fetchPartnerDepositsInProgress,
    clearHoldInProgress,
    reinstateHoldInProgress,
    clearAllHoldsInProgress,
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
  onFetchUserStats: userId => dispatch(fetchUserStatsAction(userId)),
  // Educational Admin Applications
  onFetchApplications: params => dispatch(fetchApplications(params)),
  onApproveApplication: applicationId => dispatch(approveApplicationAction(applicationId)),
  onRejectApplication: (applicationId, reason) => dispatch(rejectApplicationAction(applicationId, reason)),
  onFetchEducationalAdmins: params => dispatch(fetchEducationalAdmins(params)),
  onUpdateSubscription: (userId, data) => dispatch(updateSubscriptionAction(userId, data)),
  onClearSubscriptionState: () => dispatch(clearSubscriptionState()),
  // Corporate Partner Deposits
  onFetchCorporateDeposits: params => dispatch(fetchCorporateDeposits(params)),
  onFetchPartnerDeposits: partnerId => dispatch(fetchCorporatePartnerDepositsAction(partnerId)),
  onClearWorkHold: (transactionId, notes) => dispatch(clearWorkHoldAction(transactionId, notes)),
  onReinstateWorkHold: (transactionId, reason) => dispatch(reinstateWorkHoldAction(transactionId, reason)),
  onClearAllHolds: (partnerId, notes) => dispatch(clearAllHoldsForPartnerAction(partnerId, notes)),
  onClearSelectedPartner: () => dispatch(clearSelectedPartner()),
});

const AdminDashboardPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AdminDashboardPageComponent);

export default AdminDashboardPage;
