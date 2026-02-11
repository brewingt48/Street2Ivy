import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { fetchAllCompaniesSpending, fetchMyTenantContent, updateMyTenantContent, resetMyTenantContent, searchAlumni, inviteAlumni } from '../../util/api';

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
  fetchPartners,
  partnerAction,
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

// ================ Company Spending Report ================ //

const CompanySpendingReport = () => {
  const [spendingData, setSpendingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllCompaniesSpending()
      .then(data => {
        setSpendingData(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch company spending:', err);
        setError(err);
        setIsLoading(false);
      });
  }, []);

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className={css.reportCard}>
        <div className={css.reportCardHeader}>
          <h3 className={css.reportCardTitle}>
            <FormattedMessage id="EducationDashboardPage.companySpendingReport" defaultMessage="Corporate Partner Investment" />
          </h3>
        </div>
        <p className={css.reportCardDescription}>Loading company spending data...</p>
      </div>
    );
  }

  if (error || !spendingData) {
    return (
      <div className={css.reportCard}>
        <div className={css.reportCardHeader}>
          <h3 className={css.reportCardTitle}>
            <FormattedMessage id="EducationDashboardPage.companySpendingReport" defaultMessage="Corporate Partner Investment" />
          </h3>
        </div>
        <p className={css.reportCardDescription}>Unable to load company spending data.</p>
      </div>
    );
  }

  const { companies, totals, currency } = spendingData;

  return (
    <div className={css.investmentReportCard}>
      <div className={css.investmentReportHeader}>
        <div className={css.investmentReportTitleSection}>
          <span className={css.investmentReportIcon}>💰</span>
          <h3 className={css.investmentReportTitle}>
            <FormattedMessage id="EducationDashboardPage.companySpendingReport" defaultMessage="Corporate Partner Investment" />
          </h3>
        </div>
        <button
          type="button"
          className={css.downloadButton}
          onClick={() => {
            const reportData = companies.map(c => ({
              company: c.companyName,
              totalSpent: formatCurrency(c.totalSpent, currency),
              projects: c.totalProjects,
              completed: c.completedProjects,
            }));
            generateCSV(reportData, [
              { key: 'company', label: 'Company' },
              { key: 'totalSpent', label: 'Total Invested' },
              { key: 'projects', label: 'Projects Posted' },
              { key: 'completed', label: 'Projects Completed' },
            ], 'company_spending_report');
          }}
        >
          <span className={css.downloadIcon}>⬇️</span>
          <FormattedMessage id="EducationDashboardPage.downloadCSV" />
        </button>
      </div>
      <p className={css.investmentReportDescription}>
        <FormattedMessage
          id="EducationDashboardPage.companySpendingDescription"
          defaultMessage="Overview of how much corporate partners have invested in student projects."
        />
      </p>

      {/* Totals Summary - 4 Column Grid */}
      <div className={css.investmentSummaryGrid}>
        <div className={css.investmentSummaryCard}>
          <div className={css.investmentSummaryIconWrapper}>
            <span className={css.investmentSummaryCardIcon}>💵</span>
          </div>
          <div className={css.investmentSummaryContent}>
            <span className={css.investmentSummaryValue}>{formatCurrency(totals.totalSpentAllCompanies, currency)}</span>
            <span className={css.investmentSummaryLabel}>Total Invested</span>
          </div>
        </div>
        <div className={css.investmentSummaryCard}>
          <div className={css.investmentSummaryIconWrapper}>
            <span className={css.investmentSummaryCardIcon}>📋</span>
          </div>
          <div className={css.investmentSummaryContent}>
            <span className={css.investmentSummaryValue}>{totals.totalProjectsAllCompanies}</span>
            <span className={css.investmentSummaryLabel}>Total Projects</span>
          </div>
        </div>
        <div className={css.investmentSummaryCard}>
          <div className={css.investmentSummaryIconWrapper}>
            <span className={css.investmentSummaryCardIcon}>🏢</span>
          </div>
          <div className={css.investmentSummaryContent}>
            <span className={css.investmentSummaryValue}>{totals.totalCompanies}</span>
            <span className={css.investmentSummaryLabel}>Active Companies</span>
          </div>
        </div>
        <div className={css.investmentSummaryCard}>
          <div className={css.investmentSummaryIconWrapper}>
            <span className={css.investmentSummaryCardIcon}>📊</span>
          </div>
          <div className={css.investmentSummaryContent}>
            <span className={css.investmentSummaryValue}>{formatCurrency(totals.avgSpendingPerCompany, currency)}</span>
            <span className={css.investmentSummaryLabel}>Avg. per Company</span>
          </div>
        </div>
      </div>

      {/* Top Companies Table */}
      {companies.length > 0 && (
        <div className={css.investmentTableSection}>
          <h4 className={css.investmentTableTitle}>Top Investing Companies</h4>
          <div className={css.investmentTableWrapper}>
            <table className={css.investmentTable}>
              <thead>
                <tr>
                  <th className={css.investmentTableHeaderLeft}>#</th>
                  <th className={css.investmentTableHeaderLeft}>Company</th>
                  <th className={css.investmentTableHeaderRight}>Total Invested</th>
                  <th className={css.investmentTableHeaderCenter}>Projects</th>
                  <th className={css.investmentTableHeaderCenter}>Completed</th>
                  <th className={css.investmentTableHeaderCenter}>Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.slice(0, 10).map((company, index) => (
                  <tr key={company.companyId} className={css.investmentTableRow}>
                    <td className={css.investmentTableCellRank}>
                      <span className={css.companyRank}>{index + 1}</span>
                    </td>
                    <td className={css.investmentTableCellCompany}>
                      <NamedLink
                        className={css.companyNameLink}
                        name="ProfilePage"
                        params={{ id: company.companyId }}
                        title="View company profile"
                      >
                        {company.companyName}
                        <span className={css.companyLinkArrow}>→</span>
                      </NamedLink>
                    </td>
                    <td className={css.investmentTableCellAmount}>
                      <span className={css.investmentAmount}>{formatCurrency(company.totalSpent, currency)}</span>
                    </td>
                    <td className={css.investmentTableCellCenter}>
                      <span className={css.projectCount}>{company.totalProjects}</span>
                    </td>
                    <td className={css.investmentTableCellCenter}>
                      <span className={css.completedBadge}>{company.completedProjects}</span>
                    </td>
                    <td className={css.investmentTableCellCenter}>
                      <NamedLink
                        className={css.viewCompanyBtn}
                        name="ProfilePage"
                        params={{ id: company.companyId }}
                        title="View company profile"
                      >
                        View Profile
                      </NamedLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {companies.length > 10 && (
            <p className={css.investmentTableMore}>
              + {companies.length - 10} more companies in full report
            </p>
          )}
        </div>
      )}
    </div>
  );
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

// ================ Customize Landing Page Panel ================ //

const CustomizeLandingPanel = ({ institutionDomain }) => {
  const intl = useIntl();
  const [tenantContent, setTenantContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSection, setActiveSection] = useState('branding');
  const [hasChanges, setHasChanges] = useState(false);

  // Editable form state
  const [formState, setFormState] = useState({
    branding: { institutionName: '', tagline: '', logoUrl: '', primaryColor: '#1a1a2e', accentColor: '#e94560' },
    hero: { title: '', subtitle: '', backgroundImageUrl: '' },
    stats: { items: [
      { id: 'stat-1', value: 0, label: 'Students Matched', suffix: '+' },
      { id: 'stat-2', value: 0, label: 'Partner Companies', suffix: '+' },
      { id: 'stat-3', value: 0, label: 'Projects Completed', suffix: '+' },
    ]},
    testimonials: { items: [] },
    cta: { title: '', subtitle: '', buttonText: '', buttonUrl: '' },
    visibility: { showStats: true, showTestimonials: true, showHowItWorks: true, showAICoaching: true, showCTA: true },
  });

  useEffect(() => {
    setIsLoading(true);
    fetchMyTenantContent()
      .then(response => {
        const data = response.data;
        if (data) {
          setTenantContent(data);
          setFormState(prev => ({
            branding: { ...prev.branding, ...(data.branding || {}) },
            hero: { ...prev.hero, ...(data.hero || {}) },
            stats: data.stats || prev.stats,
            testimonials: data.testimonials || prev.testimonials,
            cta: { ...prev.cta, ...(data.cta || {}) },
            visibility: { ...prev.visibility, ...(data.visibility || {}) },
          }));
        }
      })
      .catch(err => {
        console.error('Failed to fetch tenant content:', err);
        setErrorMsg('Failed to load customization data. You may not have permission yet.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateField = (section, field, value) => {
    setFormState(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
    setHasChanges(true);
  };

  const updateStatItem = (index, field, value) => {
    setFormState(prev => {
      const newItems = [...prev.stats.items];
      newItems[index] = { ...newItems[index], [field]: field === 'value' ? Number(value) || 0 : value };
      return { ...prev, stats: { items: newItems } };
    });
    setHasChanges(true);
  };

  const addTestimonial = () => {
    setFormState(prev => ({
      ...prev,
      testimonials: {
        items: [
          ...prev.testimonials.items,
          { id: `testimonial-${Date.now()}`, quote: '', author: '', role: '' },
        ],
      },
    }));
    setHasChanges(true);
  };

  const updateTestimonial = (index, field, value) => {
    setFormState(prev => {
      const newItems = [...prev.testimonials.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, testimonials: { items: newItems } };
    });
    setHasChanges(true);
  };

  const removeTestimonial = (index) => {
    setFormState(prev => ({
      ...prev,
      testimonials: { items: prev.testimonials.items.filter((_, i) => i !== index) },
    }));
    setHasChanges(true);
  };

  const toggleVisibility = (field) => {
    setFormState(prev => ({
      ...prev,
      visibility: { ...prev.visibility, [field]: !prev.visibility[field] },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await updateMyTenantContent(formState);
      setTenantContent(response.data);
      setSuccessMsg('Landing page customization saved successfully!');
      setHasChanges(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all customizations to defaults?')) return;
    try {
      await resetMyTenantContent();
      setFormState({
        branding: { institutionName: '', tagline: '', logoUrl: '', primaryColor: '#1a1a2e', accentColor: '#e94560' },
        hero: { title: '', subtitle: '', backgroundImageUrl: '' },
        stats: { items: [
          { id: 'stat-1', value: 0, label: 'Students Matched', suffix: '+' },
          { id: 'stat-2', value: 0, label: 'Partner Companies', suffix: '+' },
          { id: 'stat-3', value: 0, label: 'Projects Completed', suffix: '+' },
        ]},
        testimonials: { items: [] },
        cta: { title: '', subtitle: '', buttonText: '', buttonUrl: '' },
        visibility: { showStats: true, showTestimonials: true, showHowItWorks: true, showAICoaching: true, showCTA: true },
      });
      setTenantContent(null);
      setHasChanges(false);
      setSuccessMsg('Customizations reset to defaults.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg('Failed to reset customizations.');
    }
  };

  const subdomainPreview = institutionDomain ? institutionDomain.split('.')[0] : 'your-school';

  if (isLoading) {
    return <div className={css.loading}>Loading customization data...</div>;
  }

  const sections = [
    { key: 'branding', label: 'Branding' },
    { key: 'hero', label: 'Hero Section' },
    { key: 'stats', label: 'Statistics' },
    { key: 'testimonials', label: 'Testimonials' },
    { key: 'cta', label: 'Call to Action' },
    { key: 'visibility', label: 'Section Visibility' },
  ];

  return (
    <div className={css.customizePanel}>
      <div className={css.customizeHeader}>
        <div>
          <h2 className={css.customizeTitle}>
            {intl.formatMessage({ id: 'EducationDashboardPage.customizeTitle' })}
          </h2>
          <p className={css.customizeDescription}>
            {intl.formatMessage(
              { id: 'EducationDashboardPage.customizeDescription' },
              { subdomain: `${subdomainPreview}.street2ivy.com` }
            )}
          </p>
        </div>
        <div className={css.customizeActions}>
          <button className={css.resetButton} onClick={handleReset} disabled={isSaving}>
            {intl.formatMessage({ id: 'EducationDashboardPage.customizeReset' })}
          </button>
          <button
            className={css.saveButton}
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : intl.formatMessage({ id: 'EducationDashboardPage.customizeSave' })}
          </button>
        </div>
      </div>

      {successMsg && <div className={css.successMessage}>{successMsg}</div>}
      {errorMsg && <div className={css.errorMessage}>{errorMsg}</div>}

      <div className={css.customizeLayout}>
        {/* Section Navigation */}
        <div className={css.customizeSidebar}>
          {sections.map(s => (
            <button
              key={s.key}
              className={`${css.customizeSidebarItem} ${activeSection === s.key ? css.customizeSidebarActive : ''}`}
              onClick={() => setActiveSection(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className={css.customizeContent}>

          {/* Branding Section */}
          {activeSection === 'branding' && (
            <div className={css.customizeSection}>
              <h3 className={css.customizeSectionTitle}>Branding</h3>
              <p className={css.customizeSectionDesc}>
                Set your institution name, tagline, logo, and brand colors for the landing page.
              </p>
              <div className={css.formField}>
                <label>Institution Display Name</label>
                <input
                  type="text"
                  value={formState.branding.institutionName}
                  onChange={e => updateField('branding', 'institutionName', e.target.value)}
                  placeholder="e.g. Howard University"
                />
              </div>
              <div className={css.formField}>
                <label>Tagline</label>
                <input
                  type="text"
                  value={formState.branding.tagline}
                  onChange={e => updateField('branding', 'tagline', e.target.value)}
                  placeholder="e.g. Empowering Bison talent through industry connections"
                />
              </div>
              <div className={css.formField}>
                <label>Logo URL</label>
                <input
                  type="url"
                  value={formState.branding.logoUrl}
                  onChange={e => updateField('branding', 'logoUrl', e.target.value)}
                  placeholder="https://your-school.edu/logo.png"
                />
                <span className={css.fieldHint}>Paste a URL to your institution logo (recommended: 200x60px PNG)</span>
              </div>
              <div className={css.formRow}>
                <div className={css.formField}>
                  <label>Primary Color</label>
                  <div className={css.colorInputWrapper}>
                    <input
                      type="color"
                      value={formState.branding.primaryColor}
                      onChange={e => updateField('branding', 'primaryColor', e.target.value)}
                      className={css.colorInput}
                    />
                    <input
                      type="text"
                      value={formState.branding.primaryColor}
                      onChange={e => updateField('branding', 'primaryColor', e.target.value)}
                      className={css.colorTextInput}
                      placeholder="#1a1a2e"
                    />
                  </div>
                </div>
                <div className={css.formField}>
                  <label>Accent Color</label>
                  <div className={css.colorInputWrapper}>
                    <input
                      type="color"
                      value={formState.branding.accentColor}
                      onChange={e => updateField('branding', 'accentColor', e.target.value)}
                      className={css.colorInput}
                    />
                    <input
                      type="text"
                      value={formState.branding.accentColor}
                      onChange={e => updateField('branding', 'accentColor', e.target.value)}
                      className={css.colorTextInput}
                      placeholder="#e94560"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hero Section */}
          {activeSection === 'hero' && (
            <div className={css.customizeSection}>
              <h3 className={css.customizeSectionTitle}>Hero Section</h3>
              <p className={css.customizeSectionDesc}>
                Customize the main headline and banner seen at the top of your landing page.
              </p>
              <div className={css.formField}>
                <label>Hero Title</label>
                <input
                  type="text"
                  value={formState.hero.title}
                  onChange={e => updateField('hero', 'title', e.target.value)}
                  placeholder="e.g. Howard University x Street2Ivy"
                />
                <span className={css.fieldHint}>Leave blank to use the default Street2Ivy headline</span>
              </div>
              <div className={css.formField}>
                <label>Hero Subtitle</label>
                <textarea
                  value={formState.hero.subtitle}
                  onChange={e => updateField('hero', 'subtitle', e.target.value)}
                  placeholder="e.g. Connecting Bison talent with Fortune 500 opportunities"
                  rows={3}
                />
              </div>
              <div className={css.formField}>
                <label>Background Image URL</label>
                <input
                  type="url"
                  value={formState.hero.backgroundImageUrl}
                  onChange={e => updateField('hero', 'backgroundImageUrl', e.target.value)}
                  placeholder="https://your-school.edu/campus-hero.jpg"
                />
                <span className={css.fieldHint}>Recommended: 1920x800px landscape image</span>
              </div>
            </div>
          )}

          {/* Statistics Section */}
          {activeSection === 'stats' && (
            <div className={css.customizeSection}>
              <h3 className={css.customizeSectionTitle}>Statistics</h3>
              <p className={css.customizeSectionDesc}>
                Show your institution's impact with custom statistics that appear on the landing page.
              </p>
              {formState.stats.items.map((stat, idx) => (
                <div key={stat.id} className={css.statEditRow}>
                  <div className={css.formField}>
                    <label>Stat {idx + 1} Label</label>
                    <input
                      type="text"
                      value={stat.label}
                      onChange={e => updateStatItem(idx, 'label', e.target.value)}
                      placeholder="e.g. Students Matched"
                    />
                  </div>
                  <div className={css.formRow}>
                    <div className={css.formField}>
                      <label>Value</label>
                      <input
                        type="number"
                        value={stat.value}
                        onChange={e => updateStatItem(idx, 'value', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className={css.formField}>
                      <label>Suffix</label>
                      <input
                        type="text"
                        value={stat.suffix}
                        onChange={e => updateStatItem(idx, 'suffix', e.target.value)}
                        placeholder="+"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Testimonials Section */}
          {activeSection === 'testimonials' && (
            <div className={css.customizeSection}>
              <h3 className={css.customizeSectionTitle}>Testimonials</h3>
              <p className={css.customizeSectionDesc}>
                Add student or partner testimonials to showcase on your landing page.
              </p>
              {formState.testimonials.items.map((t, idx) => (
                <div key={t.id} className={css.testimonialEditCard}>
                  <div className={css.testimonialEditHeader}>
                    <span>Testimonial {idx + 1}</span>
                    <button className={css.removeButton} onClick={() => removeTestimonial(idx)}>Remove</button>
                  </div>
                  <div className={css.formField}>
                    <label>Quote</label>
                    <textarea
                      value={t.quote}
                      onChange={e => updateTestimonial(idx, 'quote', e.target.value)}
                      placeholder="What did they say about the program?"
                      rows={3}
                    />
                  </div>
                  <div className={css.formRow}>
                    <div className={css.formField}>
                      <label>Author Name</label>
                      <input
                        type="text"
                        value={t.author}
                        onChange={e => updateTestimonial(idx, 'author', e.target.value)}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className={css.formField}>
                      <label>Role / Title</label>
                      <input
                        type="text"
                        value={t.role}
                        onChange={e => updateTestimonial(idx, 'role', e.target.value)}
                        placeholder="Senior, Finance Major"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button className={css.addButton} onClick={addTestimonial}>
                + Add Testimonial
              </button>
            </div>
          )}

          {/* CTA Section */}
          {activeSection === 'cta' && (
            <div className={css.customizeSection}>
              <h3 className={css.customizeSectionTitle}>Call to Action</h3>
              <p className={css.customizeSectionDesc}>
                Customize the closing call-to-action section on your landing page.
              </p>
              <div className={css.formField}>
                <label>CTA Title</label>
                <input
                  type="text"
                  value={formState.cta.title}
                  onChange={e => updateField('cta', 'title', e.target.value)}
                  placeholder="e.g. Ready to launch your career?"
                />
              </div>
              <div className={css.formField}>
                <label>CTA Subtitle</label>
                <textarea
                  value={formState.cta.subtitle}
                  onChange={e => updateField('cta', 'subtitle', e.target.value)}
                  placeholder="e.g. Join hundreds of Howard students who found their path"
                  rows={2}
                />
              </div>
              <div className={css.formRow}>
                <div className={css.formField}>
                  <label>Button Text</label>
                  <input
                    type="text"
                    value={formState.cta.buttonText}
                    onChange={e => updateField('cta', 'buttonText', e.target.value)}
                    placeholder="e.g. Get Started"
                  />
                </div>
                <div className={css.formField}>
                  <label>Button URL (optional)</label>
                  <input
                    type="url"
                    value={formState.cta.buttonUrl}
                    onChange={e => updateField('cta', 'buttonUrl', e.target.value)}
                    placeholder="https://..."
                  />
                  <span className={css.fieldHint}>Leave blank to link to the signup page</span>
                </div>
              </div>
            </div>
          )}

          {/* Visibility Section */}
          {activeSection === 'visibility' && (
            <div className={css.customizeSection}>
              <h3 className={css.customizeSectionTitle}>Section Visibility</h3>
              <p className={css.customizeSectionDesc}>
                Toggle which sections appear on your institution's landing page.
              </p>
              {[
                { key: 'showStats', label: 'Statistics Section', desc: 'Show impact numbers (students matched, companies, etc.)' },
                { key: 'showTestimonials', label: 'Testimonials Section', desc: 'Show student and partner testimonials' },
                { key: 'showHowItWorks', label: 'How It Works Section', desc: 'Show the step-by-step process' },
                { key: 'showAICoaching', label: 'AI Coaching Section', desc: 'Show the AI career coaching feature' },
                { key: 'showCTA', label: 'Call to Action Section', desc: 'Show the closing call to action' },
              ].map(item => (
                <div key={item.key} className={css.visibilityToggle}>
                  <div className={css.visibilityInfo}>
                    <span className={css.visibilityLabel}>{item.label}</span>
                    <span className={css.visibilityDesc}>{item.desc}</span>
                  </div>
                  <button
                    className={`${css.toggleButton} ${formState.visibility[item.key] ? css.toggleOn : css.toggleOff}`}
                    onClick={() => toggleVisibility(item.key)}
                  >
                    {formState.visibility[item.key] ? 'Visible' : 'Hidden'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ================ Alumni Network Panel ================ //

const AlumniNetworkPanel = ({ institutionDomain }) => {
  const intl = useIntl();
  const [alumniList, setAlumniList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteInProgress, setInviteInProgress] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchFilters, setSearchFilters] = useState({ major: '', sport: '', willingToMentor: '', willingToNetwork: '' });

  useEffect(() => {
    loadAlumni();
  }, []);

  const loadAlumni = async (filters = {}) => {
    setIsLoading(true);
    try {
      const params = { ...filters };
      if (institutionDomain) {
        // Filter by institution domain university
      }
      const response = await searchAlumni(params);
      setAlumniList(response.data || []);
    } catch (err) {
      console.error('Failed to fetch alumni:', err);
      setAlumniList([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    const filters = {};
    if (searchFilters.major) filters.major = searchFilters.major;
    if (searchFilters.sport) filters.sport = searchFilters.sport;
    if (searchFilters.willingToMentor) filters.willingToMentor = searchFilters.willingToMentor;
    if (searchFilters.willingToNetwork) filters.willingToNetwork = searchFilters.willingToNetwork;
    loadAlumni(filters);
  };

  const handleInvite = async () => {
    const emails = inviteEmails
      .split(/[,\n;]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emails.length === 0) {
      setErrorMsg('Please enter at least one email address.');
      return;
    }

    setInviteInProgress(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await inviteAlumni({ emails, personalMessage: inviteMessage });
      setSuccessMsg(response.message || `${emails.length} invitation(s) sent!`);
      setInviteEmails('');
      setInviteMessage('');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg('Failed to send invitations. Please try again.');
    } finally {
      setInviteInProgress(false);
    }
  };

  return (
    <div className={css.alumniPanel}>
      {/* Invite Alumni Section */}
      <div className={css.alumniInviteSection}>
        <h3 className={css.alumniSectionTitle}>
          {intl.formatMessage({ id: 'EducationDashboardPage.alumniInviteTitle' })}
        </h3>
        <p className={css.alumniSectionDesc}>
          {intl.formatMessage({ id: 'EducationDashboardPage.alumniInviteDescription' })}
        </p>

        {successMsg && <div className={css.successMessage}>{successMsg}</div>}
        {errorMsg && <div className={css.errorMessage}>{errorMsg}</div>}

        <div className={css.formField}>
          <label>{intl.formatMessage({ id: 'EducationDashboardPage.alumniEmailsLabel' })}</label>
          <textarea
            value={inviteEmails}
            onChange={e => setInviteEmails(e.target.value)}
            placeholder="alumni1@email.com, alumni2@email.com"
            rows={3}
          />
          <span className={css.fieldHint}>Separate multiple emails with commas or new lines</span>
        </div>
        <div className={css.formField}>
          <label>{intl.formatMessage({ id: 'EducationDashboardPage.alumniMessageLabel' })}</label>
          <textarea
            value={inviteMessage}
            onChange={e => setInviteMessage(e.target.value)}
            placeholder="Join our alumni network on Street2Ivy and connect with current students..."
            rows={2}
          />
        </div>
        <button
          className={css.saveButton}
          onClick={handleInvite}
          disabled={inviteInProgress || !inviteEmails.trim()}
        >
          {inviteInProgress ? 'Sending...' : intl.formatMessage({ id: 'EducationDashboardPage.alumniSendInvites' })}
        </button>
      </div>

      {/* Alumni Directory */}
      <div className={css.alumniDirectorySection}>
        <h3 className={css.alumniSectionTitle}>
          {intl.formatMessage({ id: 'EducationDashboardPage.alumniDirectoryTitle' })}
        </h3>

        {/* Search Filters */}
        <div className={css.alumniFilters}>
          <div className={css.formField}>
            <label>Major</label>
            <input
              type="text"
              value={searchFilters.major}
              onChange={e => setSearchFilters(prev => ({ ...prev, major: e.target.value }))}
              placeholder="e.g. Computer Science"
            />
          </div>
          <div className={css.formField}>
            <label>Sport</label>
            <input
              type="text"
              value={searchFilters.sport}
              onChange={e => setSearchFilters(prev => ({ ...prev, sport: e.target.value }))}
              placeholder="e.g. basketball"
            />
          </div>
          <div className={css.formField}>
            <label>
              <input
                type="checkbox"
                checked={searchFilters.willingToMentor === 'true'}
                onChange={e => setSearchFilters(prev => ({ ...prev, willingToMentor: e.target.checked ? 'true' : '' }))}
              />
              {' '}Willing to Mentor
            </label>
          </div>
          <div className={css.formField}>
            <label>
              <input
                type="checkbox"
                checked={searchFilters.willingToNetwork === 'true'}
                onChange={e => setSearchFilters(prev => ({ ...prev, willingToNetwork: e.target.checked ? 'true' : '' }))}
              />
              {' '}Open to Networking
            </label>
          </div>
          <button className={css.addButton} onClick={handleSearch}>Search Alumni</button>
        </div>

        {/* Alumni List */}
        {isLoading ? (
          <div className={css.loading}>Loading alumni directory...</div>
        ) : alumniList.length === 0 ? (
          <div className={css.emptyState}>
            <p>{intl.formatMessage({ id: 'EducationDashboardPage.alumniEmptyState' })}</p>
          </div>
        ) : (
          <div className={css.alumniGrid}>
            {alumniList.map(alum => (
              <div key={alum.id} className={css.alumniCard}>
                <div className={css.alumniCardHeader}>
                  <div className={css.alumniAvatar}>
                    {alum.abbreviatedName || alum.displayName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h4 className={css.alumniName}>{alum.displayName}</h4>
                    <p className={css.alumniDetail}>
                      {alum.publicData?.university} {alum.publicData?.graduationYear ? `'${String(alum.publicData.graduationYear).slice(-2)}` : ''}
                    </p>
                  </div>
                </div>
                {alum.publicData?.major && (
                  <p className={css.alumniDetail}>{alum.publicData.major}</p>
                )}
                {alum.publicData?.currentCompany && (
                  <p className={css.alumniDetail}>{alum.publicData.currentTitle || ''} at {alum.publicData.currentCompany}</p>
                )}
                <div className={css.alumniTags}>
                  {alum.publicData?.willingToMentor && (
                    <span className={css.alumniTag}>Mentor</span>
                  )}
                  {alum.publicData?.willingToNetwork && (
                    <span className={css.alumniTag}>Networking</span>
                  )}
                  {(alum.publicData?.sports || []).slice(0, 3).map(sport => (
                    <span key={sport} className={css.alumniTagSport}>
                      {sport.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ================ Corporate Partners Panel ================ //

const PartnersPanel = ({
  partners,
  partnersInProgress,
  partnerActionInProgress,
  onFetchPartners,
  onPartnerAction,
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    onFetchPartners();
  }, [onFetchPartners]);

  const filteredPartners = statusFilter === 'all'
    ? partners
    : partners.filter(p => {
        if (statusFilter === 'approved') return p.approvalStatus === 'approved';
        if (statusFilter === 'pending') return !p.approvalStatus || p.approvalStatus === 'pending';
        if (statusFilter === 'rejected') return p.approvalStatus === 'rejected';
        return true;
      });

  const getStatusBadgeClass = status => {
    if (status === 'approved') return css.partnerStatusApproved;
    if (status === 'rejected') return css.partnerStatusRejected;
    return css.partnerStatusPending;
  };

  const handleReject = (userId) => {
    onPartnerAction('reject', userId, rejectReason);
    setRejectingId(null);
    setRejectReason('');
  };

  if (partnersInProgress) {
    return <div className={css.loading}>Loading corporate partners...</div>;
  }

  const pendingCount = partners.filter(p => !p.approvalStatus || p.approvalStatus === 'pending').length;
  const approvedCount = partners.filter(p => p.approvalStatus === 'approved').length;
  const rejectedCount = partners.filter(p => p.approvalStatus === 'rejected').length;

  return (
    <div className={css.partnersContainer}>
      {/* Partner Stats */}
      <div className={css.partnerStatsRow}>
        <div className={css.partnerStatCard}>
          <span className={css.partnerStatValue}>{partners.length}</span>
          <span className={css.partnerStatLabel}>Total Partners</span>
        </div>
        <div className={css.partnerStatCard}>
          <span className={`${css.partnerStatValue} ${css.partnerStatPending}`}>{pendingCount}</span>
          <span className={css.partnerStatLabel}>Pending</span>
        </div>
        <div className={css.partnerStatCard}>
          <span className={`${css.partnerStatValue} ${css.partnerStatApproved}`}>{approvedCount}</span>
          <span className={css.partnerStatLabel}>Approved</span>
        </div>
        <div className={css.partnerStatCard}>
          <span className={`${css.partnerStatValue} ${css.partnerStatRejected}`}>{rejectedCount}</span>
          <span className={css.partnerStatLabel}>Rejected</span>
        </div>
      </div>

      {/* Filter */}
      <div className={css.partnerFilterRow}>
        <select
          className={css.partnerFilterSelect}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Partners ({partners.length})</option>
          <option value="pending">Pending ({pendingCount})</option>
          <option value="approved">Approved ({approvedCount})</option>
          <option value="rejected">Rejected ({rejectedCount})</option>
        </select>
      </div>

      {/* Partners Table */}
      {filteredPartners.length === 0 ? (
        <div className={css.noPartners}>
          {statusFilter === 'all'
            ? 'No corporate partners found for your institution.'
            : `No ${statusFilter} corporate partners.`}
        </div>
      ) : (
        <div className={css.partnersTableWrapper}>
          <table className={css.partnersTable}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map(partner => (
                <tr key={partner.id} className={css.partnerRow}>
                  <td>
                    <div className={css.partnerCompanyInfo}>
                      <NamedLink
                        name="ProfilePage"
                        params={{ id: partner.id }}
                        className={css.partnerCompanyName}
                      >
                        {partner.companyName || partner.displayName || 'Unknown Company'}
                      </NamedLink>
                      {partner.companySize && (
                        <span className={css.partnerCompanySize}>{partner.companySize}</span>
                      )}
                    </div>
                  </td>
                  <td className={css.partnerIndustry}>
                    {partner.industry || '-'}
                  </td>
                  <td>
                    <span className={`${css.partnerStatusBadge} ${getStatusBadgeClass(partner.approvalStatus)}`}>
                      {partner.approvalStatus || 'pending'}
                    </span>
                  </td>
                  <td className={css.partnerActions}>
                    {(!partner.approvalStatus || partner.approvalStatus === 'pending') && (
                      <>
                        <button
                          className={css.partnerApproveBtn}
                          onClick={() => onPartnerAction('approve', partner.id)}
                          disabled={partnerActionInProgress}
                        >
                          Approve
                        </button>
                        {rejectingId === partner.id ? (
                          <div className={css.rejectForm}>
                            <input
                              type="text"
                              className={css.rejectReasonInput}
                              placeholder="Reason (optional)"
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                            />
                            <button
                              className={css.partnerRejectConfirmBtn}
                              onClick={() => handleReject(partner.id)}
                              disabled={partnerActionInProgress}
                            >
                              Confirm
                            </button>
                            <button
                              className={css.partnerCancelBtn}
                              onClick={() => { setRejectingId(null); setRejectReason(''); }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className={css.partnerRejectBtn}
                            onClick={() => setRejectingId(partner.id)}
                            disabled={partnerActionInProgress}
                          >
                            Reject
                          </button>
                        )}
                      </>
                    )}
                    {partner.approvalStatus === 'approved' && (
                      <button
                        className={css.partnerRemoveBtn}
                        onClick={() => onPartnerAction('remove', partner.id)}
                        disabled={partnerActionInProgress}
                      >
                        Remove
                      </button>
                    )}
                    {partner.approvalStatus === 'rejected' && (
                      <button
                        className={css.partnerApproveBtn}
                        onClick={() => onPartnerAction('approve', partner.id)}
                        disabled={partnerActionInProgress}
                      >
                        Re-approve
                      </button>
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
    partners,
    partnersInProgress,
    partnerActionInProgress,
    onFetchPartners,
    onPartnerAction,
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

            {/* AI Coaching Status Banner */}
            {subscriptionStatus && (
              <div className={css.subscriptionStatusBanner}>
                <div className={css.subscriptionStatusItems}>
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
                {!subscriptionStatus.aiCoachingApproved && (
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
            <button
              className={`${css.tab} ${activeTab === 'customize' ? css.activeTab : ''}`}
              onClick={() => setActiveTab('customize')}
            >
              <FormattedMessage id="EducationDashboardPage.tabCustomize" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'alumni' ? css.activeTab : ''}`}
              onClick={() => setActiveTab('alumni')}
            >
              <FormattedMessage id="EducationDashboardPage.tabAlumni" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'partners' ? css.activeTab : ''}`}
              onClick={() => setActiveTab('partners')}
            >
              Corporate Partners
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
                          <div className={`${css.funnelBar} ${css.funnelBarRegistered}`}>
                            <span className={css.funnelLabel}>Registered</span>
                            <span className={css.funnelValue}>{stats?.totalStudents || 0}</span>
                          </div>
                        </div>
                        <div className={css.funnelItem}>
                          <div className={`${css.funnelBar} ${css.funnelBarEngaged}`}>
                            <span className={css.funnelLabel}>Applied</span>
                            <span className={css.funnelValue}>{engagedStudents}</span>
                          </div>
                        </div>
                        <div className={css.funnelItem}>
                          <div className={`${css.funnelBar} ${css.funnelBarPlaced}`}>
                            <span className={css.funnelLabel}>Placed</span>
                            <span className={css.funnelValue}>{placedStudents}</span>
                          </div>
                        </div>
                        <div className={css.funnelItem}>
                          <div className={`${css.funnelBar} ${css.funnelBarCompleted}`}>
                            <span className={css.funnelLabel}>Completed</span>
                            <span className={css.funnelValue}>{completedStudents}</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Company Spending Report */}
              <CompanySpendingReport />
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

          {/* Customize Landing Page Tab */}
          {activeTab === 'customize' && (
            <CustomizeLandingPanel institutionDomain={institutionDomain} />
          )}

          {/* Alumni Network Tab */}
          {activeTab === 'alumni' && (
            <AlumniNetworkPanel institutionDomain={institutionDomain} />
          )}

          {/* Partners Tab */}
          {activeTab === 'partners' && (
            <PartnersPanel
              partners={partners}
              partnersInProgress={partnersInProgress}
              partnerActionInProgress={partnerActionInProgress}
              onFetchPartners={onFetchPartners}
              onPartnerAction={onPartnerAction}
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
    partners,
    partnersInProgress,
    partnerActionInProgress,
  } = state.EducationDashboardPage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    stats,
    students,
    institutionName,
    institutionDomain,
    subscriptionStatus: subscriptionStatus || { aiCoachingApproved: false },
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
    partners: partners || [],
    partnersInProgress: partnersInProgress || false,
    partnerActionInProgress: partnerActionInProgress || false,
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
  onFetchPartners: () => dispatch(fetchPartners()),
  onPartnerAction: (action, userId, reason) => dispatch(partnerAction(action, userId, reason)),
});

const EducationDashboardPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EducationDashboardPageComponent);

export default EducationDashboardPage;
