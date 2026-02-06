import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';

import { Page, LayoutSingleColumn, PaginationLinks, AvatarMedium, Modal, NamedLink } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import {
  fetchDashboard,
  fetchStudentTransactions,
  clearStudentTransactions,
  sendEducationalAdminMessage,
  fetchEducationalAdminMessages,
  clearMessageState,
} from './EducationDashboardPage.duck';

import css from './EducationDashboardPage.module.css';

// ================ Report Generation Helpers ================ //

const generateCSV = (data, headers, filename) => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const value = row[h.key] ?? '';
      // Escape quotes and wrap in quotes if contains comma
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const generateStudentReportData = (students) => {
  return students.map(student => {
    const publicData = student.attributes?.profile?.publicData || {};
    const activity = student.activity || {};
    return {
      name: student.attributes?.profile?.displayName || 'Unknown',
      major: publicData.major || '',
      graduationYear: publicData.graduationYear || '',
      applications: activity.applications || 0,
      acceptances: activity.acceptances || 0,
      declines: activity.declines || 0,
      completions: activity.completions || 0,
      pending: activity.pending || 0,
      invitations: activity.invitations || 0,
    };
  });
};

// ================ Messages Panel ================ //

const MessagesPanel = props => {
  const {
    students,
    sentMessages,
    receivedMessages,
    messagesInProgress,
    sendInProgress,
    sendSuccess,
    sendError,
    onSendMessage,
    onFetchMessages,
    onClearMessageState,
  } = props;

  const intl = useIntl();

  const [messageTab, setMessageTab] = useState('received');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [messageData, setMessageData] = useState({
    recipientType: 'all-students',
    recipientId: '',
    subject: '',
    content: '',
  });

  useEffect(() => {
    onFetchMessages();
  }, [onFetchMessages]);

  useEffect(() => {
    if (sendSuccess) {
      setMessageData({
        recipientType: 'all-students',
        recipientId: '',
        subject: '',
        content: '',
      });
      setShowCompose(false);
      onFetchMessages();
      const timer = setTimeout(() => onClearMessageState(), 5000);
      return () => clearTimeout(timer);
    }
  }, [sendSuccess, onFetchMessages, onClearMessageState]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!messageData.subject || !messageData.content) return;

    try {
      await onSendMessage({
        recipientType: messageData.recipientType,
        recipientId: messageData.recipientType === 'student' ? messageData.recipientId : null,
        subject: messageData.subject,
        content: messageData.content,
      });
    } catch (err) {
      console.error('Send message failed:', err);
    }
  };

  const handleSort = key => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortMessages = messages => {
    if (!sortConfig.key) return messages;
    return [...messages].sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === 'date') {
        aVal = new Date(a.sentAt || a.receivedAt);
        bVal = new Date(b.sentAt || b.receivedAt);
      } else if (sortConfig.key === 'sender') {
        aVal = (a.senderName || '').toLowerCase();
        bVal = (b.senderName || '').toLowerCase();
      } else if (sortConfig.key === 'recipient') {
        aVal = (a.recipientName || a.recipientType || '').toLowerCase();
        bVal = (b.recipientName || b.recipientType || '').toLowerCase();
      } else if (sortConfig.key === 'subject') {
        aVal = (a.subject || '').toLowerCase();
        bVal = (b.subject || '').toLowerCase();
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getSortIndicator = key => {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const currentMessages = messageTab === 'received' ? receivedMessages : sentMessages;
  const sortedMessages = sortMessages(currentMessages);

  return (
    <div className={css.messagesContainer}>
      {/* Message Actions Bar */}
      <div className={css.messagesActionBar}>
        <div className={css.messageTabs}>
          <button
            className={`${css.messageTabBtn} ${messageTab === 'received' ? css.activeMessageTab : ''}`}
            onClick={() => { setMessageTab('received'); setSelectedMessage(null); }}
          >
            Inbox ({receivedMessages.length})
          </button>
          <button
            className={`${css.messageTabBtn} ${messageTab === 'sent' ? css.activeMessageTab : ''}`}
            onClick={() => { setMessageTab('sent'); setSelectedMessage(null); }}
          >
            Sent ({sentMessages.length})
          </button>
        </div>
        <button
          className={css.composeButton}
          onClick={() => { setShowCompose(true); setSelectedMessage(null); }}
        >
          + Compose Message
        </button>
      </div>

      {sendSuccess && (
        <div className={css.successMessage}>
          <FormattedMessage id="EducationDashboardPage.messageSent" />
        </div>
      )}

      {sendError && (
        <div className={css.errorMessage}>
          {sendError.message || <FormattedMessage id="EducationDashboardPage.messageError" />}
        </div>
      )}

      {/* Compose Message Form */}
      {showCompose && (
        <div className={css.composeSection}>
          <div className={css.composeSectionHeader}>
            <h3 className={css.sectionTitle}>Compose Message</h3>
            <button className={css.closeComposeBtn} onClick={() => setShowCompose(false)}>×</button>
          </div>
          <form className={css.messageForm} onSubmit={handleSubmit}>
            <div className={css.formField}>
              <label>To</label>
              <select
                value={messageData.recipientType}
                onChange={e => setMessageData(prev => ({ ...prev, recipientType: e.target.value, recipientId: '' }))}
              >
                <option value="all-students">
                  {intl.formatMessage({ id: 'EducationDashboardPage.messageRecipientAll' })}
                </option>
                <option value="system-admin">
                  {intl.formatMessage({ id: 'EducationDashboardPage.messageRecipientAdmin' })}
                </option>
                {students.map(student => (
                  <option key={student.id} value={`student-${student.id}`}>
                    {student.attributes.profile.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className={css.formField}>
              <label>Subject</label>
              <input
                type="text"
                value={messageData.subject}
                onChange={e => setMessageData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter subject..."
                required
              />
            </div>

            <div className={css.formField}>
              <label>Message</label>
              <textarea
                value={messageData.content}
                onChange={e => setMessageData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your message..."
                rows={5}
                required
              />
            </div>

            <div className={css.composeActions}>
              <button type="button" className={css.cancelButton} onClick={() => setShowCompose(false)}>
                Cancel
              </button>
              <button type="submit" className={css.sendButton} disabled={sendInProgress}>
                {sendInProgress ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Messages Table */}
      {!showCompose && !selectedMessage && (
        <div className={css.messagesTableContainer}>
          {messagesInProgress ? (
            <div className={css.loading}>Loading messages...</div>
          ) : sortedMessages.length === 0 ? (
            <div className={css.noMessages}>
              {messageTab === 'received'
                ? 'No messages received yet.'
                : 'No messages sent yet.'}
            </div>
          ) : (
            <table className={css.messagesTable}>
              <thead>
                <tr>
                  <th
                    className={css.sortableHeader}
                    onClick={() => handleSort('date')}
                  >
                    Date{getSortIndicator('date')}
                  </th>
                  <th
                    className={css.sortableHeader}
                    onClick={() => handleSort(messageTab === 'received' ? 'sender' : 'recipient')}
                  >
                    {messageTab === 'received' ? 'From' : 'To'}{getSortIndicator(messageTab === 'received' ? 'sender' : 'recipient')}
                  </th>
                  <th
                    className={css.sortableHeader}
                    onClick={() => handleSort('subject')}
                  >
                    Subject{getSortIndicator('subject')}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedMessages.map(msg => (
                  <tr key={msg.id} className={`${css.messageRow} ${!msg.read ? css.unreadMessage : ''}`}>
                    <td className={css.messageDateCell}>
                      {new Date(msg.sentAt || msg.receivedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className={css.messageSenderCell}>
                      {messageTab === 'received'
                        ? (msg.senderName || 'Unknown')
                        : (msg.recipientType === 'all-students' ? 'All Students' :
                           msg.recipientType === 'system-admin' ? 'Street2Ivy Support' :
                           msg.recipientName || 'Unknown')}
                    </td>
                    <td className={css.messageSubjectCell}>
                      <span className={css.subjectText}>{msg.subject}</span>
                      <span className={css.messagePreviewInline}>
                        {msg.content.length > 50 ? ` - ${msg.content.substring(0, 50)}...` : ` - ${msg.content}`}
                      </span>
                    </td>
                    <td>
                      <button
                        className={css.viewMessageBtn}
                        onClick={() => setSelectedMessage(msg)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Message Detail View */}
      {selectedMessage && !showCompose && (
        <div className={css.messageDetailView}>
          <button className={css.backToListBtn} onClick={() => setSelectedMessage(null)}>
            ← Back to {messageTab === 'received' ? 'Inbox' : 'Sent'}
          </button>
          <div className={css.messageDetailCard}>
            <div className={css.messageDetailHeader}>
              <h3 className={css.messageDetailSubject}>{selectedMessage.subject}</h3>
              <span className={css.messageDetailDate}>
                {new Date(selectedMessage.sentAt || selectedMessage.receivedAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className={css.messageDetailMeta}>
              {messageTab === 'received' ? (
                <p><strong>From:</strong> {selectedMessage.senderName || 'Unknown'}</p>
              ) : (
                <p><strong>To:</strong> {
                  selectedMessage.recipientType === 'all-students' ? 'All Students' :
                  selectedMessage.recipientType === 'system-admin' ? 'Street2Ivy Support' :
                  selectedMessage.recipientName || 'Unknown'
                }</p>
              )}
            </div>
            <div className={css.messageDetailBody}>
              {selectedMessage.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ================ Main Component ================ //

const EducationDashboardPageComponent = props => {
  const {
    scrollingDisabled,
    currentUser,
    stats,
    students,
    institutionName,
    institutionDomain,
    subscriptionStatus,
    pagination,
    fetchInProgress,
    fetchError,
    selectedStudent,
    studentTransactions,
    studentTransactionsInProgress,
    sentMessages,
    receivedMessages,
    messagesInProgress,
    sendInProgress,
    sendSuccess,
    sendError,
    onFetchDashboard,
    onFetchStudentTransactions,
    onClearStudentTransactions,
    onSendMessage,
    onFetchMessages,
    onClearMessageState,
    onManageDisableScrolling,
  } = props;

  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Access check: only educational admins can access this page
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const isEducationalAdmin = publicData?.userType === 'educational-admin';

  const handleViewStudent = useCallback(
    student => {
      onFetchStudentTransactions(student.id, {});
      setIsModalOpen(true);
    },
    [onFetchStudentTransactions]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    onClearStudentTransactions();
  }, [onClearStudentTransactions]);

  const handlePageChange = page => {
    const params = new URLSearchParams(location.search);
    params.set('page', page);
    history.push({ pathname: '/education/dashboard', search: params.toString() });
    onFetchDashboard({ page });
  };

  const title = intl.formatMessage({ id: 'EducationDashboardPage.title' });

  // Access control
  if (currentUser && !isEducationalAdmin) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.noAccess}>
            <h1>
              <FormattedMessage id="EducationDashboardPage.noAccessTitle" />
            </h1>
            <p>
              <FormattedMessage id="EducationDashboardPage.noAccessMessage" />
            </p>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  // Filter students by search term
  const filteredStudents = searchTerm
    ? students.filter(s => {
        const displayName = s.attributes.profile.displayName?.toLowerCase() || '';
        const major = s.attributes.profile.publicData?.major?.toLowerCase() || '';
        const university = s.attributes.profile.publicData?.university?.toLowerCase() || '';
        const term = searchTerm.toLowerCase();
        return displayName.includes(term) || major.includes(term) || university.includes(term);
      })
    : students;

  const getStatusClass = status => {
    switch (status) {
      case 'applied':
        return css.statusApplied;
      case 'accepted':
        return css.statusAccepted;
      case 'declined':
        return css.statusDeclined;
      case 'completed':
        return css.statusCompleted;
      case 'reviewed':
        return css.statusReviewed;
      default:
        return '';
    }
  };

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          <div className={css.pageHeader}>
            <h1 className={css.pageHeading}>
              <FormattedMessage id="EducationDashboardPage.heading" />
            </h1>

            {institutionName && (
              <p className={css.institutionInfo}>
                <FormattedMessage
                  id="EducationDashboardPage.institutionInfo"
                  values={{
                    institution: <strong>{institutionName}</strong>,
                    domain: <span className={css.institutionDomain}>@{institutionDomain}</span>,
                  }}
                />
              </p>
            )}

            {/* Subscription Status Banner */}
            {subscriptionStatus && (
              <div className={css.subscriptionStatusBanner}>
                <div className={css.subscriptionStatusItems}>
                  <div className={`${css.subscriptionStatusItem} ${subscriptionStatus.depositPaid ? css.statusActive : css.statusInactive}`}>
                    <span className={css.statusIcon}>{subscriptionStatus.depositPaid ? '✅' : '⏳'}</span>
                    <span className={css.statusLabel}>
                      <FormattedMessage id="EducationDashboardPage.depositStatus" />
                    </span>
                    <span className={css.statusValue}>
                      {subscriptionStatus.depositPaid
                        ? <FormattedMessage id="EducationDashboardPage.depositPaid" />
                        : <FormattedMessage id="EducationDashboardPage.depositPending" />
                      }
                    </span>
                  </div>
                  <div className={`${css.subscriptionStatusItem} ${subscriptionStatus.aiCoachingApproved ? css.statusActive : css.statusInactive}`}>
                    <span className={css.statusIcon}>{subscriptionStatus.aiCoachingApproved ? '✅' : '⏳'}</span>
                    <span className={css.statusLabel}>
                      <FormattedMessage id="EducationDashboardPage.aiCoachingStatus" />
                    </span>
                    <span className={css.statusValue}>
                      {subscriptionStatus.aiCoachingApproved
                        ? <FormattedMessage id="EducationDashboardPage.aiCoachingApproved" />
                        : <FormattedMessage id="EducationDashboardPage.aiCoachingPending" />
                      }
                    </span>
                  </div>
                </div>
                {(!subscriptionStatus.depositPaid || !subscriptionStatus.aiCoachingApproved) && (
                  <p className={css.subscriptionNote}>
                    <FormattedMessage id="EducationDashboardPage.subscriptionNote" />
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className={css.tabs}>
            <button
              className={`${css.tab} ${activeTab === 'overview' ? css.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <FormattedMessage id="EducationDashboardPage.tabOverview" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'students' ? css.activeTab : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <FormattedMessage id="EducationDashboardPage.tabStudents" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'reports' ? css.activeTab : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <FormattedMessage id="EducationDashboardPage.tabReports" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'messages' ? css.activeTab : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              <FormattedMessage id="EducationDashboardPage.tabMessages" />
            </button>
          </div>

          {/* Loading State */}
          {fetchInProgress && (
            <div className={css.loading}>
              <FormattedMessage id="EducationDashboardPage.loading" />
            </div>
          )}

          {/* Error State */}
          {fetchError && (
            <div className={css.error}>
              <FormattedMessage id="EducationDashboardPage.fetchError" />
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && !fetchInProgress && stats && (
            <div className={css.statsSection}>
              <h2 className={css.statsSectionTitle}>
                <FormattedMessage id="EducationDashboardPage.statsTitle" />
              </h2>

              {/* Primary Stats - Clickable Cards */}
              <div className={css.statsGrid}>
                <button
                  type="button"
                  className={css.statCardClickable}
                  onClick={() => setActiveTab('students')}
                  title="Click to view all students"
                >
                  <div className={css.statValue}>{stats.totalStudents}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statStudents" />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.activeStudents || 0} active
                  </div>
                </button>
                <button
                  type="button"
                  className={css.statCardClickable}
                  onClick={() => setActiveTab('reports')}
                  title="Click to view detailed reports"
                >
                  <div className={css.statValue}>{stats.projectsApplied}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statApplied" />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.projectsPending || 0} pending
                  </div>
                </button>
                <button
                  type="button"
                  className={`${css.statCardClickable} ${css.statCardSuccess}`}
                  onClick={() => setActiveTab('reports')}
                  title="Click to view placement details"
                >
                  <div className={css.statValue}>{stats.projectsAccepted || 0}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statAccepted" />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.acceptanceRate || 0}% acceptance rate
                  </div>
                </button>
                <button
                  type="button"
                  className={`${css.statCardClickable} ${css.statCardWarning}`}
                  onClick={() => setActiveTab('reports')}
                  title="Click to view decline details"
                >
                  <div className={css.statValue}>{stats.projectsDeclined}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statDeclined" />
                  </div>
                </button>
                <button
                  type="button"
                  className={`${css.statCardClickable} ${css.statCardComplete}`}
                  onClick={() => setActiveTab('reports')}
                  title="Click to view completed projects"
                >
                  <div className={css.statValue}>{stats.projectsCompleted}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statCompleted" />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.completionRate || 0}% completion rate
                  </div>
                </button>
              </div>

              {/* Secondary Stats Row */}
              <h3 className={css.secondaryStatsTitle}>
                <FormattedMessage id="EducationDashboardPage.engagementMetrics" />
              </h3>
              <div className={css.secondaryStatsGrid}>
                <div className={css.secondaryStatCard}>
                  <div className={css.secondaryStatIcon}>🎯</div>
                  <div className={css.secondaryStatContent}>
                    <div className={css.secondaryStatValue}>{stats.invitationsReceived || 0}</div>
                    <div className={css.secondaryStatLabel}>
                      <FormattedMessage id="EducationDashboardPage.statInvitations" />
                    </div>
                  </div>
                </div>
                <div className={css.secondaryStatCard}>
                  <div className={css.secondaryStatIcon}>🏢</div>
                  <div className={css.secondaryStatContent}>
                    <div className={css.secondaryStatValue}>{stats.uniqueCompanies || 0}</div>
                    <div className={css.secondaryStatLabel}>
                      <FormattedMessage id="EducationDashboardPage.statCompanies" />
                    </div>
                  </div>
                </div>
                <div className={css.secondaryStatCard}>
                  <div className={css.secondaryStatIcon}>📈</div>
                  <div className={css.secondaryStatContent}>
                    <div className={css.secondaryStatValue}>{stats.acceptanceRate || 0}%</div>
                    <div className={css.secondaryStatLabel}>
                      <FormattedMessage id="EducationDashboardPage.statAcceptanceRate" />
                    </div>
                  </div>
                </div>
                <div className={css.secondaryStatCard}>
                  <div className={css.secondaryStatIcon}>✅</div>
                  <div className={css.secondaryStatContent}>
                    <div className={css.secondaryStatValue}>{stats.completionRate || 0}%</div>
                    <div className={css.secondaryStatLabel}>
                      <FormattedMessage id="EducationDashboardPage.statCompletionRate" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className={css.quickActionsSection}>
                <h3 className={css.quickActionsTitle}>
                  <FormattedMessage id="EducationDashboardPage.quickActions" />
                </h3>
                <div className={css.quickActionsGrid}>
                  <button
                    type="button"
                    className={css.quickActionButton}
                    onClick={() => setActiveTab('students')}
                  >
                    <span className={css.quickActionIcon}>👥</span>
                    <span className={css.quickActionText}>
                      <FormattedMessage id="EducationDashboardPage.viewStudents" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={css.quickActionButton}
                    onClick={() => setActiveTab('reports')}
                  >
                    <span className={css.quickActionIcon}>📊</span>
                    <span className={css.quickActionText}>
                      <FormattedMessage id="EducationDashboardPage.downloadReports" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={css.quickActionButton}
                    onClick={() => setActiveTab('messages')}
                  >
                    <span className={css.quickActionIcon}>✉️</span>
                    <span className={css.quickActionText}>
                      <FormattedMessage id="EducationDashboardPage.sendMessage" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && !fetchInProgress && (
            <div className={css.studentsSection}>
              <div className={css.sectionHeader}>
                <h2 className={css.sectionTitle}>
                  <FormattedMessage id="EducationDashboardPage.studentsTitle" />
                </h2>
                <input
                  type="text"
                  className={css.searchInput}
                  placeholder={intl.formatMessage({
                    id: 'EducationDashboardPage.searchPlaceholder',
                  })}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              {filteredStudents.length === 0 ? (
                <div className={css.noResults}>
                  <FormattedMessage id="EducationDashboardPage.noStudents" />
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className={css.desktopTable}>
                    <table className={css.studentsTable}>
                      <thead>
                        <tr>
                          <th>
                            <FormattedMessage id="EducationDashboardPage.tableStudent" />
                          </th>
                          <th>
                            <FormattedMessage id="EducationDashboardPage.tableMajor" />
                          </th>
                          <th>
                            <FormattedMessage id="EducationDashboardPage.tableGradYear" />
                          </th>
                          <th>
                            <FormattedMessage id="EducationDashboardPage.tableApps" />
                          </th>
                          <th>
                            <FormattedMessage id="EducationDashboardPage.tableAccepted" />
                          </th>
                          <th>
                            <FormattedMessage id="EducationDashboardPage.tableActions" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map(student => {
                          const studentPublicData = student.attributes.profile.publicData || {};
                          const activity = student.activity || {};
                          return (
                            <tr key={student.id} className={css.studentRow}>
                              <td>
                                <div className={css.studentInfo}>
                                  <AvatarMedium
                                    user={{
                                      id: { uuid: student.id },
                                      type: 'user',
                                      attributes: student.attributes,
                                      profileImage: student.profileImage
                                        ? {
                                            id: { uuid: student.profileImage.id },
                                            type: 'image',
                                            attributes: student.profileImage.attributes,
                                          }
                                        : null,
                                    }}
                                  />
                                  <NamedLink
                                    className={css.studentNameLink}
                                    name="ProfilePage"
                                    params={{ id: student.id }}
                                    title="View student profile"
                                  >
                                    {student.attributes.profile.displayName}
                                    <span className={css.profileArrow}>→</span>
                                  </NamedLink>
                                </div>
                              </td>
                              <td className={css.studentMeta}>
                                {studentPublicData.major ? (
                                  <button
                                    type="button"
                                    className={css.clickableField}
                                    onClick={() => setSearchTerm(studentPublicData.major)}
                                    title={`Filter by major: ${studentPublicData.major}`}
                                  >
                                    {studentPublicData.major}
                                  </button>
                                ) : '-'}
                              </td>
                              <td className={css.studentMeta}>
                                {studentPublicData.graduationYear ? (
                                  <button
                                    type="button"
                                    className={css.clickableField}
                                    onClick={() => setSearchTerm(String(studentPublicData.graduationYear))}
                                    title={`Filter by graduation year: ${studentPublicData.graduationYear}`}
                                  >
                                    {studentPublicData.graduationYear}
                                  </button>
                                ) : '-'}
                              </td>
                              <td className={css.studentMeta}>
                                <button
                                  type="button"
                                  className={`${css.activityBadge} ${css.activityBadgeClickable}`}
                                  onClick={() => handleViewStudent(student)}
                                  title="View application details"
                                >
                                  {activity.applications || 0}
                                </button>
                              </td>
                              <td className={css.studentMeta}>
                                <button
                                  type="button"
                                  className={`${css.activityBadge} ${activity.acceptances > 0 ? css.activityBadgeSuccess : ''} ${css.activityBadgeClickable}`}
                                  onClick={() => handleViewStudent(student)}
                                  title="View acceptance details"
                                >
                                  {activity.acceptances || 0}
                                </button>
                              </td>
                              <td>
                                <button
                                  className={css.viewButton}
                                  onClick={() => handleViewStudent(student)}
                                >
                                  <FormattedMessage id="EducationDashboardPage.viewDetails" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className={css.studentsCards}>
                    {filteredStudents.map(student => {
                      const studentPublicData = student.attributes.profile.publicData || {};
                      const activity = student.activity || {};
                      return (
                        <div key={student.id} className={css.studentCard}>
                          <div className={css.studentCardHeader}>
                            <div>
                              <NamedLink
                                className={css.studentCardNameLink}
                                name="ProfilePage"
                                params={{ id: student.id }}
                                title="View student profile"
                              >
                                {student.attributes.profile.displayName}
                                <span className={css.profileArrow}>→</span>
                              </NamedLink>
                            </div>
                            <button
                              className={css.viewButton}
                              onClick={() => handleViewStudent(student)}
                            >
                              <FormattedMessage id="EducationDashboardPage.viewDetails" />
                            </button>
                          </div>
                          <div className={css.studentCardDetails}>
                            {studentPublicData.major ? (
                              <button
                                type="button"
                                className={css.clickableFieldSmall}
                                onClick={() => setSearchTerm(studentPublicData.major)}
                                title={`Filter by major: ${studentPublicData.major}`}
                              >
                                {studentPublicData.major}
                              </button>
                            ) : (
                              <span>No major</span>
                            )}
                            <span>Class of {studentPublicData.graduationYear || '-'}</span>
                          </div>
                          <div className={css.studentCardActivity}>
                            <button
                              type="button"
                              className={css.activityItemClickable}
                              onClick={() => handleViewStudent(student)}
                              title="View application details"
                            >
                              {activity.applications || 0} apps
                            </button>
                            <button
                              type="button"
                              className={css.activityItemClickable}
                              onClick={() => handleViewStudent(student)}
                              title="View acceptance details"
                            >
                              {activity.acceptances || 0} accepted
                            </button>
                            <button
                              type="button"
                              className={css.activityItemClickable}
                              onClick={() => handleViewStudent(student)}
                              title="View completion details"
                            >
                              {activity.completions || 0} completed
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <PaginationLinks
                      className={css.pagination}
                      pageName="EducationDashboardPage"
                      pageSearchParams={{}}
                      pagination={{
                        ...pagination,
                        paginationUnsupported: false,
                      }}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && !fetchInProgress && (
            <div className={css.reportsSection}>
              <div className={css.reportsSectionHeader}>
                <h2 className={css.sectionTitle}>
                  <FormattedMessage id="EducationDashboardPage.reportsTitle" />
                </h2>
                <p className={css.reportsDescription}>
                  <FormattedMessage id="EducationDashboardPage.reportsDescription" />
                </p>
              </div>

              {/* Summary Stats Card */}
              <div className={css.reportCard}>
                <div className={css.reportCardHeader}>
                  <h3 className={css.reportCardTitle}>
                    <FormattedMessage id="EducationDashboardPage.summaryReport" />
                  </h3>
                  <button
                    type="button"
                    className={css.downloadButton}
                    onClick={() => {
                      const summaryData = [{
                        metric: 'Total Students',
                        value: stats?.totalStudents || 0,
                      }, {
                        metric: 'Active Students',
                        value: stats?.activeStudents || 0,
                      }, {
                        metric: 'Total Applications',
                        value: stats?.projectsApplied || 0,
                      }, {
                        metric: 'Pending Applications',
                        value: stats?.projectsPending || 0,
                      }, {
                        metric: 'Placements (Accepted)',
                        value: stats?.projectsAccepted || 0,
                      }, {
                        metric: 'Not Selected (Declined)',
                        value: stats?.projectsDeclined || 0,
                      }, {
                        metric: 'Completed Projects',
                        value: stats?.projectsCompleted || 0,
                      }, {
                        metric: 'Invitations Received',
                        value: stats?.invitationsReceived || 0,
                      }, {
                        metric: 'Unique Companies Engaged',
                        value: stats?.uniqueCompanies || 0,
                      }, {
                        metric: 'Acceptance Rate',
                        value: `${stats?.acceptanceRate || 0}%`,
                      }, {
                        metric: 'Completion Rate',
                        value: `${stats?.completionRate || 0}%`,
                      }];
                      generateCSV(summaryData, [
                        { key: 'metric', label: 'Metric' },
                        { key: 'value', label: 'Value' },
                      ], `${institutionName || 'institution'}_summary_report`);
                    }}
                  >
                    <span className={css.downloadIcon}>⬇️</span>
                    <FormattedMessage id="EducationDashboardPage.downloadCSV" />
                  </button>
                </div>
                <div className={css.reportSummaryGrid}>
                  <div className={css.reportSummaryItem}>
                    <span className={css.reportSummaryLabel}>Total Students</span>
                    <span className={css.reportSummaryValue}>{stats?.totalStudents || 0}</span>
                  </div>
                  <div className={css.reportSummaryItem}>
                    <span className={css.reportSummaryLabel}>Active Students</span>
                    <span className={css.reportSummaryValue}>{stats?.activeStudents || 0}</span>
                  </div>
                  <div className={css.reportSummaryItem}>
                    <span className={css.reportSummaryLabel}>Total Applications</span>
                    <span className={css.reportSummaryValue}>{stats?.projectsApplied || 0}</span>
                  </div>
                  <div className={css.reportSummaryItem}>
                    <span className={css.reportSummaryLabel}>Acceptance Rate</span>
                    <span className={css.reportSummaryValue}>{stats?.acceptanceRate || 0}%</span>
                  </div>
                  <div className={css.reportSummaryItem}>
                    <span className={css.reportSummaryLabel}>Completion Rate</span>
                    <span className={css.reportSummaryValue}>{stats?.completionRate || 0}%</span>
                  </div>
                  <div className={css.reportSummaryItem}>
                    <span className={css.reportSummaryLabel}>Companies Engaged</span>
                    <span className={css.reportSummaryValue}>{stats?.uniqueCompanies || 0}</span>
                  </div>
                </div>
              </div>

              {/* Student Activity Report */}
              <div className={css.reportCard}>
                <div className={css.reportCardHeader}>
                  <h3 className={css.reportCardTitle}>
                    <FormattedMessage id="EducationDashboardPage.studentActivityReport" />
                  </h3>
                  <button
                    type="button"
                    className={css.downloadButton}
                    onClick={() => {
                      const reportData = generateStudentReportData(students);
                      generateCSV(reportData, [
                        { key: 'name', label: 'Student Name' },
                        { key: 'major', label: 'Major' },
                        { key: 'graduationYear', label: 'Graduation Year' },
                        { key: 'applications', label: 'Applications' },
                        { key: 'acceptances', label: 'Acceptances' },
                        { key: 'declines', label: 'Declines' },
                        { key: 'completions', label: 'Completions' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'invitations', label: 'Invitations' },
                      ], `${institutionName || 'institution'}_student_activity`);
                    }}
                  >
                    <span className={css.downloadIcon}>⬇️</span>
                    <FormattedMessage id="EducationDashboardPage.downloadCSV" />
                  </button>
                </div>
                <p className={css.reportCardDescription}>
                  <FormattedMessage id="EducationDashboardPage.studentActivityDescription" />
                </p>

                {/* Preview Table */}
                <div className={css.reportPreviewTable}>
                  <table className={css.reportTable}>
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Major</th>
                        <th>Apps</th>
                        <th>Accepted</th>
                        <th>Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.slice(0, 5).map(student => {
                        const publicData = student.attributes?.profile?.publicData || {};
                        const activity = student.activity || {};
                        return (
                          <tr key={student.id}>
                            <td>
                              <NamedLink
                                className={css.reportTableLink}
                                name="ProfilePage"
                                params={{ id: student.id }}
                                title="View student profile"
                              >
                                {student.attributes?.profile?.displayName || 'Unknown'}
                              </NamedLink>
                            </td>
                            <td>
                              {publicData.major ? (
                                <button
                                  type="button"
                                  className={css.clickableFieldSmall}
                                  onClick={() => {
                                    setSearchTerm(publicData.major);
                                    setActiveTab('students');
                                  }}
                                  title={`Filter by major: ${publicData.major}`}
                                >
                                  {publicData.major}
                                </button>
                              ) : '-'}
                            </td>
                            <td>
                              <button
                                type="button"
                                className={css.reportStatClickable}
                                onClick={() => handleViewStudent(student)}
                                title="View application details"
                              >
                                {activity.applications || 0}
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={css.reportStatClickable}
                                onClick={() => handleViewStudent(student)}
                                title="View acceptance details"
                              >
                                {activity.acceptances || 0}
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={css.reportStatClickable}
                                onClick={() => handleViewStudent(student)}
                                title="View completion details"
                              >
                                {activity.completions || 0}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {students.length > 5 && (
                    <p className={css.reportPreviewMore}>
                      + {students.length - 5} more students in full report
                    </p>
                  )}
                </div>
              </div>

              {/* Engagement Report */}
              <div className={css.reportCard}>
                <div className={css.reportCardHeader}>
                  <h3 className={css.reportCardTitle}>
                    <FormattedMessage id="EducationDashboardPage.engagementReport" />
                  </h3>
                  <button
                    type="button"
                    className={css.downloadButton}
                    onClick={() => {
                      // Calculate engagement breakdown
                      const engagedStudents = students.filter(s => (s.activity?.applications || 0) > 0).length;
                      const placedStudents = students.filter(s => (s.activity?.acceptances || 0) > 0).length;
                      const completedStudents = students.filter(s => (s.activity?.completions || 0) > 0).length;
                      const invitedStudents = students.filter(s => (s.activity?.invitations || 0) > 0).length;

                      const engagementData = [{
                        category: 'Total Registered',
                        count: stats?.totalStudents || 0,
                        percentage: '100%',
                      }, {
                        category: 'Applied to Projects',
                        count: engagedStudents,
                        percentage: `${stats?.totalStudents ? Math.round((engagedStudents / stats.totalStudents) * 100) : 0}%`,
                      }, {
                        category: 'Received Placement',
                        count: placedStudents,
                        percentage: `${stats?.totalStudents ? Math.round((placedStudents / stats.totalStudents) * 100) : 0}%`,
                      }, {
                        category: 'Completed Projects',
                        count: completedStudents,
                        percentage: `${stats?.totalStudents ? Math.round((completedStudents / stats.totalStudents) * 100) : 0}%`,
                      }, {
                        category: 'Received Invitations',
                        count: invitedStudents,
                        percentage: `${stats?.totalStudents ? Math.round((invitedStudents / stats.totalStudents) * 100) : 0}%`,
                      }];

                      generateCSV(engagementData, [
                        { key: 'category', label: 'Category' },
                        { key: 'count', label: 'Student Count' },
                        { key: 'percentage', label: 'Percentage' },
                      ], `${institutionName || 'institution'}_engagement_report`);
                    }}
                  >
                    <span className={css.downloadIcon}>⬇️</span>
                    <FormattedMessage id="EducationDashboardPage.downloadCSV" />
                  </button>
                </div>
                <p className={css.reportCardDescription}>
                  <FormattedMessage id="EducationDashboardPage.engagementDescription" />
                </p>

                {/* Engagement Funnel */}
                <div className={css.engagementFunnel}>
                  {(() => {
                    const engagedStudents = students.filter(s => (s.activity?.applications || 0) > 0).length;
                    const placedStudents = students.filter(s => (s.activity?.acceptances || 0) > 0).length;
                    const completedStudents = students.filter(s => (s.activity?.completions || 0) > 0).length;
                    const total = stats?.totalStudents || 1;

                    return (
                      <>
                        <div className={css.funnelItem}>
                          <div className={css.funnelBar} style={{ width: '100%' }}>
                            <span className={css.funnelLabel}>Registered</span>
                            <span className={css.funnelValue}>{stats?.totalStudents || 0}</span>
                          </div>
                        </div>
                        <div className={css.funnelItem}>
                          <div
                            className={`${css.funnelBar} ${css.funnelBarEngaged}`}
                            style={{ width: `${Math.max((engagedStudents / total) * 100, 10)}%` }}
                          >
                            <span className={css.funnelLabel}>Applied</span>
                            <span className={css.funnelValue}>{engagedStudents}</span>
                          </div>
                        </div>
                        <div className={css.funnelItem}>
                          <div
                            className={`${css.funnelBar} ${css.funnelBarPlaced}`}
                            style={{ width: `${Math.max((placedStudents / total) * 100, 10)}%` }}
                          >
                            <span className={css.funnelLabel}>Placed</span>
                            <span className={css.funnelValue}>{placedStudents}</span>
                          </div>
                        </div>
                        <div className={css.funnelItem}>
                          <div
                            className={`${css.funnelBar} ${css.funnelBarCompleted}`}
                            style={{ width: `${Math.max((completedStudents / total) * 100, 10)}%` }}
                          >
                            <span className={css.funnelLabel}>Completed</span>
                            <span className={css.funnelValue}>{completedStudents}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <MessagesPanel
              students={students}
              sentMessages={sentMessages}
              receivedMessages={receivedMessages}
              messagesInProgress={messagesInProgress}
              sendInProgress={sendInProgress}
              sendSuccess={sendSuccess}
              sendError={sendError}
              onSendMessage={onSendMessage}
              onFetchMessages={onFetchMessages}
              onClearMessageState={onClearMessageState}
            />
          )}
        </div>

        {/* Student Transactions Modal */}
        <Modal
          id="StudentTransactionsModal"
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onManageDisableScrolling={onManageDisableScrolling}
          usePortal
        >
          <div className={css.modalContent}>
            <div className={css.modalHeader}>
              <div>
                <h3 className={css.modalTitle}>
                  {selectedStudent?.displayName || 'Student'} - Activity
                </h3>
                <p className={css.modalStudentInfo}>
                  {selectedStudent?.major && `${selectedStudent.major} • `}
                  Class of {selectedStudent?.graduationYear || '-'}
                </p>
              </div>
              <button className={css.closeButton} onClick={handleCloseModal}>
                ×
              </button>
            </div>

            {studentTransactionsInProgress ? (
              <div className={css.loading}>
                <FormattedMessage id="EducationDashboardPage.loadingTransactions" />
              </div>
            ) : studentTransactions.length === 0 ? (
              <div className={css.noTransactions}>
                <FormattedMessage id="EducationDashboardPage.noTransactions" />
              </div>
            ) : (
              <div className={css.transactionsList}>
                {studentTransactions.map(tx => (
                  <div key={tx.id} className={css.transactionItem}>
                    <div className={css.transactionDetails}>
                      {tx.listing?.id ? (
                        <NamedLink
                          className={css.transactionProjectLink}
                          name="ListingPage"
                          params={{ id: tx.listing.id, slug: tx.listing.title?.toLowerCase().replace(/\s+/g, '-') || 'project' }}
                          title="View project listing"
                        >
                          {tx.listing?.title || 'Unknown Project'}
                          <span className={css.profileArrow}>→</span>
                        </NamedLink>
                      ) : (
                        <div className={css.transactionProject}>
                          {tx.listing?.title || 'Unknown Project'}
                        </div>
                      )}
                      {tx.provider?.id ? (
                        <NamedLink
                          className={css.transactionCompanyLink}
                          name="ProfilePage"
                          params={{ id: tx.provider.id }}
                          title="View company profile"
                        >
                          {tx.provider?.companyName || tx.provider?.displayName || 'Unknown Company'}
                        </NamedLink>
                      ) : (
                        <div className={css.transactionCompany}>
                          {tx.provider?.companyName || tx.provider?.displayName || 'Unknown Company'}
                        </div>
                      )}
                      <div className={css.transactionDate}>
                        {new Date(tx.attributes.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      className={`${css.transactionStatus} ${getStatusClass(tx.attributes.state)}`}
                    >
                      {tx.attributes.state}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    stats,
    students,
    institutionName,
    institutionDomain,
    subscriptionStatus,
    pagination,
    fetchInProgress,
    fetchError,
    selectedStudent,
    studentTransactions,
    studentTransactionsInProgress,
    sentMessages,
    receivedMessages,
    messagesInProgress,
    sendInProgress,
    sendSuccess,
    sendError,
  } = state.EducationDashboardPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    stats,
    students,
    institutionName,
    institutionDomain,
    subscriptionStatus: subscriptionStatus || { depositPaid: false, aiCoachingApproved: false },
    pagination,
    fetchInProgress,
    fetchError,
    selectedStudent,
    studentTransactions,
    studentTransactionsInProgress,
    sentMessages: sentMessages || [],
    receivedMessages: receivedMessages || [],
    messagesInProgress: messagesInProgress || false,
    sendInProgress: sendInProgress || false,
    sendSuccess: sendSuccess || false,
    sendError: sendError || null,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchDashboard: params => dispatch(fetchDashboard(params)),
  onFetchStudentTransactions: (studentId, params) =>
    dispatch(fetchStudentTransactions(studentId, params)),
  onClearStudentTransactions: () => dispatch(clearStudentTransactions()),
  onSendMessage: data => dispatch(sendEducationalAdminMessage(data)),
  onFetchMessages: () => dispatch(fetchEducationalAdminMessages()),
  onClearMessageState: () => dispatch(clearMessageState()),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

const EducationDashboardPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EducationDashboardPageComponent);

export default EducationDashboardPage;
