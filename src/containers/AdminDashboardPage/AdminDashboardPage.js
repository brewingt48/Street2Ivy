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
import { exportAdminReport, apiBaseUrl, fetchAllCompaniesSpending } from '../../util/api';

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
  // Tenant management
  fetchTenants,
  createTenantAction,
  deleteTenantAction,
  activateTenantAction,
  deactivateTenantAction,
  createTenantAdminAction,
  clearTenantState,
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

  // Calculate user stats by type
  const userCounts = users.reduce(
    (acc, user) => {
      const userType = user.attributes?.profile?.publicData?.userType || 'unknown';
      acc.total++;
      if (userType === 'student') acc.students++;
      else if (userType === 'corporate-partner') acc.corporate++;
      else if (userType === 'educational-admin') acc.eduAdmin++;
      else if (userType === 'system-admin') acc.sysAdmin++;
      return acc;
    },
    { total: 0, students: 0, corporate: 0, eduAdmin: 0, sysAdmin: 0 }
  );

  const handleClearFilters = () => {
    setFilters({ userType: '', status: '', search: '' });
    onFetchUsers({});
  };

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>
          <FormattedMessage id="AdminDashboardPage.userManagement" />
        </h2>
      </div>

      {/* User Stats Bar */}
      <div className={css.userStatsBar}>
        <div className={css.userStatItem}>
          <span className={css.userStatValue}>{pagination?.totalItems || userCounts.total}</span>
          <span className={css.userStatLabel}>Total Users</span>
        </div>
        <div className={css.userStatItem}>
          <span className={classNames(css.userStatValue, css.studentValue)}>{userCounts.students}</span>
          <span className={css.userStatLabel}>Students</span>
        </div>
        <div className={css.userStatItem}>
          <span className={classNames(css.userStatValue, css.corporateValue)}>{userCounts.corporate}</span>
          <span className={css.userStatLabel}>Corporate</span>
        </div>
        <div className={css.userStatItem}>
          <span className={classNames(css.userStatValue, css.eduAdminValue)}>{userCounts.eduAdmin}</span>
          <span className={css.userStatLabel}>Edu Admins</span>
        </div>
      </div>

      {/* Filters */}
      <div className={css.filterBar}>
        <div className={css.filterGroup}>
          <div className={css.filterItem}>
            <label className={css.filterLabel}>User Type</label>
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
            <label className={css.filterLabel}>Status</label>
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
            <label className={css.filterLabel}>Search</label>
            <input
              type="text"
              className={css.filterInput}
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        <div className={css.filterGroup}>
          <button className={css.searchButton} onClick={handleSearch} disabled={fetchInProgress}>
            🔍 Search
          </button>
          {(filters.userType || filters.status || filters.search) && (
            <button className={css.clearFiltersButton} onClick={handleClearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      {fetchInProgress ? (
        <div className={css.loadingState}>
          <div className={css.spinner}></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          <div className={css.usersTableWrapper}>
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
              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan="8">
                    <div className={css.emptyState}>
                      <span className={css.emptyIcon}>👥</span>
                      <h3>No users found</h3>
                      <p>Try adjusting your filters or search criteria to find users.</p>
                    </div>
                  </td>
                </tr>
              )}
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
                      <button
                        type="button"
                        className={classNames(css.userTypeBadge, css[userType], css.userTypeBadgeClickable)}
                        onClick={() => handleFilterChange('userType', userType)}
                        title={`Filter by user type: ${getUserTypeLabel(userType)}`}
                      >
                        {getUserTypeLabel(userType)}
                      </button>
                    </td>
                    <td className={css.collegeCell}>
                      {collegeOrCompany && collegeOrCompany !== '-' ? (
                        <button
                          type="button"
                          className={css.clickableField}
                          onClick={() => {
                            handleFilterChange('search', collegeOrCompany);
                            handleSearch();
                          }}
                          title={`Search for users from: ${collegeOrCompany}`}
                        >
                          {collegeOrCompany}
                        </button>
                      ) : '-'}
                    </td>
                    <td className={css.locationCell}>
                      {location && location !== '-' ? (
                        <button
                          type="button"
                          className={css.clickableField}
                          onClick={() => {
                            handleFilterChange('search', location);
                            handleSearch();
                          }}
                          title={`Search for users in: ${location}`}
                        >
                          {location}
                        </button>
                      ) : '-'}
                    </td>
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
          </div>

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
                  {isSent && message.recipientId ? (
                    <NamedLink
                      className={css.emailRecipientLink}
                      name="ProfilePage"
                      params={{ id: message.recipientId }}
                      onClick={e => e.stopPropagation()}
                      title="View recipient profile"
                    >
                      {message.recipientName || message.recipientId}
                    </NamedLink>
                  ) : (
                    isSent
                      ? (message.recipientName || message.recipientId)
                      : (message.senderName || 'System')
                  )}
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
                {selectedMessage.recipientId ? (
                  <NamedLink
                    className={css.messageRecipientLink}
                    name="ProfilePage"
                    params={{ id: selectedMessage.recipientId }}
                    title="View recipient profile"
                  >
                    {selectedMessage.recipientName || selectedMessage.recipientId}
                    <span className={css.profileArrow}>→</span>
                  </NamedLink>
                ) : (
                  <span>{selectedMessage.recipientName || selectedMessage.recipientId}</span>
                )}
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
  const { reports, fetchInProgress, currentReportType, onFetchReports, users, onNavigateToUsersWithSearch } = props;

  const [statDetailModal, setStatDetailModal] = useState(null);

  const reportTypes = [
    { key: 'overview', label: 'Platform Overview' },
    { key: 'users', label: 'Users Report' },
    { key: 'institutions', label: 'Institutions' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'corporate-spending', label: 'Corporate Spending' },
  ];

  // State for company spending report
  const [companySpending, setCompanySpending] = useState(null);
  const [companySpendingLoading, setCompanySpendingLoading] = useState(false);

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
                    <td>
                      {inst.name ? (
                        <button
                          type="button"
                          className={css.clickableTableCell}
                          onClick={() => onNavigateToUsersWithSearch?.(inst.name)}
                          title={`View users from ${inst.name}`}
                        >
                          {inst.name}
                        </button>
                      ) : 'Unknown'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={css.clickableTableCell}
                        onClick={() => onNavigateToUsersWithSearch?.(inst.domain)}
                        title={`View users with domain ${inst.domain}`}
                      >
                        {inst.domain}
                      </button>
                    </td>
                    <td>
                      {inst.studentCount > 0 ? (
                        <button
                          type="button"
                          className={css.clickableStatInTable}
                          onClick={() => onNavigateToUsersWithSearch?.(inst.name || inst.domain, 'student')}
                          title={`View ${inst.studentCount} students from this institution`}
                        >
                          {inst.studentCount}
                        </button>
                      ) : '0'}
                    </td>
                    <td>
                      {inst.adminCount > 0 ? (
                        <button
                          type="button"
                          className={css.clickableStatInTable}
                          onClick={() => onNavigateToUsersWithSearch?.(inst.name || inst.domain, 'educational-admin')}
                          title={`View ${inst.adminCount} admins from this institution`}
                        >
                          {inst.adminCount}
                        </button>
                      ) : '0'}
                    </td>
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

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const renderCorporateSpendingReport = () => {
    if (companySpendingLoading) {
      return <div className={css.loadingState}>Loading corporate spending data...</div>;
    }

    if (!companySpending) {
      return <div className={css.loadingState}>No spending data available.</div>;
    }

    const { companies, totals, currency } = companySpending;

    return (
      <>
        <div className={css.statsGrid}>
          <div className={css.statCard}>
            <p className={css.statValue}>{formatCurrency(totals.totalSpentAllCompanies, currency)}</p>
            <p className={css.statLabel}>Total Invested</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{totals.totalProjectsAllCompanies}</p>
            <p className={css.statLabel}>Total Projects</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{totals.totalCompanies}</p>
            <p className={css.statLabel}>Active Companies</p>
          </div>
          <div className={css.statCard}>
            <p className={css.statValue}>{formatCurrency(totals.avgSpendingPerCompany, currency)}</p>
            <p className={css.statLabel}>Avg. Investment/Company</p>
          </div>
        </div>

        <div className={css.reportSection}>
          <h4 className={css.reportSectionTitle}>Corporate Partners by Investment</h4>
          {companies && companies.length > 0 ? (
            <table className={css.institutionsTable}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Total Invested</th>
                  <th>Projects Posted</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.companyId}>
                    <td>
                      <NamedLink
                        name="ProfilePage"
                        params={{ id: company.companyId }}
                        className={css.clickableTableCell}
                      >
                        {company.companyName}
                      </NamedLink>
                    </td>
                    <td>{formatCurrency(company.totalSpent, currency)}</td>
                    <td>{company.totalProjects}</td>
                    <td>{company.completedProjects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No corporate spending data available.</p>
          )}
        </div>
      </>
    );
  };

  // Fetch company spending when switching to that report type
  useEffect(() => {
    if (currentReportType === 'corporate-spending' && !companySpending) {
      setCompanySpendingLoading(true);
      fetchAllCompaniesSpending()
        .then(data => {
          setCompanySpending(data);
          setCompanySpendingLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch company spending:', err);
          setCompanySpendingLoading(false);
        });
    }
  }, [currentReportType, companySpending]);

  const renderReportContent = () => {
    if (fetchInProgress && currentReportType !== 'corporate-spending') {
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
      case 'corporate-spending':
        return renderCorporateSpendingReport();
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

  // Handle report type selection
  const handleReportTypeClick = (typeKey) => {
    if (typeKey === 'corporate-spending') {
      // For corporate spending, we fetch client-side
      if (!companySpending && !companySpendingLoading) {
        setCompanySpendingLoading(true);
        fetchAllCompaniesSpending()
          .then(data => {
            setCompanySpending(data);
            setCompanySpendingLoading(false);
          })
          .catch(err => {
            console.error('Failed to fetch company spending:', err);
            setCompanySpendingLoading(false);
          });
      }
    }
    // Always call onFetchReports to update currentReportType in Redux
    onFetchReports(typeKey);
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
            onClick={() => handleReportTypeClick(type.key)}
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
      <div className={css.institutionSubTabs}>
        <button
          className={classNames(css.institutionSubTab, {
            [css.institutionSubTabActive]: activeSection === 'applications',
          })}
          onClick={() => setActiveSection('applications')}
        >
          <span className={css.institutionSubTabIcon}>📋</span>
          Applications
          {applicationStats?.pending > 0 && (
            <span className={css.badgeCount}>{applicationStats.pending}</span>
          )}
        </button>
        <button
          className={classNames(css.institutionSubTab, {
            [css.institutionSubTabActive]: activeSection === 'admins',
          })}
          onClick={() => {
            setActiveSection('admins');
            onFetchEducationalAdmins({});
          }}
        >
          <span className={css.institutionSubTabIcon}>🎓</span>
          Educational Admins
        </button>
        <button
          className={classNames(css.institutionSubTab, {
            [css.institutionSubTabActive]: activeSection === 'domains',
          })}
          onClick={() => setActiveSection('domains')}
        >
          <span className={css.institutionSubTabIcon}>🏛️</span>
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
        Manage AI coaching access for educational administrators. When AI coaching is approved
        for an institution, their students gain access to the AI-powered career coaching tool
        that provides personalized resume reviews, interview preparation, and career guidance.
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
        Manage AI coaching access for educational administrators. When AI coaching is approved
        for an institution, their students gain access to the AI-powered career coaching tool
        that provides personalized resume reviews, interview preparation, and career guidance.
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

// ================ AI Coaching Configuration Panel ================ //

const AICoachingConfigPanel = () => {
  // Global config state
  const [config, setConfig] = useState({
    platformUrl: '',
    platformName: 'AI Career Coach',
    platformStatus: false,
    welcomeMessage: '',
    termsOfUseUrl: '',
    confidentialityWarning: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Institutions state
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [updatingInstitution, setUpdatingInstitution] = useState(null);

  // Blocked students state
  const [blockedStudents, setBlockedStudents] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);

  // Student search/block state
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [institutionStudents, setInstitutionStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [blockingStudent, setBlockingStudent] = useState(null);
  const [unblockingStudent, setUnblockingStudent] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [studentToBlock, setStudentToBlock] = useState(null);

  // Active tab within the panel
  const [activeSubTab, setActiveSubTab] = useState('config');

  // Add/Edit institution state
  const [showAddInstitutionModal, setShowAddInstitutionModal] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [institutionForm, setInstitutionForm] = useState({
    domain: '',
    name: '',
    membershipStatus: 'active',
    membershipStartDate: '',
    membershipEndDate: '',
    aiCoachingEnabled: true,
    aiCoachingUrl: '',
  });
  const [savingInstitution, setSavingInstitution] = useState(false);
  const [deletingInstitution, setDeletingInstitution] = useState(null);
  const [institutionError, setInstitutionError] = useState(null);

  // Fetch global config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${apiBaseUrl()}/api/admin/coaching-config`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setConfig(data.data);
        } else {
          throw new Error('Failed to fetch coaching configuration');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Fetch institutions with coaching summary
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const response = await fetch(`${apiBaseUrl()}/api/admin/institutions-coaching-summary`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setInstitutions(data.data || []);
        } else {
          console.error('Institutions fetch failed:', response.status);
          setError(`Failed to load institutions (${response.status}). Please refresh.`);
        }
      } catch (err) {
        console.error('Error fetching institutions:', err);
        setError('Failed to load institutions. Please check your connection.');
      } finally {
        setLoadingInstitutions(false);
      }
    };
    fetchInstitutions();
  }, []);

  // Fetch blocked students
  useEffect(() => {
    const fetchBlocked = async () => {
      try {
        const response = await fetch(`${apiBaseUrl()}/api/admin/student-coaching-access`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setBlockedStudents(data.data || []);
        } else {
          console.error('Blocked students fetch failed:', response.status);
        }
      } catch (err) {
        console.error('Error fetching blocked students:', err);
      } finally {
        setLoadingBlocked(false);
      }
    };
    fetchBlocked();
  }, []);

  // Fetch students for a specific institution
  const fetchInstitutionStudents = async (domain) => {
    setLoadingStudents(true);
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/institution/${domain}/students`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setInstitutionStudents(data.data || []);
      } else {
        console.error('Students fetch failed:', response.status);
        setError(`Failed to load students for ${domain}.`);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to load students. Please check your connection.');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/coaching-config`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error('Failed to save coaching configuration');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle institution AI coaching
  const handleToggleInstitutionCoaching = async (domain, currentStatus) => {
    setUpdatingInstitution(domain);
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/institutions/${domain}/coaching`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiCoachingEnabled: !currentStatus }),
      });
      if (response.ok) {
        // Update local state
        setInstitutions(prev =>
          prev.map(inst =>
            inst.domain === domain ? { ...inst, aiCoachingEnabled: !currentStatus } : inst
          )
        );
      }
    } catch (err) {
      console.error('Error updating institution:', err);
    } finally {
      setUpdatingInstitution(null);
    }
  };

  // Block a student
  const handleBlockStudent = async () => {
    if (!studentToBlock) return;
    setBlockingStudent(studentToBlock.id);
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/student-coaching-access/block`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: studentToBlock.id, reason: blockReason }),
      });
      if (response.ok) {
        // Refresh blocked students list
        const blockedRes = await fetch(`${apiBaseUrl()}/api/admin/student-coaching-access`, {
          credentials: 'include',
        });
        if (blockedRes.ok) {
          const data = await blockedRes.json();
          setBlockedStudents(data.data || []);
        }
        // Update institution students list
        if (selectedInstitution) {
          fetchInstitutionStudents(selectedInstitution.domain);
        }
        setShowBlockModal(false);
        setStudentToBlock(null);
        setBlockReason('');
      }
    } catch (err) {
      console.error('Error blocking student:', err);
    } finally {
      setBlockingStudent(null);
    }
  };

  // Unblock a student
  const handleUnblockStudent = async (userId) => {
    setUnblockingStudent(userId);
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/student-coaching-access/unblock`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (response.ok) {
        // Update blocked students list
        setBlockedStudents(prev => prev.filter(s => s.userId !== userId));
        // Update institution students list if viewing
        if (selectedInstitution) {
          fetchInstitutionStudents(selectedInstitution.domain);
        }
      }
    } catch (err) {
      console.error('Error unblocking student:', err);
    } finally {
      setUnblockingStudent(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Refresh institutions list
  const refreshInstitutions = async () => {
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/institutions-coaching-summary`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setInstitutions(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching institutions:', err);
    }
  };

  // Open add institution modal
  const handleOpenAddInstitution = () => {
    setInstitutionForm({
      domain: '',
      name: '',
      membershipStatus: 'active',
      membershipStartDate: new Date().toISOString().split('T')[0],
      membershipEndDate: '',
      aiCoachingEnabled: true,
      aiCoachingUrl: '',
    });
    setEditingInstitution(null);
    setInstitutionError(null);
    setShowAddInstitutionModal(true);
  };

  // Open edit institution modal
  const handleOpenEditInstitution = (inst) => {
    setInstitutionForm({
      domain: inst.domain,
      name: inst.name,
      membershipStatus: inst.membershipStatus || 'active',
      membershipStartDate: inst.membershipStartDate || '',
      membershipEndDate: inst.membershipEndDate || '',
      aiCoachingEnabled: inst.aiCoachingEnabled || false,
      aiCoachingUrl: inst.aiCoachingUrl || '',
    });
    setEditingInstitution(inst);
    setInstitutionError(null);
    setShowAddInstitutionModal(true);
  };

  // Save institution (create or update)
  const handleSaveInstitution = async () => {
    if (!institutionForm.domain || !institutionForm.name) {
      setInstitutionError('Domain and name are required');
      return;
    }

    setSavingInstitution(true);
    setInstitutionError(null);

    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/institutions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(institutionForm),
      });

      if (response.ok) {
        await refreshInstitutions();
        setShowAddInstitutionModal(false);
        setEditingInstitution(null);
      } else {
        const errorData = await response.json();
        setInstitutionError(errorData.error || 'Failed to save institution');
      }
    } catch (err) {
      setInstitutionError('Failed to save institution');
      console.error('Error saving institution:', err);
    } finally {
      setSavingInstitution(false);
    }
  };

  // Delete institution
  const handleDeleteInstitution = async (domain) => {
    if (!window.confirm(`Are you sure you want to delete the institution "${domain}"? This will remove all membership data for this institution.`)) {
      return;
    }

    setDeletingInstitution(domain);
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/institutions/${domain}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await refreshInstitutions();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete institution');
      }
    } catch (err) {
      console.error('Error deleting institution:', err);
      alert('Failed to delete institution');
    } finally {
      setDeletingInstitution(null);
    }
  };

  // Toggle institution membership status
  const handleToggleInstitutionStatus = async (domain, currentStatus) => {
    setUpdatingInstitution(domain);
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/institutions/${domain}/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipStatus: newStatus }),
      });
      if (response.ok) {
        setInstitutions(prev =>
          prev.map(inst =>
            inst.domain === domain ? { ...inst, membershipStatus: newStatus } : inst
          )
        );
      }
    } catch (err) {
      console.error('Error updating institution status:', err);
    } finally {
      setUpdatingInstitution(null);
    }
  };

  if (loading) {
    return <div className={css.loading}>Loading configuration...</div>;
  }

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>AI Coaching Management</h2>
        <p className={css.panelDescription}>
          Manage the AI-powered career coaching platform for students. This tool provides
          personalized resume reviews, interview preparation, career path guidance, and
          job search strategies powered by artificial intelligence.
        </p>
      </div>

      {/* How it works guide */}
      <div className={css.aiCoachingGuide}>
        <h3 className={css.aiCoachingGuideTitle}>How AI Coaching Works</h3>
        <ol className={css.aiCoachingGuideSteps}>
          <li>
            <strong>Set up the platform</strong> — In "Platform Settings," enable the coaching
            platform and enter the URL where your AI coaching tool is hosted. Add a welcome
            message and terms of use for students.
          </li>
          <li>
            <strong>Enable institutions</strong> — In "Institutions," toggle on AI coaching
            for each school. Only students from enabled institutions can access the coaching
            tool. You can also set a custom coaching URL per institution.
          </li>
          <li>
            <strong>Approve educational admins</strong> — In the "Institutions" tab of the
            main admin dashboard, toggle the "AI Coaching" column to approve each educational
            admin. This allows the institution's students to see the coaching link.
          </li>
          <li>
            <strong>Manage access</strong> — Use "Blocked Students" to revoke access for
            individual students who violate terms of use or misuse the platform.
          </li>
        </ol>
      </div>

      {/* Sub-tabs */}
      <div className={css.subTabsContainer}>
        <button
          type="button"
          className={classNames(css.subTab, { [css.subTabActive]: activeSubTab === 'config' })}
          onClick={() => setActiveSubTab('config')}
        >
          Platform Settings
        </button>
        <button
          type="button"
          className={classNames(css.subTab, { [css.subTabActive]: activeSubTab === 'institutions' })}
          onClick={() => setActiveSubTab('institutions')}
        >
          Institutions ({institutions.length})
        </button>
        <button
          type="button"
          className={classNames(css.subTab, { [css.subTabActive]: activeSubTab === 'blocked' })}
          onClick={() => setActiveSubTab('blocked')}
        >
          Blocked Students ({blockedStudents.length})
        </button>
      </div>

      {error && <div className={css.errorMessage}>{error}</div>}
      {saveSuccess && <div className={css.successMessage}>Configuration saved successfully!</div>}

      {/* Platform Settings Tab */}
      {activeSubTab === 'config' && (
        <div className={css.formSection}>
          <p className={css.subTabIntro}>
            Configure the global AI coaching platform settings. These settings apply to all
            institutions unless overridden at the institution level. The Platform URL is where
            students will be redirected when they click "Access AI Coaching" on their dashboard.
          </p>
          <div className={css.formGroup}>
            <label className={css.formLabel}>Platform Status</label>
            <div className={css.toggleWrapper}>
              <label className={css.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={config.platformStatus}
                  onChange={e => setConfig({ ...config, platformStatus: e.target.checked })}
                />
                <span className={css.toggleSlider}></span>
              </label>
              <span className={css.toggleLabel}>
                {config.platformStatus ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className={css.formHint}>Enable or disable AI coaching platform-wide</p>
          </div>

          <div className={css.formGroup}>
            <label className={css.formLabel}>Platform Name</label>
            <input
              type="text"
              className={css.formInput}
              value={config.platformName}
              onChange={e => setConfig({ ...config, platformName: e.target.value })}
              placeholder="AI Career Coach"
            />
            <p className={css.formHint}>Display name shown to students (default: "AI Career Coach")</p>
          </div>

          <div className={css.formGroup}>
            <label className={css.formLabel}>Platform URL *</label>
            <input
              type="url"
              className={css.formInput}
              value={config.platformUrl}
              onChange={e => setConfig({ ...config, platformUrl: e.target.value })}
              placeholder="https://coaching-platform.example.com"
            />
            <p className={css.formHint}>The external URL where students access the AI coaching platform</p>
          </div>

          <div className={css.formGroup}>
            <label className={css.formLabel}>Welcome Message</label>
            <textarea
              className={css.formTextarea}
              value={config.welcomeMessage}
              onChange={e => setConfig({ ...config, welcomeMessage: e.target.value })}
              placeholder="Welcome message students see when first accessing coaching..."
              rows={4}
            />
            <p className={css.formHint}>Custom message students see when they first access the coaching tool</p>
          </div>

          <div className={css.formGroup}>
            <label className={css.formLabel}>Terms of Use URL</label>
            <input
              type="url"
              className={css.formInput}
              value={config.termsOfUseUrl}
              onChange={e => setConfig({ ...config, termsOfUseUrl: e.target.value })}
              placeholder="https://example.com/coaching-terms"
            />
            <p className={css.formHint}>Optional link to coaching-specific terms of use</p>
          </div>

          <div className={css.formGroup}>
            <label className={css.formLabel}>Confidentiality Warning</label>
            <textarea
              className={css.formTextarea}
              value={config.confidentialityWarning}
              onChange={e => setConfig({ ...config, confidentialityWarning: e.target.value })}
              placeholder="Do not share proprietary, confidential, or trade secret information..."
              rows={4}
            />
            <p className={css.formHint}>Warning message displayed to students before accessing AI coaching</p>
          </div>

          <div className={css.formActions}>
            <button
              type="button"
              className={css.primaryButton}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Institutions Tab */}
      {activeSubTab === 'institutions' && (
        <div className={css.formSectionWide}>
          {selectedInstitution ? (
            // Institution detail view with students
            <div>
              <button
                type="button"
                className={css.secondaryButton}
                onClick={() => {
                  setSelectedInstitution(null);
                  setInstitutionStudents([]);
                }}
              >
                ← Back to Institutions
              </button>

              <div className={css.institutionDetailHeader}>
                <h3>{selectedInstitution.name}</h3>
                <span className={css.domainLabel}>{selectedInstitution.domain}</span>
                <span className={classNames(css.statusBadge, selectedInstitution.aiCoachingEnabled ? css.statusActive : css.statusInactive)}>
                  AI Coaching: {selectedInstitution.aiCoachingEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <h4 style={{ marginTop: '24px', marginBottom: '16px' }}>Students at this Institution</h4>
              {loadingStudents ? (
                <div className={css.loading}>Loading students...</div>
              ) : institutionStudents.length === 0 ? (
                <p>No students found for this institution.</p>
              ) : (
                <table className={css.dataTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>AI Coaching Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutionStudents.map(student => (
                      <tr key={student.id}>
                        <td>{student.displayName}</td>
                        <td>{student.email}</td>
                        <td>
                          {student.aiCoachingBlocked ? (
                            <span className={classNames(css.statusBadge, css.statusBlocked)}>
                              Blocked
                            </span>
                          ) : (
                            <span className={classNames(css.statusBadge, css.statusActive)}>
                              Allowed
                            </span>
                          )}
                        </td>
                        <td>
                          {student.aiCoachingBlocked ? (
                            <button
                              type="button"
                              className={css.successButton}
                              onClick={() => handleUnblockStudent(student.id)}
                              disabled={unblockingStudent === student.id}
                            >
                              {unblockingStudent === student.id ? 'Unblocking...' : 'Unblock'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={css.dangerButton}
                              onClick={() => {
                                setStudentToBlock(student);
                                setShowBlockModal(true);
                              }}
                            >
                              Block
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            // Institutions list view
            <div>
              <div className={css.institutionHeaderRow}>
                <p style={{ margin: 0 }}>
                  Manage institutions and their AI coaching access. Enable/disable membership and AI coaching per institution.
                </p>
                <button
                  type="button"
                  className={css.primaryButton}
                  onClick={handleOpenAddInstitution}
                >
                  + Add Institution
                </button>
              </div>
              {loadingInstitutions ? (
                <div className={css.loading}>Loading institutions...</div>
              ) : institutions.length === 0 ? (
                <div className={css.emptyState}>
                  <p>No institutions found.</p>
                  <button
                    type="button"
                    className={css.primaryButton}
                    onClick={handleOpenAddInstitution}
                  >
                    Add Your First Institution
                  </button>
                </div>
              ) : (
                <table className={css.dataTable}>
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Domain</th>
                      <th>Membership Status</th>
                      <th>AI Coaching</th>
                      <th>Blocked Students</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.map(inst => (
                      <tr key={inst.domain}>
                        <td>{inst.name}</td>
                        <td><code className={css.domainCode}>{inst.domain}</code></td>
                        <td>
                          <div className={css.toggleWrapper}>
                            <label className={css.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={inst.membershipStatus === 'active'}
                                onChange={() => handleToggleInstitutionStatus(inst.domain, inst.membershipStatus)}
                                disabled={updatingInstitution === inst.domain}
                              />
                              <span className={css.toggleSlider}></span>
                            </label>
                            <span className={css.toggleLabel}>
                              {inst.membershipStatus === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={css.toggleWrapper}>
                            <label className={css.toggleSwitch}>
                              <input
                                type="checkbox"
                                checked={inst.aiCoachingEnabled}
                                onChange={() => handleToggleInstitutionCoaching(inst.domain, inst.aiCoachingEnabled)}
                                disabled={updatingInstitution === inst.domain}
                              />
                              <span className={css.toggleSlider}></span>
                            </label>
                            <span className={css.toggleLabel}>
                              {inst.aiCoachingEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </td>
                        <td>
                          {inst.blockedStudentsCount > 0 ? (
                            <span className={css.blockedCount}>{inst.blockedStudentsCount}</span>
                          ) : (
                            <span className={css.noneBlocked}>None</span>
                          )}
                        </td>
                        <td>
                          <div className={css.actionButtons}>
                            <button
                              type="button"
                              className={css.secondaryButton}
                              onClick={() => {
                                setSelectedInstitution(inst);
                                fetchInstitutionStudents(inst.domain);
                              }}
                            >
                              Students
                            </button>
                            <button
                              type="button"
                              className={css.editButton}
                              onClick={() => handleOpenEditInstitution(inst)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={css.deleteButton}
                              onClick={() => handleDeleteInstitution(inst.domain)}
                              disabled={deletingInstitution === inst.domain}
                            >
                              {deletingInstitution === inst.domain ? '...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* Blocked Students Tab */}
      {activeSubTab === 'blocked' && (
        <div className={css.formSectionWide}>
          <p style={{ marginBottom: '16px' }}>
            Students blocked from AI coaching access. These students cannot access AI coaching even if their institution has it enabled.
          </p>
          {loadingBlocked ? (
            <div className={css.loading}>Loading blocked students...</div>
          ) : blockedStudents.length === 0 ? (
            <div className={css.emptyState}>
              <p>No students are currently blocked from AI coaching.</p>
            </div>
          ) : (
            <table className={css.dataTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Institution</th>
                  <th>Reason</th>
                  <th>Blocked Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedStudents.map(student => (
                  <tr key={student.userId}>
                    <td>{student.displayName}</td>
                    <td>{student.email || 'N/A'}</td>
                    <td>{student.institution}</td>
                    <td>{student.reason}</td>
                    <td>{formatDate(student.blockedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={css.successButton}
                        onClick={() => handleUnblockStudent(student.userId)}
                        disabled={unblockingStudent === student.userId}
                      >
                        {unblockingStudent === student.userId ? 'Unblocking...' : 'Unblock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Block Student Modal */}
      {showBlockModal && studentToBlock && (
        <div className={css.modalOverlay}>
          <div className={css.modalContent}>
            <h3>Block Student from AI Coaching</h3>
            <p>
              You are about to block <strong>{studentToBlock.displayName}</strong> ({studentToBlock.email}) from AI coaching access.
            </p>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Reason for blocking</label>
              <textarea
                className={css.formTextarea}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                placeholder="Enter the reason for blocking this student..."
                rows={3}
              />
            </div>
            <div className={css.modalActions}>
              <button
                type="button"
                className={css.secondaryButton}
                onClick={() => {
                  setShowBlockModal(false);
                  setStudentToBlock(null);
                  setBlockReason('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={css.dangerButton}
                onClick={handleBlockStudent}
                disabled={blockingStudent}
              >
                {blockingStudent ? 'Blocking...' : 'Block Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Institution Modal */}
      {showAddInstitutionModal && (
        <div className={css.modalOverlay}>
          <div className={css.modalContentLarge}>
            <h3>{editingInstitution ? 'Edit Institution' : 'Add New Institution'}</h3>
            <p className={css.modalDescription}>
              {editingInstitution
                ? 'Update the institution details below.'
                : 'Add a new institution to enable their students to access Street2Ivy.'}
            </p>

            {institutionError && (
              <div className={css.errorMessage}>{institutionError}</div>
            )}

            <div className={css.formGroup}>
              <label className={css.formLabel}>Email Domain *</label>
              <input
                type="text"
                className={css.formInput}
                value={institutionForm.domain}
                onChange={e => setInstitutionForm({ ...institutionForm, domain: e.target.value.toLowerCase() })}
                placeholder="e.g., harvard.edu"
                disabled={!!editingInstitution}
              />
              <p className={css.formHint}>The email domain used by students (e.g., harvard.edu)</p>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Institution Name *</label>
              <input
                type="text"
                className={css.formInput}
                value={institutionForm.name}
                onChange={e => setInstitutionForm({ ...institutionForm, name: e.target.value })}
                placeholder="e.g., Harvard University"
              />
            </div>

            <div className={css.formRow}>
              <div className={css.formGroup}>
                <label className={css.formLabel}>Membership Status</label>
                <select
                  className={css.formSelect}
                  value={institutionForm.membershipStatus}
                  onChange={e => setInstitutionForm({ ...institutionForm, membershipStatus: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel}>AI Coaching</label>
                <div className={css.toggleWrapper}>
                  <label className={css.toggleSwitch}>
                    <input
                      type="checkbox"
                      checked={institutionForm.aiCoachingEnabled}
                      onChange={e => setInstitutionForm({ ...institutionForm, aiCoachingEnabled: e.target.checked })}
                    />
                    <span className={css.toggleSlider}></span>
                  </label>
                  <span className={css.toggleLabel}>
                    {institutionForm.aiCoachingEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className={css.formRow}>
              <div className={css.formGroup}>
                <label className={css.formLabel}>Membership Start Date</label>
                <input
                  type="date"
                  className={css.formInput}
                  value={institutionForm.membershipStartDate}
                  onChange={e => setInstitutionForm({ ...institutionForm, membershipStartDate: e.target.value })}
                />
              </div>

              <div className={css.formGroup}>
                <label className={css.formLabel}>Membership End Date</label>
                <input
                  type="date"
                  className={css.formInput}
                  value={institutionForm.membershipEndDate}
                  onChange={e => setInstitutionForm({ ...institutionForm, membershipEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>AI Coaching URL (Optional)</label>
              <input
                type="url"
                className={css.formInput}
                value={institutionForm.aiCoachingUrl}
                onChange={e => setInstitutionForm({ ...institutionForm, aiCoachingUrl: e.target.value })}
                placeholder="https://coaching.platform.com/institution"
              />
              <p className={css.formHint}>Custom AI coaching URL for this institution (leave empty to use global URL)</p>
            </div>

            <div className={css.modalActions}>
              <button
                type="button"
                className={css.secondaryButton}
                onClick={() => {
                  setShowAddInstitutionModal(false);
                  setEditingInstitution(null);
                  setInstitutionError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={css.primaryButton}
                onClick={handleSaveInstitution}
                disabled={savingInstitution}
              >
                {savingInstitution ? 'Saving...' : (editingInstitution ? 'Update Institution' : 'Add Institution')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ Student Waitlist Panel ================ //

const StudentWaitlistPanel = () => {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ totalEntries: 0, uniqueDomains: 0, topDomains: [] });
  const [pagination, setPagination] = useState({ page: 1, perPage: 50, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ search: '', domain: '', contacted: '' });
  const [editingEntry, setEditingEntry] = useState(null);

  const fetchWaitlist = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '50',
        ...filter,
      });
      const response = await fetch(`${apiBaseUrl()}/api/admin/student-waitlist?${params}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setStats(data.stats);
        setPagination(data.pagination);
      } else {
        throw new Error('Failed to fetch waitlist');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const handleFilterChange = (key, value) => {
    setFilter({ ...filter, [key]: value });
  };

  const applyFilters = () => {
    fetchWaitlist(1);
  };

  const handleMarkContacted = async (entryId, contacted) => {
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/student-waitlist/${entryId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacted }),
      });
      if (response.ok) {
        fetchWaitlist(pagination.page);
      }
    } catch (err) {
      console.error('Error updating entry:', err);
    }
  };

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this waitlist entry?')) return;
    try {
      const response = await fetch(`${apiBaseUrl()}/api/admin/student-waitlist/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        fetchWaitlist(pagination.page);
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
    }
  };

  const formatDate = dateStr => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>Student Waitlist</h2>
        <p className={css.panelDescription}>
          Students who tried to register from non-partner institutions. Use this data for institutional outreach.
        </p>
      </div>

      {/* Stats Summary */}
      <div className={css.statsGrid}>
        <div className={css.statCard}>
          <span className={css.statValue}>{stats.totalEntries}</span>
          <span className={css.statLabel}>Total Waitlist Entries</span>
        </div>
        <div className={css.statCard}>
          <span className={css.statValue}>{stats.uniqueDomains}</span>
          <span className={css.statLabel}>Unique Institutions</span>
        </div>
      </div>

      {/* Top Domains */}
      {stats.topDomains && stats.topDomains.length > 0 && (
        <div className={css.topDomainsSection}>
          <h4>Top Institutions by Interest</h4>
          <div className={css.topDomainsList}>
            {stats.topDomains.slice(0, 5).map(d => (
              <div key={d.domain} className={css.topDomainItem}>
                <span className={css.domainName}>{d.institutionName || d.domain}</span>
                <span className={css.domainCount}>{d.count} students</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={css.filterBar}>
        <input
          type="text"
          className={css.filterInput}
          placeholder="Search by name or email..."
          value={filter.search}
          onChange={e => handleFilterChange('search', e.target.value)}
        />
        <input
          type="text"
          className={css.filterInput}
          placeholder="Filter by domain..."
          value={filter.domain}
          onChange={e => handleFilterChange('domain', e.target.value)}
        />
        <select
          className={css.filterSelect}
          value={filter.contacted}
          onChange={e => handleFilterChange('contacted', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="false">Not Contacted</option>
          <option value="true">Contacted</option>
        </select>
        <button type="button" className={css.filterButton} onClick={applyFilters}>
          Apply Filters
        </button>
      </div>

      {error && <div className={css.errorMessage}>{error}</div>}

      {loading ? (
        <div className={css.loading}>Loading waitlist...</div>
      ) : entries.length === 0 ? (
        <div className={css.emptyState}>
          <p>No waitlist entries found.</p>
        </div>
      ) : (
        <>
          <table className={css.dataTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Institution</th>
                <th>Domain</th>
                <th>Date Added</th>
                <th>Attempts</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td>{entry.firstName} {entry.lastName}</td>
                  <td>{entry.email}</td>
                  <td>{entry.institutionName}</td>
                  <td><code>{entry.domain}</code></td>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td>{entry.attempts || 1}</td>
                  <td>
                    <span className={classNames(css.statusBadge, {
                      [css.statusContacted]: entry.contacted,
                      [css.statusPending]: !entry.contacted,
                    })}>
                      {entry.contacted ? 'Contacted' : 'Not Contacted'}
                    </span>
                  </td>
                  <td>
                    <div className={css.actionButtons}>
                      <button
                        type="button"
                        className={css.smallButton}
                        onClick={() => handleMarkContacted(entry.id, !entry.contacted)}
                      >
                        {entry.contacted ? 'Mark Pending' : 'Mark Contacted'}
                      </button>
                      <button
                        type="button"
                        className={css.deleteSmallButton}
                        onClick={() => handleDelete(entry.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div className={css.pagination}>
              <button
                type="button"
                className={css.paginationButton}
                onClick={() => fetchWaitlist(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
              <button
                type="button"
                className={css.paginationButton}
                onClick={() => fetchWaitlist(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
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
    { key: 'visibility', label: 'Section Visibility', icon: '👁️' },
    { key: 'branding', label: 'Logo & Branding', icon: '🎨' },
    { key: 'hero', label: 'Hero Section', icon: '🏠' },
    { key: 'statistics', label: 'Statistics', icon: '📊' },
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

  // Handle section visibility toggle
  const handleVisibilityToggle = (sectionKey) => {
    const sectionData = content?.[sectionKey];
    if (!sectionData) return;
    const newIsActive = !sectionData.isActive;
    onUpdateContent(sectionKey, { ...sectionData, isActive: newIsActive });
  };

  const renderSectionEditor = () => {
    // Visibility editor doesn't need sectionData
    if (activeSection === 'visibility') {
      const toggleableSections = [
        { key: 'hero', label: 'Hero Section', desc: 'The main banner with headline, subtitle, and call-to-action buttons' },
        { key: 'statistics', label: 'Statistics', desc: 'Impact numbers (students matched, companies, etc.)' },
        { key: 'features', label: 'Features', desc: 'The "Why Street2Ivy" value proposition cards' },
        { key: 'howItWorks', label: 'How It Works', desc: 'Step-by-step process for companies, students, and schools' },
        { key: 'videoTestimonial', label: 'Video Testimonial', desc: 'Video testimonial section' },
        { key: 'testimonials', label: 'Written Testimonials', desc: 'Written quotes from students and partners' },
        { key: 'cta', label: 'Call to Action', desc: 'The closing triple-path CTA section' },
      ];
      return (
        <div className={css.contentForm}>
          <h4 className={css.subSectionTitle}>Section Visibility</h4>
          <p className={css.formHint}>
            Toggle which sections are visible on the landing page. Disabled sections will be hidden from visitors.
          </p>
          <div className={css.visibilityList}>
            {toggleableSections.map(section => {
              const data = content?.[section.key];
              const isActive = data?.isActive !== false; // Default to true if undefined
              return (
                <div key={section.key} className={css.visibilityRow}>
                  <div className={css.visibilityInfo}>
                    <span className={css.visibilityLabel}>{section.label}</span>
                    <span className={css.visibilityDesc}>{section.desc}</span>
                  </div>
                  <div className={css.toggleWrapper}>
                    <label className={css.toggleSwitch}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleVisibilityToggle(section.key)}
                        disabled={updateInProgress}
                      />
                      <span className={css.toggleSlider}></span>
                    </label>
                    <span className={css.toggleLabel}>
                      {isActive ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const sectionData = content?.[activeSection];
    if (!sectionData) return <p>No content data available. Please check your connection and try again.</p>;

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
                <div className={css.imagePreviewWithActions}>
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
                  <button
                    type="button"
                    className={css.deleteImageButton}
                    onClick={() => {
                      handleInputChange('logoUrl', '');
                      // Reset the file input so the same file can be re-uploaded
                      const fileInput = document.getElementById('logo-upload');
                      if (fileInput) fileInput.value = '';
                    }}
                    title="Remove logo"
                  >
                    🗑️ Remove Logo
                  </button>
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
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="logoHeight"
                    value="60"
                    checked={(formData.logoHeight || sectionData?.logoHeight || 36) === 60}
                    onChange={() => handleInputChange('logoHeight', 60)}
                  />
                  <span className={css.radioText}>X-Large (60px)</span>
                </label>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="logoHeight"
                    value="72"
                    checked={(formData.logoHeight || sectionData?.logoHeight || 36) === 72}
                    onChange={() => handleInputChange('logoHeight', 72)}
                  />
                  <span className={css.radioText}>XX-Large (72px)</span>
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
                A short, memorable phrase that appears above the main title on the landing page (e.g., "Bridge the Gap Between Campus and Career")
              </span>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Tagline Color (optional)</label>
              <div className={css.colorPickerRow}>
                <input
                  type="color"
                  className={css.colorPicker}
                  value={formData.taglineColor || sectionData?.taglineColor || '#cccccc'}
                  onChange={e => handleInputChange('taglineColor', e.target.value)}
                />
                <input
                  type="text"
                  className={css.colorInput}
                  placeholder="#cccccc"
                  value={formData.taglineColor !== undefined ? formData.taglineColor : (sectionData?.taglineColor || '')}
                  onChange={e => handleInputChange('taglineColor', e.target.value)}
                />
                {(formData.taglineColor || sectionData?.taglineColor) && (
                  <button
                    type="button"
                    className={css.clearColorButton}
                    onClick={() => handleInputChange('taglineColor', '')}
                  >
                    Reset
                  </button>
                )}
              </div>
              <span className={css.formHint}>Custom color for the tagline text. Leave empty for default.</span>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Site Description (optional)</label>
              <textarea
                className={css.formTextarea}
                rows={3}
                placeholder="Additional description text for the landing page"
                value={formData.siteDescription !== undefined ? formData.siteDescription : (sectionData?.siteDescription || '')}
                onChange={e => handleInputChange('siteDescription', e.target.value)}
              />
              <span className={css.formHint}>
                Additional text that appears below the hero subtitle on the landing page. Use this for extra messaging or calls to action.
              </span>
            </div>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Site Description Color (optional)</label>
              <div className={css.colorPickerRow}>
                <input
                  type="color"
                  className={css.colorPicker}
                  value={formData.siteDescriptionColor || sectionData?.siteDescriptionColor || '#bbbbbb'}
                  onChange={e => handleInputChange('siteDescriptionColor', e.target.value)}
                />
                <input
                  type="text"
                  className={css.colorInput}
                  placeholder="#bbbbbb"
                  value={formData.siteDescriptionColor !== undefined ? formData.siteDescriptionColor : (sectionData?.siteDescriptionColor || '')}
                  onChange={e => handleInputChange('siteDescriptionColor', e.target.value)}
                />
                {(formData.siteDescriptionColor || sectionData?.siteDescriptionColor) && (
                  <button
                    type="button"
                    className={css.clearColorButton}
                    onClick={() => handleInputChange('siteDescriptionColor', '')}
                  >
                    Reset
                  </button>
                )}
              </div>
              <span className={css.formHint}>Custom color for the site description text. Leave empty for default.</span>
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

            <div className={css.formGroup} style={{ marginTop: '24px' }}>
              <label className={css.formLabel}>Social Media Icon Size</label>
              <div className={css.logoSizeSelector}>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="socialIconSize"
                    value="18"
                    checked={(formData.socialIconSize || sectionData?.socialIconSize || 24) === 18}
                    onChange={() => handleInputChange('socialIconSize', 18)}
                  />
                  <span className={css.radioText}>Small (18px)</span>
                </label>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="socialIconSize"
                    value="24"
                    checked={(formData.socialIconSize || sectionData?.socialIconSize || 24) === 24}
                    onChange={() => handleInputChange('socialIconSize', 24)}
                  />
                  <span className={css.radioText}>Medium (24px) - Default</span>
                </label>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="socialIconSize"
                    value="32"
                    checked={(formData.socialIconSize || sectionData?.socialIconSize || 24) === 32}
                    onChange={() => handleInputChange('socialIconSize', 32)}
                  />
                  <span className={css.radioText}>Large (32px)</span>
                </label>
                <label className={css.radioLabel}>
                  <input
                    type="radio"
                    name="socialIconSize"
                    value="40"
                    checked={(formData.socialIconSize || sectionData?.socialIconSize || 24) === 40}
                    onChange={() => handleInputChange('socialIconSize', 40)}
                  />
                  <span className={css.radioText}>X-Large (40px)</span>
                </label>
              </div>
              <span className={css.formHint}>
                Choose the size of social media icons in the footer
              </span>
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
                placeholder="Hero section title"
                value={formData.title !== undefined ? formData.title : (sectionData?.title || '')}
                onChange={e => handleInputChange('title', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Title Color (optional)</label>
              <div className={css.colorPickerRow}>
                <input
                  type="color"
                  className={css.colorPicker}
                  value={formData.titleColor || sectionData?.titleColor || '#ffffff'}
                  onChange={e => handleInputChange('titleColor', e.target.value)}
                />
                <input
                  type="text"
                  className={css.colorInput}
                  placeholder="#ffffff"
                  value={formData.titleColor !== undefined ? formData.titleColor : (sectionData?.titleColor || '')}
                  onChange={e => handleInputChange('titleColor', e.target.value)}
                />
                {(formData.titleColor || sectionData?.titleColor) && (
                  <button
                    type="button"
                    className={css.clearColorButton}
                    onClick={() => handleInputChange('titleColor', '')}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Subtitle</label>
              <textarea
                className={css.formTextarea}
                rows={3}
                placeholder="Hero section subtitle"
                value={formData.subtitle !== undefined ? formData.subtitle : (sectionData?.subtitle || '')}
                onChange={e => handleInputChange('subtitle', e.target.value)}
              />
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Subtitle Color (optional)</label>
              <div className={css.colorPickerRow}>
                <input
                  type="color"
                  className={css.colorPicker}
                  value={formData.subtitleColor || sectionData?.subtitleColor || '#e6e6e6'}
                  onChange={e => handleInputChange('subtitleColor', e.target.value)}
                />
                <input
                  type="text"
                  className={css.colorInput}
                  placeholder="#e6e6e6"
                  value={formData.subtitleColor !== undefined ? formData.subtitleColor : (sectionData?.subtitleColor || '')}
                  onChange={e => handleInputChange('subtitleColor', e.target.value)}
                />
                {(formData.subtitleColor || sectionData?.subtitleColor) && (
                  <button
                    type="button"
                    className={css.clearColorButton}
                    onClick={() => handleInputChange('subtitleColor', '')}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Button Settings */}
            <h4 className={css.subSectionTitle}>Button Settings</h4>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Primary Button Text</label>
              <input
                type="text"
                className={css.formInput}
                placeholder="Primary button text"
                value={formData.primaryButtonText !== undefined ? formData.primaryButtonText : (sectionData?.primaryButtonText || '')}
                onChange={e => handleInputChange('primaryButtonText', e.target.value)}
              />
            </div>
            <div className={css.formGroupRow}>
              <div className={css.formGroupHalf}>
                <label className={css.formLabel}>Primary Button Background</label>
                <div className={css.colorPickerRow}>
                  <input
                    type="color"
                    className={css.colorPicker}
                    value={formData.primaryButtonBgColor || sectionData?.primaryButtonBgColor || '#0084ff'}
                    onChange={e => handleInputChange('primaryButtonBgColor', e.target.value)}
                  />
                  <input
                    type="text"
                    className={css.colorInput}
                    placeholder="#0084ff"
                    value={formData.primaryButtonBgColor !== undefined ? formData.primaryButtonBgColor : (sectionData?.primaryButtonBgColor || '')}
                    onChange={e => handleInputChange('primaryButtonBgColor', e.target.value)}
                  />
                </div>
              </div>
              <div className={css.formGroupHalf}>
                <label className={css.formLabel}>Primary Button Text Color</label>
                <div className={css.colorPickerRow}>
                  <input
                    type="color"
                    className={css.colorPicker}
                    value={formData.primaryButtonTextColor || sectionData?.primaryButtonTextColor || '#ffffff'}
                    onChange={e => handleInputChange('primaryButtonTextColor', e.target.value)}
                  />
                  <input
                    type="text"
                    className={css.colorInput}
                    placeholder="#ffffff"
                    value={formData.primaryButtonTextColor !== undefined ? formData.primaryButtonTextColor : (sectionData?.primaryButtonTextColor || '')}
                    onChange={e => handleInputChange('primaryButtonTextColor', e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={css.formGroup}>
              <label className={css.formLabel}>Secondary Button Text</label>
              <input
                type="text"
                className={css.formInput}
                placeholder="Secondary button text"
                value={formData.secondaryButtonText !== undefined ? formData.secondaryButtonText : (sectionData?.secondaryButtonText || '')}
                onChange={e => handleInputChange('secondaryButtonText', e.target.value)}
              />
            </div>
            <div className={css.formGroupRow}>
              <div className={css.formGroupHalf}>
                <label className={css.formLabel}>Secondary Button Border</label>
                <div className={css.colorPickerRow}>
                  <input
                    type="color"
                    className={css.colorPicker}
                    value={formData.secondaryButtonBorderColor || sectionData?.secondaryButtonBorderColor || '#ffffff'}
                    onChange={e => handleInputChange('secondaryButtonBorderColor', e.target.value)}
                  />
                  <input
                    type="text"
                    className={css.colorInput}
                    placeholder="#ffffff"
                    value={formData.secondaryButtonBorderColor !== undefined ? formData.secondaryButtonBorderColor : (sectionData?.secondaryButtonBorderColor || '')}
                    onChange={e => handleInputChange('secondaryButtonBorderColor', e.target.value)}
                  />
                </div>
              </div>
              <div className={css.formGroupHalf}>
                <label className={css.formLabel}>Secondary Button Text Color</label>
                <div className={css.colorPickerRow}>
                  <input
                    type="color"
                    className={css.colorPicker}
                    value={formData.secondaryButtonTextColor || sectionData?.secondaryButtonTextColor || '#ffffff'}
                    onChange={e => handleInputChange('secondaryButtonTextColor', e.target.value)}
                  />
                  <input
                    type="text"
                    className={css.colorInput}
                    placeholder="#ffffff"
                    value={formData.secondaryButtonTextColor !== undefined ? formData.secondaryButtonTextColor : (sectionData?.secondaryButtonTextColor || '')}
                    onChange={e => handleInputChange('secondaryButtonTextColor', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Background Settings */}
            <h4 className={css.subSectionTitle}>Background Settings</h4>

            <div className={css.formGroup}>
              <label className={css.formLabel}>Background Type</label>
              <select
                className={css.formSelect}
                value={formData.backgroundType !== undefined ? formData.backgroundType : (sectionData?.backgroundType || 'image')}
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
                  value={formData.backgroundImage !== undefined ? formData.backgroundImage : (sectionData?.backgroundImage || '')}
                  onChange={e => handleInputChange('backgroundImage', e.target.value)}
                />
              </div>
              {(formData.backgroundImage || sectionData.backgroundImage) && (
                <div className={css.imagePreviewWithActions}>
                  <div className={css.imagePreview}>
                    <img
                      src={formData.backgroundImage || sectionData.backgroundImage}
                      alt="Background preview"
                      className={css.previewImage}
                    />
                  </div>
                  <button
                    type="button"
                    className={css.deleteImageButton}
                    onClick={() => {
                      handleInputChange('backgroundImage', '');
                      const fileInput = document.getElementById('hero-image-upload');
                      if (fileInput) fileInput.value = '';
                    }}
                    title="Remove background image"
                  >
                    🗑️ Remove Image
                  </button>
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
                  value={formData.backgroundVideo !== undefined ? formData.backgroundVideo : (sectionData?.backgroundVideo || '')}
                  onChange={e => handleInputChange('backgroundVideo', e.target.value)}
                />
              </div>
              {(formData.backgroundVideo || sectionData?.backgroundVideo) && (
                <div className={css.videoPreviewWithActions}>
                  <div className={css.videoPreview}>
                    <video
                      src={formData.backgroundVideo || sectionData.backgroundVideo}
                      className={css.previewVideo}
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  </div>
                  <button
                    type="button"
                    className={css.deleteImageButton}
                    onClick={() => {
                      handleInputChange('backgroundVideo', '');
                      const fileInput = document.getElementById('hero-video-upload');
                      if (fileInput) fileInput.value = '';
                    }}
                    title="Remove background video"
                  >
                    🗑️ Remove Video
                  </button>
                </div>
              )}
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

      case 'statistics':
        const statsItems = sectionData?.items || [];
        return (
          <div className={css.contentForm}>
            <h4 className={css.subSectionTitle}>Homepage Statistics</h4>
            <p className={css.formHint}>
              Edit the statistics displayed on the homepage. These numbers will animate when visitors scroll to the section.
            </p>

            {statsItems.map((stat, index) => (
              <div key={stat.id} className={css.statisticItem}>
                <h5 className={css.statisticItemTitle}>Statistic {index + 1}</h5>
                <div className={css.formRow}>
                  <div className={css.formGroup}>
                    <label className={css.formLabel}>Value</label>
                    <input
                      type="number"
                      step="0.1"
                      className={css.formInput}
                      placeholder="e.g., 5000"
                      value={formData[`stat_${stat.id}_value`] !== undefined
                        ? formData[`stat_${stat.id}_value`]
                        : stat.value}
                      onChange={e => handleInputChange(`stat_${stat.id}_value`, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className={css.formGroup}>
                    <label className={css.formLabel}>Suffix</label>
                    <input
                      type="text"
                      className={css.formInput}
                      placeholder="e.g., + or ★"
                      value={formData[`stat_${stat.id}_suffix`] !== undefined
                        ? formData[`stat_${stat.id}_suffix`]
                        : stat.suffix}
                      onChange={e => handleInputChange(`stat_${stat.id}_suffix`, e.target.value)}
                    />
                  </div>
                </div>
                <div className={css.formGroup}>
                  <label className={css.formLabel}>Label</label>
                  <input
                    type="text"
                    className={css.formInput}
                    placeholder="e.g., Students in Network"
                    value={formData[`stat_${stat.id}_label`] !== undefined
                      ? formData[`stat_${stat.id}_label`]
                      : stat.label}
                    onChange={e => handleInputChange(`stat_${stat.id}_label`, e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button
              className={css.saveButton}
              onClick={() => {
                // Build the updated items array from form data
                const updatedItems = statsItems.map(stat => ({
                  id: stat.id,
                  value: formData[`stat_${stat.id}_value`] !== undefined
                    ? formData[`stat_${stat.id}_value`]
                    : stat.value,
                  label: formData[`stat_${stat.id}_label`] !== undefined
                    ? formData[`stat_${stat.id}_label`]
                    : stat.label,
                  suffix: formData[`stat_${stat.id}_suffix`] !== undefined
                    ? formData[`stat_${stat.id}_suffix`]
                    : stat.suffix,
                }));

                // Save with the items array
                onUpdateContent('statistics', {
                  ...sectionData,
                  items: updatedItems
                });
              }}
              disabled={updateInProgress}
            >
              {updateInProgress ? 'Saving...' : 'Save Statistics'}
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

// ================ Tenants Panel ================ //

const TenantsPanel = props => {
  const {
    tenants,
    fetchInProgress,
    createInProgress,
    createError,
    createSuccess,
    actionInProgress,
    createAdminInProgress,
    createAdminError,
    createAdminResult,
    onFetchTenants,
    onCreateTenant,
    onDeleteTenant,
    onActivateTenant,
    onDeactivateTenant,
    onCreateTenantAdmin,
    onClearTenantState,
  } = props;

  // Views: 'list', 'create', 'credentials'
  const [view, setView] = useState('list');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [createAdminFor, setCreateAdminFor] = useState(null);
  const [credentialsTenant, setCredentialsTenant] = useState(null);
  const [copied, setCopied] = useState(null);

  // Create tenant form state
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    institutionDomain: '',
    displayName: '',
    clientId: '',
    clientSecret: '',
    integrationClientId: '',
    integrationClientSecret: '',
    requireCorporateApproval: true,
  });

  // Create admin form state
  const [adminForm, setAdminForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
  });

  // Auto-generate subdomain and displayName from name
  const handleNameChange = value => {
    const subdomain = value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
    setFormData(prev => ({
      ...prev,
      name: value,
      subdomain,
      displayName: value ? `Street2Ivy at ${value}` : '',
    }));
  };

  // Reset form when switching to create view
  const handleShowCreateForm = () => {
    setFormData({
      name: '',
      subdomain: '',
      institutionDomain: '',
      displayName: '',
      clientId: '',
      clientSecret: '',
      integrationClientId: '',
      integrationClientSecret: '',
      requireCorporateApproval: true,
    });
    onClearTenantState();
    setView('create');
  };

  // Submit create tenant
  const handleCreateTenant = async e => {
    e.preventDefault();
    try {
      await onCreateTenant({
        subdomain: formData.subdomain,
        name: formData.name,
        displayName: formData.displayName,
        institutionDomain: formData.institutionDomain,
        sharetribe: {
          clientId: formData.clientId,
          clientSecret: formData.clientSecret || undefined,
          integrationClientId: formData.integrationClientId || undefined,
          integrationClientSecret: formData.integrationClientSecret || undefined,
        },
        features: {
          requireCorporateApproval: formData.requireCorporateApproval,
        },
      });
      onFetchTenants();
      setView('list');
    } catch (err) {
      // Error is handled by Redux state
    }
  };

  // Handle create admin submit
  const handleCreateAdmin = async e => {
    e.preventDefault();
    if (!createAdminFor) return;
    try {
      await onCreateTenantAdmin(createAdminFor.id, {
        email: adminForm.email,
        firstName: adminForm.firstName,
        lastName: adminForm.lastName,
      });
      setCredentialsTenant(createAdminFor);
      setCreateAdminFor(null);
      setView('credentials');
    } catch (err) {
      // Error is handled by Redux state
    }
  };

  // Handle delete tenant
  const handleDeleteTenant = async id => {
    try {
      await onDeleteTenant(id);
      setConfirmDelete(null);
    } catch (err) {
      // Error handled by Redux
    }
  };

  // Handle activate/deactivate
  const handleToggleStatus = async tenant => {
    if (tenant.status === 'active') {
      await onDeactivateTenant(tenant.id);
    } else {
      await onActivateTenant(tenant.id);
    }
    onFetchTenants();
  };

  // Copy to clipboard
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // Format date
  const formatDate = dateStr => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // ── Credentials View ────────────────────────────────────────
  if (view === 'credentials' && createAdminResult) {
    const tenantUrl = credentialsTenant
      ? `https://${credentialsTenant.subdomain}.street2ivy.com`
      : '';

    return (
      <div className={css.panel}>
        <div className={css.panelHeader}>
          <h2 className={css.panelTitle}>Tenant Admin Created Successfully</h2>
        </div>

        <div className={css.credentialsCard}>
          <p className={css.credentialsIntro}>
            Share these credentials with the school administrator. They can use them to log in and
            manage their institution's portal.
          </p>

          <div className={css.credentialRow}>
            <span className={css.credentialLabel}>Tenant URL:</span>
            <code className={css.credentialValue}>{tenantUrl}</code>
            <button
              className={css.copyButton}
              onClick={() => handleCopy(tenantUrl, 'url')}
              title="Copy URL"
            >
              {copied === 'url' ? '✓' : '📋'}
            </button>
          </div>

          <div className={css.credentialRow}>
            <span className={css.credentialLabel}>Admin Email:</span>
            <code className={css.credentialValue}>{createAdminResult.email}</code>
            <button
              className={css.copyButton}
              onClick={() => handleCopy(createAdminResult.email, 'email')}
              title="Copy email"
            >
              {copied === 'email' ? '✓' : '📋'}
            </button>
          </div>

          <div className={css.credentialRow}>
            <span className={css.credentialLabel}>Temp Password:</span>
            <code className={css.credentialValue}>{createAdminResult.tempPassword}</code>
            <button
              className={css.copyButton}
              onClick={() => handleCopy(createAdminResult.tempPassword, 'password')}
              title="Copy password"
            >
              {copied === 'password' ? '✓' : '📋'}
            </button>
          </div>

          <div className={css.credentialsWarning}>
            Save these credentials now — the temporary password cannot be retrieved later. The admin
            should change their password after first login.
          </div>
        </div>

        <div className={css.tenantFormActions}>
          <button
            className={css.tenantCancelBtn}
            onClick={() => {
              onClearTenantState();
              setView('list');
            }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Create Admin Form (inline modal) ────────────────────────
  if (createAdminFor) {
    return (
      <div className={css.panel}>
        <div className={css.panelHeader}>
          <h2 className={css.panelTitle}>Create Admin for {createAdminFor.name}</h2>
        </div>

        <p style={{ color: 'var(--colorGrey600)', marginBottom: '24px' }}>
          Create an educational admin user who will manage this tenant's portal. They'll receive
          a temporary password to log in.
        </p>

        {createAdminError && (
          <div className={css.tenantFormError}>
            {createAdminError?.message || 'Failed to create admin. Please try again.'}
          </div>
        )}

        <form onSubmit={handleCreateAdmin}>
          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Email *</label>
            <input
              className={css.tenantFormInput}
              type="email"
              value={adminForm.email}
              onChange={e => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder={`admin@${createAdminFor.institutionDomain || 'school.edu'}`}
              required
            />
          </div>
          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>First Name *</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={adminForm.firstName}
              onChange={e => setAdminForm(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Jane"
              required
            />
          </div>
          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Last Name *</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={adminForm.lastName}
              onChange={e => setAdminForm(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Smith"
              required
            />
          </div>
          <div className={css.tenantFormActions}>
            <button
              type="button"
              className={css.tenantCancelBtn}
              onClick={() => {
                setCreateAdminFor(null);
                setAdminForm({ email: '', firstName: '', lastName: '' });
                onClearTenantState();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={css.tenantSubmitBtn}
              disabled={createAdminInProgress}
            >
              {createAdminInProgress ? 'Creating...' : 'Create Admin & Generate Password'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Create Tenant Form ──────────────────────────────────────
  if (view === 'create') {
    return (
      <div className={css.panel}>
        <div className={css.panelHeader}>
          <h2 className={css.panelTitle}>Create New Tenant</h2>
        </div>

        <p className={css.tenantFormIntro}>
          Set up a new white-label portal for an educational institution. Each tenant gets their own
          subdomain (e.g., <strong>harvard.street2ivy.com</strong>) with a separate Sharetribe
          marketplace. After creating the tenant, you can create an admin account and share the
          login credentials with the school.
        </p>

        {createError && (
          <div className={css.tenantFormError}>
            {createError?.message || 'Failed to create tenant. Please check your inputs.'}
          </div>
        )}

        <form onSubmit={handleCreateTenant}>
          <div className={css.tenantFormSection}>School Information</div>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>School Name *</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={formData.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Harvard University"
              required
            />
            <span className={css.tenantFormHint}>
              The full name of the institution. This will be used to auto-generate the subdomain and
              display name.
            </span>
          </div>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Subdomain *</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={formData.subdomain}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                }))
              }
              placeholder="harvard"
              required
            />
            <span className={css.tenantFormHint}>
              {formData.subdomain
                ? `This tenant will be accessible at: ${formData.subdomain}.street2ivy.com`
                : 'The subdomain for this institution (e.g., "harvard" for harvard.street2ivy.com)'}
            </span>
          </div>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Institution Email Domain</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={formData.institutionDomain}
              onChange={e => setFormData(prev => ({ ...prev, institutionDomain: e.target.value }))}
              placeholder="harvard.edu"
            />
            <span className={css.tenantFormHint}>
              The school's email domain (e.g., "harvard.edu"). Used to verify student email
              addresses belong to this institution.
            </span>
          </div>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Display Name</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={formData.displayName}
              onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Street2Ivy at Harvard University"
            />
            <span className={css.tenantFormHint}>
              The marketplace name shown in the header and page titles. Auto-generated from school
              name.
            </span>
          </div>

          <div className={css.tenantFormSection}>Sharetribe Credentials</div>
          <p className={css.tenantFormSectionDesc}>
            Each tenant requires its own Sharetribe marketplace account. You can find these
            credentials in the Sharetribe Console under{' '}
            <strong>Build &rarr; Applications</strong>.
          </p>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Client ID *</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={formData.clientId}
              onChange={e => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="e.g., 0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d"
              required
            />
            <span className={css.tenantFormHint}>
              Found in Sharetribe Console &rarr; Build &rarr; Applications. Required for user login
              and marketplace functionality.
            </span>
          </div>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Client Secret</label>
            <input
              className={css.tenantFormInput}
              type="password"
              value={formData.clientSecret}
              onChange={e => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
              placeholder="Enter client secret"
            />
            <span className={css.tenantFormHint}>
              Optional but recommended. Enables server-side trusted operations like password reset
              and admin user creation.
            </span>
          </div>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Integration Client ID</label>
            <input
              className={css.tenantFormInput}
              type="text"
              value={formData.integrationClientId}
              onChange={e =>
                setFormData(prev => ({ ...prev, integrationClientId: e.target.value }))
              }
              placeholder="e.g., 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
            />
            <span className={css.tenantFormHint}>
              Found in Sharetribe Console &rarr; Build &rarr; Applications (Integration API section).
              Enables admin features like user search and bulk operations.
            </span>
          </div>

          <div className={css.tenantFormRow}>
            <label className={css.tenantFormLabel}>Integration Client Secret</label>
            <input
              className={css.tenantFormInput}
              type="password"
              value={formData.integrationClientSecret}
              onChange={e =>
                setFormData(prev => ({ ...prev, integrationClientSecret: e.target.value }))
              }
              placeholder="Enter integration client secret"
            />
            <span className={css.tenantFormHint}>
              Required along with Integration Client ID for server-to-server admin operations.
            </span>
          </div>

          <div className={css.tenantFormSection}>Tenant Settings</div>

          <div className={css.tenantFormCheckboxRow}>
            <label className={css.tenantFormCheckboxLabel}>
              <input
                type="checkbox"
                checked={formData.requireCorporateApproval}
                onChange={e =>
                  setFormData(prev => ({ ...prev, requireCorporateApproval: e.target.checked }))
                }
              />
              Require corporate partner approval
            </label>
            <span className={css.tenantFormCheckboxHint}>
              When enabled, corporate partners who sign up on this tenant's site must be manually
              approved by an administrator before they can search for students, view profiles,
              or post projects. This helps maintain quality control over which companies can
              access the talent pool. When disabled, corporate partners have immediate access
              upon registration.
            </span>
          </div>

          <div className={css.tenantFormActions}>
            <button
              type="button"
              className={css.tenantCancelBtn}
              onClick={() => setView('list')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={css.tenantSubmitBtn}
              disabled={createInProgress}
            >
              {createInProgress ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────
  return (
    <div className={css.panel}>
      <div className={css.panelHeader}>
        <h2 className={css.panelTitle}>Tenant Management</h2>
        <button className={css.tenantCreateButton} onClick={handleShowCreateForm}>
          + Create New Tenant
        </button>
      </div>

      {fetchInProgress ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--colorGrey600)' }}>
          Loading tenants...
        </p>
      ) : tenants.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--colorGrey600)' }}>
          No tenants found. Create your first tenant to get started.
        </p>
      ) : (
        <div className={css.tableContainer}>
          <table className={css.tenantsTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Subdomain</th>
                <th>Status</th>
                <th>Credentials</th>
                <th>Partners</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(tenant => {
                const isDefault = tenant.id === 'default';
                const isActive = tenant.status === 'active';
                const hasCredentials =
                  tenant.sharetribe?.hasClientSecret && tenant.sharetribe?.hasIntegrationCredentials;

                return (
                  <tr key={tenant.id}>
                    <td>
                      <strong>{tenant.name}</strong>
                      {isDefault && (
                        <span className={css.tenantDefaultBadge}>DEFAULT</span>
                      )}
                    </td>
                    <td>
                      <code className={css.tenantSubdomain}>{tenant.subdomain}</code>
                    </td>
                    <td>
                      <span
                        className={classNames(css.tenantStatusBadge, {
                          [css.tenantStatusActive]: isActive,
                          [css.tenantStatusInactive]: !isActive,
                        })}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {hasCredentials ? (
                        <span className={css.tenantCredentialOk} title="All credentials configured">
                          ✓ Complete
                        </span>
                      ) : (
                        <span
                          className={css.tenantCredentialMissing}
                          title="Missing some credentials"
                        >
                          ⚠ Incomplete
                        </span>
                      )}
                    </td>
                    <td>{tenant.corporatePartnerIds?.length || 0}</td>
                    <td>{formatDate(tenant.createdAt)}</td>
                    <td className={css.tenantActions}>
                      {!isDefault && (
                        <>
                          <button
                            className={css.tenantActionBtn}
                            onClick={() => handleToggleStatus(tenant)}
                            disabled={actionInProgress === tenant.id}
                            title={isActive ? 'Deactivate' : 'Activate'}
                          >
                            {actionInProgress === tenant.id
                              ? '...'
                              : isActive
                              ? 'Deactivate'
                              : 'Activate'}
                          </button>
                          <button
                            className={css.tenantActionBtnDanger}
                            onClick={() => setConfirmDelete(tenant)}
                            disabled={actionInProgress === tenant.id}
                            title="Delete tenant"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      <button
                        className={css.tenantActionBtnPrimary}
                        onClick={() => {
                          setCreateAdminFor(tenant);
                          setAdminForm({
                            email: '',
                            firstName: '',
                            lastName: '',
                          });
                          onClearTenantState();
                        }}
                        title="Create an educational admin for this tenant"
                      >
                        Create Admin
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className={css.confirmModal}>
          <div className={css.confirmModalContent}>
            <h3>Delete Tenant</h3>
            <p>
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action
              cannot be undone.
            </p>
            <div className={css.confirmActions}>
              <button
                className={css.tenantCancelBtn}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className={css.tenantActionBtnDanger}
                onClick={() => handleDeleteTenant(confirmDelete.id)}
                disabled={actionInProgress === confirmDelete.id}
              >
                {actionInProgress === confirmDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    // Tenants
    tenants,
    fetchTenantsInProgress,
    createTenantInProgress,
    createTenantError,
    createTenantSuccess,
    tenantActionInProgress,
    createTenantAdminInProgress,
    createTenantAdminError,
    createTenantAdminResult,
    onFetchTenants,
    onCreateTenant,
    onDeleteTenant,
    onActivateTenant,
    onDeactivateTenant,
    onCreateTenantAdmin,
    onClearTenantState,
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
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'coaching' })}
              onClick={() => handleTabChange('coaching')}
            >
              AI Coaching
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'waitlist' })}
              onClick={() => handleTabChange('waitlist')}
            >
              Student Waitlist
            </button>
            <button
              className={classNames(css.tab, { [css.tabActive]: activeTab === 'tenants' })}
              onClick={() => handleTabChange('tenants')}
            >
              Tenants
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
              onNavigateToUsersWithSearch={(searchTerm, userType) => {
                setActiveTab('users');
                // Set filters and trigger search after tab change
                setTimeout(() => {
                  const searchInput = document.querySelector('input[placeholder*="Search by name"]');
                  if (searchInput) {
                    searchInput.value = searchTerm;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }, 100);
              }}
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


          {activeTab === 'coaching' && (
            <AICoachingConfigPanel />
          )}

          {activeTab === 'waitlist' && (
            <StudentWaitlistPanel />
          )}

          {activeTab === 'tenants' && (
            <TenantsPanel
              tenants={tenants}
              fetchInProgress={fetchTenantsInProgress}
              createInProgress={createTenantInProgress}
              createError={createTenantError}
              createSuccess={createTenantSuccess}
              actionInProgress={tenantActionInProgress}
              createAdminInProgress={createTenantAdminInProgress}
              createAdminError={createTenantAdminError}
              createAdminResult={createTenantAdminResult}
              onFetchTenants={onFetchTenants}
              onCreateTenant={onCreateTenant}
              onDeleteTenant={onDeleteTenant}
              onActivateTenant={onActivateTenant}
              onDeactivateTenant={onDeactivateTenant}
              onCreateTenantAdmin={onCreateTenantAdmin}
              onClearTenantState={onClearTenantState}
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
    // Tenants
    tenants,
    fetchTenantsInProgress,
    fetchTenantsError,
    createTenantInProgress,
    createTenantError,
    createTenantSuccess,
    tenantActionInProgress,
    createTenantAdminInProgress,
    createTenantAdminError,
    createTenantAdminResult,
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
    // Tenants
    tenants,
    fetchTenantsInProgress,
    createTenantInProgress,
    createTenantError,
    createTenantSuccess,
    tenantActionInProgress,
    createTenantAdminInProgress,
    createTenantAdminError,
    createTenantAdminResult,
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
  // Tenants
  onFetchTenants: () => dispatch(fetchTenants()),
  onCreateTenant: data => dispatch(createTenantAction(data)),
  onDeleteTenant: id => dispatch(deleteTenantAction(id)),
  onActivateTenant: id => dispatch(activateTenantAction(id)),
  onDeactivateTenant: id => dispatch(deactivateTenantAction(id)),
  onCreateTenantAdmin: (tenantId, data) => dispatch(createTenantAdminAction(tenantId, data)),
  onClearTenantState: () => dispatch(clearTenantState()),
});

const AdminDashboardPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(AdminDashboardPageComponent);

export default AdminDashboardPage;
