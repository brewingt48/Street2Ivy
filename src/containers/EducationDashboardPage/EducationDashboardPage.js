import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { fetchAllCompaniesSpending } from '../../util/api';

import { Page, LayoutSingleColumn, PaginationLinks, AvatarMedium, Modal, NamedLink, DashboardErrorBoundary, EmptyState, HelpTip } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import {
  fetchDashboard,
  fetchStudentTransactions,
  clearStudentTransactions,
  sendEducationalAdminMessage,
  fetchEducationalAdminMessages,
  clearMessageState,
  saveTenantBranding,
  saveTenantSettings,
  activateTenantAction,
  submitTenantRequestAction,
  inviteAlumniAction,
  fetchAlumni,
  clearTenantSaveState,
  clearTenantRequestState,
  clearAlumniInviteState,
  deleteAlumniAction,
  resendAlumniInvitationAction,
  uploadTenantLogoAction,
  fetchStudentsAction,
  fetchStudentStatsAction,
  fetchReportsOverviewAction,
  clearAlumniDeleteState,
  clearAlumniResendState,
  clearLogoUploadState,
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

const CompanySpendingReport = memo(() => {
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
});

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

// ================ Onboarding Wizard ================ //

const OnboardingWizard = ({ tenant, onSaveBranding, onActivate, saveInProgress, saveSuccess }) => {
  const [step, setStep] = React.useState(1);
  const [brandingForm, setBrandingForm] = React.useState({
    marketplaceName: tenant?.branding?.marketplaceName || tenant?.name || '',
    marketplaceColor: tenant?.branding?.marketplaceColor || '#2D5BE3',
    logoUrl: tenant?.branding?.logoUrl || '',
  });

  const handleBrandingChange = (field, value) => {
    setBrandingForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBranding = () => {
    onSaveBranding(brandingForm);
  };

  return (
    <div className={css.onboardingWizard}>
      <div className={css.onboardingProgress}>
        <div className={`${css.progressStep} ${step >= 1 ? css.progressStepActive : ''}`}>1. Welcome</div>
        <div className={`${css.progressStep} ${step >= 2 ? css.progressStepActive : ''}`}>2. Branding</div>
        <div className={`${css.progressStep} ${step >= 3 ? css.progressStepActive : ''}`}>3. Launch</div>
      </div>

      {step === 1 && (
        <div className={css.onboardingStep}>
          <h2>Welcome to Your Portal</h2>
          <p>Let's set up your institution's branded portal on Street2Ivy.</p>
          <div className={css.onboardingInfo}>
            <p><strong>Institution:</strong> {tenant?.name}</p>
            <p><strong>Domain:</strong> {tenant?.domain}</p>
          </div>
          <button className={css.primaryButton} onClick={() => setStep(2)}>Continue to Branding</button>
        </div>
      )}

      {step === 2 && (
        <div className={css.onboardingStep}>
          <h2>Customize Your Branding</h2>
          <div className={css.brandingForm}>
            <label className={css.formLabel}>
              Portal Name
              <HelpTip
                content="The name displayed in the header and emails for your portal. Example: 'Harvard x Street2Ivy'."
                position="right"
                size="small"
              />
              <input type="text" value={brandingForm.marketplaceName} onChange={(e) => handleBrandingChange('marketplaceName', e.target.value)} className={css.formInput} />
            </label>
            <label className={css.formLabel}>
              Brand Color
              <HelpTip
                content="Your institution's primary brand color. Used for headers, buttons, and accents throughout your branded portal."
                position="right"
                size="small"
              />
              <div className={css.colorPickerRow}>
                <input type="color" value={brandingForm.marketplaceColor} onChange={(e) => handleBrandingChange('marketplaceColor', e.target.value)} className={css.colorPicker} />
                <input type="text" value={brandingForm.marketplaceColor} onChange={(e) => handleBrandingChange('marketplaceColor', e.target.value)} className={css.colorInput} />
              </div>
            </label>
            <label className={css.formLabel}>
              Logo URL (optional)
              <HelpTip
                content="URL to your institution's logo. Use a square image (at least 200x200px) for best results."
                position="right"
                size="small"
              />
              <input type="url" value={brandingForm.logoUrl} onChange={(e) => handleBrandingChange('logoUrl', e.target.value)} className={css.formInput} placeholder="https://example.com/logo.png" />
            </label>
          </div>
          <div className={css.brandingPreview}>
            <h3>Preview</h3>
            <div className={css.previewCard} style={{ borderTopColor: brandingForm.marketplaceColor }}>
              <div className={css.previewHeader} style={{ backgroundColor: brandingForm.marketplaceColor }}>
                {brandingForm.marketplaceName || 'Your Portal'}
              </div>
              <div className={css.previewBody}>Sample content area</div>
            </div>
          </div>
          <div className={css.onboardingActions}>
            <button className={css.secondaryButton} onClick={() => setStep(1)}>Back</button>
            <button className={css.primaryButton} onClick={() => { handleSaveBranding(); setStep(3); }} disabled={saveInProgress}>
              {saveInProgress ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={css.onboardingStep}>
          <h2>Ready to Launch!</h2>
          <p>Your portal is ready. Review your settings and activate when ready.</p>
          <div className={css.onboardingInfo}>
            <p><strong>Name:</strong> {brandingForm.marketplaceName}</p>
            <p><strong>Color:</strong> <span style={{ display: 'inline-block', width: 16, height: 16, backgroundColor: brandingForm.marketplaceColor, verticalAlign: 'middle', borderRadius: 2, marginRight: 6 }} />{brandingForm.marketplaceColor}</p>
            <p><strong>Domain:</strong> {tenant?.domain}</p>
          </div>
          <div className={css.onboardingActions}>
            <button className={css.secondaryButton} onClick={() => setStep(2)}>Back</button>
            <button className={css.primaryButton} onClick={onActivate} disabled={saveInProgress}>
              {saveInProgress ? 'Activating...' : 'Launch My Portal'}
            </button>
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
    tenant,
    tenantFetchInProgress,
    tenantSaveInProgress,
    tenantSaveSuccess,
    tenantRequestSubmitted,
    tenantRequestInProgress,
    alumni,
    alumniPagination,
    alumniFetchInProgress,
    alumniInviteInProgress,
    alumniInviteSuccess,
    onFetchDashboard,
    onFetchStudentTransactions,
    onClearStudentTransactions,
    onSendMessage,
    onFetchMessages,
    onClearMessageState,
    onManageDisableScrolling,
    dispatch,
  } = props;

  const intl = useIntl();
  const params = useParams();
  const history = useHistory();
  const location = useLocation();

  const activeTab = params.tab || 'overview';

  const handleTabChange = (tab) => {
    history.push('/education/dashboard/' + tab);
  };

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
    const urlParams = new URLSearchParams(location.search);
    urlParams.set('page', page);
    history.push({ pathname: '/education/dashboard', search: urlParams.toString() });
    onFetchDashboard({ page });
  };

  const title = intl.formatMessage({ id: 'EducationDashboardPage.title' });

  const topbar = <TopbarContainer />;

  // Access control
  if (currentUser && !isEducationalAdmin) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={topbar} footer={<FooterContainer />}>
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

  // Onboarding/Request flow detection
  if (!tenantFetchInProgress && tenant === null) {
    // No tenant exists for this institution — show Request Access form
    return (
      <Page title="Education Dashboard" scrollingDisabled={false}>
        <LayoutSingleColumn topbar={topbar}>
          <div className={css.requestAccessContainer}>
            <h1 className={css.requestAccessTitle}>Request Portal Access</h1>
            <p className={css.requestAccessDescription}>
              Your institution does not yet have a Street2Ivy portal. Submit a request to get started.
            </p>
            {tenantRequestSubmitted ? (
              <div className={css.successMessage}>
                Your request has been submitted! Our team will review it and get back to you shortly.
              </div>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                dispatch(submitTenantRequestAction({
                  institutionName: formData.get('institutionName'),
                  adminName: formData.get('adminName'),
                  adminEmail: formData.get('adminEmail'),
                  reason: formData.get('reason'),
                }));
              }} className={css.requestAccessForm}>
                <label className={css.formLabel}>
                  Institution Name
                  <input type="text" name="institutionName" required className={css.formInput} defaultValue={institutionName || ''} />
                </label>
                <label className={css.formLabel}>
                  Your Name
                  <input type="text" name="adminName" required className={css.formInput} />
                </label>
                <label className={css.formLabel}>
                  Contact Email
                  <input type="email" name="adminEmail" required className={css.formInput} />
                </label>
                <label className={css.formLabel}>
                  Why do you want a portal? (optional)
                  <textarea name="reason" rows={3} className={css.formTextarea} />
                </label>
                <button type="submit" className={css.submitButton} disabled={tenantRequestInProgress}>
                  {tenantRequestInProgress ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  if (!tenantFetchInProgress && tenant?.status === 'onboarding') {
    // Tenant is in onboarding — show wizard
    return (
      <Page title="Set Up Your Portal" scrollingDisabled={false}>
        <LayoutSingleColumn topbar={topbar}>
          <OnboardingWizard
            tenant={tenant}
            onSaveBranding={(data) => dispatch(saveTenantBranding(data))}
            onActivate={() => dispatch(activateTenantAction())}
            saveInProgress={tenantSaveInProgress}
            saveSuccess={tenantSaveSuccess}
          />
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
      <LayoutSingleColumn topbar={topbar} footer={<FooterContainer />}>
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
              onClick={() => handleTabChange('overview')}
            >
              <FormattedMessage id="EducationDashboardPage.tabOverview" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'students' ? css.activeTab : ''}`}
              onClick={() => handleTabChange('students')}
            >
              <FormattedMessage id="EducationDashboardPage.tabStudents" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'alumni' ? css.activeTab : ''}`}
              onClick={() => handleTabChange('alumni')}
            >
              Alumni
            </button>
            <button
              className={`${css.tab} ${activeTab === 'reports' ? css.activeTab : ''}`}
              onClick={() => handleTabChange('reports')}
            >
              <FormattedMessage id="EducationDashboardPage.tabReports" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'messages' ? css.activeTab : ''}`}
              onClick={() => handleTabChange('messages')}
            >
              <FormattedMessage id="EducationDashboardPage.tabMessages" />
            </button>
            <button
              className={`${css.tab} ${activeTab === 'branding' ? css.activeTab : ''}`}
              onClick={() => handleTabChange('branding')}
            >
              Branding
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

          {/* Initial loading guard */}
          {fetchInProgress && !stats && (
            <div className={css.loadingContainer}>
              <div className={css.loadingSpinner} />
              <FormattedMessage id="EducationDashboardPage.loading" />
            </div>
          )}

          <DashboardErrorBoundary pageName="EducationDashboard">
          {/* Overview Tab */}
          {activeTab === 'overview' && !fetchInProgress && stats && (
            <div className={css.statsSection}>
              <h2 className={css.statsSectionTitle}>
                <FormattedMessage id="EducationDashboardPage.statsTitle" />
                <HelpTip
                  content={intl.formatMessage({ id: 'EducationDashboardPage.helpOverview' })}
                  title={intl.formatMessage({ id: 'EducationDashboardPage.helpOverviewTitle' })}
                  position="right"
                  size="large"
                />
              </h2>

              {/* Primary Stats - Clickable Cards */}
              <div className={css.statsGrid}>
                <button
                  type="button"
                  className={css.statCardClickable}
                  onClick={() => handleTabChange('students')}
                  title="Click to view all students"
                >
                  <div className={css.statValue}>{stats.totalStudents}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statStudents" />
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpStatStudents' })}
                      position="top"
                      size="medium"
                    />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.activeStudents || 0} active
                  </div>
                </button>
                <button
                  type="button"
                  className={css.statCardClickable}
                  onClick={() => handleTabChange('reports')}
                  title="Click to view detailed reports"
                >
                  <div className={css.statValue}>{stats.projectsApplied}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statApplied" />
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpStatApplications' })}
                      position="top"
                      size="medium"
                    />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.projectsPending || 0} pending
                  </div>
                </button>
                <button
                  type="button"
                  className={`${css.statCardClickable} ${css.statCardSuccess}`}
                  onClick={() => handleTabChange('reports')}
                  title="Click to view placement details"
                >
                  <div className={css.statValue}>{stats.projectsAccepted || 0}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statAccepted" />
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpStatPlacements' })}
                      position="top"
                      size="medium"
                    />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.acceptanceRate || 0}% acceptance rate
                  </div>
                </button>
                <button
                  type="button"
                  className={`${css.statCardClickable} ${css.statCardWarning}`}
                  onClick={() => handleTabChange('reports')}
                  title="Click to view decline details"
                >
                  <div className={css.statValue}>{stats.projectsDeclined}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statDeclined" />
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpStatDeclined' })}
                      position="top"
                      size="medium"
                    />
                  </div>
                </button>
                <button
                  type="button"
                  className={`${css.statCardClickable} ${css.statCardComplete}`}
                  onClick={() => handleTabChange('reports')}
                  title="Click to view completed projects"
                >
                  <div className={css.statValue}>{stats.projectsCompleted}</div>
                  <div className={css.statLabel}>
                    <FormattedMessage id="EducationDashboardPage.statCompleted" />
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpStatCompleted' })}
                      position="top"
                      size="medium"
                    />
                  </div>
                  <div className={css.statSubtext}>
                    {stats.completionRate || 0}% completion rate
                  </div>
                </button>
              </div>

              {/* Secondary Stats Row */}
              <h3 className={css.secondaryStatsTitle}>
                <FormattedMessage id="EducationDashboardPage.engagementMetrics" />
                <HelpTip
                  content={intl.formatMessage({ id: 'EducationDashboardPage.helpEngagementMetrics' })}
                  position="right"
                  size="medium"
                />
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
                    onClick={() => handleTabChange('students')}
                  >
                    <span className={css.quickActionIcon}>👥</span>
                    <span className={css.quickActionText}>
                      <FormattedMessage id="EducationDashboardPage.viewStudents" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={css.quickActionButton}
                    onClick={() => handleTabChange('reports')}
                  >
                    <span className={css.quickActionIcon}>📊</span>
                    <span className={css.quickActionText}>
                      <FormattedMessage id="EducationDashboardPage.downloadReports" />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={css.quickActionButton}
                    onClick={() => handleTabChange('messages')}
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
                  <HelpTip
                    content={intl.formatMessage({ id: 'EducationDashboardPage.helpStudents' })}
                    title={intl.formatMessage({ id: 'EducationDashboardPage.helpStudentsTitle' })}
                    position="right"
                    size="large"
                  />
                </h2>
                <input
                  type="text"
                  className={css.searchInput}
                  placeholder={intl.formatMessage({
                    id: 'EducationDashboardPage.searchPlaceholder',
                  })}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  title={intl.formatMessage({ id: 'EducationDashboardPage.helpStudentsSearch' })}
                />
              </div>

              {filteredStudents.length === 0 ? (
                <EmptyState
                  icon="👩‍🎓"
                  title={intl.formatMessage({ id: 'EducationDashboardPage.emptyStudentsTitle' })}
                  description={intl.formatMessage({ id: 'EducationDashboardPage.emptyStudentsDescription' })}
                  size="medium"
                />
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

          {/* Alumni Tab */}
          {activeTab === 'alumni' && (
            <div className={css.alumniSection}>
              <h2 className={css.sectionTitle}>
                <FormattedMessage id="EducationDashboardPage.alumniTitle" />
                <HelpTip
                  content={intl.formatMessage({ id: 'EducationDashboardPage.helpAlumni' })}
                  title={intl.formatMessage({ id: 'EducationDashboardPage.helpAlumniTitle' })}
                  position="right"
                  size="large"
                />
              </h2>

              {/* Invite Form */}
              <div className={css.alumniInviteForm}>
                <h3>
                  <FormattedMessage id="EducationDashboardPage.inviteAlumni" />
                  <HelpTip
                    content={intl.formatMessage({ id: 'EducationDashboardPage.helpAlumniInvite' })}
                    position="right"
                    size="medium"
                  />
                </h3>
                {alumniInviteSuccess && (
                  <div className={css.successMessage}>Alumni invited successfully!</div>
                )}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  dispatch(inviteAlumniAction({
                    firstName: formData.get('firstName'),
                    lastName: formData.get('lastName'),
                    email: formData.get('email'),
                    graduationYear: formData.get('graduationYear'),
                    program: formData.get('program'),
                  }));
                  e.target.reset();
                }} className={css.inviteForm}>
                  <div className={css.formRow}>
                    <label className={css.formLabel}>
                      First Name *
                      <input type="text" name="firstName" required className={css.formInput} />
                    </label>
                    <label className={css.formLabel}>
                      Last Name *
                      <input type="text" name="lastName" required className={css.formInput} />
                    </label>
                  </div>
                  <div className={css.formRow}>
                    <label className={css.formLabel}>
                      Email *
                      <input type="email" name="email" required className={css.formInput} />
                    </label>
                    <label className={css.formLabel}>
                      Graduation Year
                      <input type="text" name="graduationYear" className={css.formInput} placeholder="e.g. 2023" />
                    </label>
                  </div>
                  <label className={css.formLabel}>
                    Program
                    <input type="text" name="program" className={css.formInput} placeholder="e.g. Computer Science" />
                  </label>
                  <button type="submit" className={css.submitButton} disabled={alumniInviteInProgress}>
                    {alumniInviteInProgress ? 'Inviting...' : 'Send Invitation'}
                  </button>
                </form>
              </div>

              {/* Alumni Table */}
              <div className={css.alumniTable}>
                <h3>Invited Alumni ({alumniPagination?.total || alumni.length})</h3>
                {alumni.length === 0 ? (
                  <EmptyState
                    icon="🎓"
                    title={intl.formatMessage({ id: 'EducationDashboardPage.emptyAlumniTitle' })}
                    description={intl.formatMessage({ id: 'EducationDashboardPage.emptyAlumniDescription' })}
                    size="medium"
                  />
                ) : (
                  <table className={css.dataTable}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Grad Year</th>
                        <th>Program</th>
                        <th>Status</th>
                        <th>Invited</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumni.map(a => (
                        <tr key={a.id}>
                          <td>{a.firstName} {a.lastName}</td>
                          <td>{a.email}</td>
                          <td>{a.graduationYear || '—'}</td>
                          <td>{a.program || '—'}</td>
                          <td><span className={`${css.statusBadge} ${css['status_' + a.status]}`}>{a.status}</span></td>
                          <td>{new Date(a.invitedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && !fetchInProgress && (
            <div className={css.reportsSection}>
              <div className={css.reportsSectionHeader}>
                <h2 className={css.sectionTitle}>
                  <FormattedMessage id="EducationDashboardPage.reportsTitle" />
                  <HelpTip
                    content={intl.formatMessage({ id: 'EducationDashboardPage.helpReports' })}
                    title={intl.formatMessage({ id: 'EducationDashboardPage.helpReportsTitle' })}
                    position="right"
                    size="large"
                  />
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
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpReportsSummary' })}
                      position="right"
                      size="medium"
                    />
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
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpReportsActivity' })}
                      position="right"
                      size="medium"
                    />
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
                                    handleTabChange('students');
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
                    <HelpTip
                      content={intl.formatMessage({ id: 'EducationDashboardPage.helpReportsEngagement' })}
                      position="right"
                      size="medium"
                    />
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

          {/* Branding & Settings Tab */}
          {activeTab === 'branding' && (
            <div className={css.brandingSection}>
              <h2 className={css.sectionTitle}>
                <FormattedMessage id="EducationDashboardPage.brandingTitle" />
                <HelpTip
                  content={intl.formatMessage({ id: 'EducationDashboardPage.helpBranding' })}
                  title={intl.formatMessage({ id: 'EducationDashboardPage.helpBrandingTitle' })}
                  position="right"
                  size="large"
                />
              </h2>

              {tenantSaveSuccess && (
                <div className={css.successMessage}>
                  <FormattedMessage id="EducationDashboardPage.settingsSaved" />
                </div>
              )}

              {tenant ? (
                <>
                  {/* Branding Form */}
                  <div className={css.settingsCard}>
                    <h3><FormattedMessage id="EducationDashboardPage.portalBranding" /></h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      dispatch(saveTenantBranding({
                        marketplaceName: formData.get('marketplaceName'),
                        marketplaceColor: formData.get('marketplaceColor'),
                        logoUrl: formData.get('logoUrl'),
                      }));
                    }}>
                      <label className={css.formLabel}>
                        <FormattedMessage id="EducationDashboardPage.portalName" />
                        <HelpTip
                          content={intl.formatMessage({ id: 'EducationDashboardPage.helpPortalName' })}
                          position="right"
                          size="small"
                        />
                        <input type="text" name="marketplaceName" defaultValue={tenant.branding?.marketplaceName || ''} className={css.formInput} />
                      </label>
                      <label className={css.formLabel}>
                        <FormattedMessage id="EducationDashboardPage.brandColor" />
                        <HelpTip
                          content={intl.formatMessage({ id: 'EducationDashboardPage.helpBrandColor' })}
                          position="right"
                          size="small"
                        />
                        <div className={css.colorPickerRow}>
                          <input type="color" name="marketplaceColor" defaultValue={tenant.branding?.marketplaceColor || '#2D5BE3'} className={css.colorPicker} />
                        </div>
                      </label>
                      <label className={css.formLabel}>
                        <FormattedMessage id="EducationDashboardPage.logoUrl" />
                        <HelpTip
                          content={intl.formatMessage({ id: 'EducationDashboardPage.helpLogoUrl' })}
                          position="right"
                          size="medium"
                        />
                        <input type="url" name="logoUrl" defaultValue={tenant.branding?.logoUrl || ''} className={css.formInput} />
                      </label>
                      <button type="submit" className={css.submitButton} disabled={tenantSaveInProgress}>
                        {tenantSaveInProgress
                          ? intl.formatMessage({ id: 'EducationDashboardPage.saving' })
                          : intl.formatMessage({ id: 'EducationDashboardPage.saveBranding' })}
                      </button>
                    </form>
                  </div>

                  {/* Features Form */}
                  <div className={css.settingsCard}>
                    <h3>
                      <FormattedMessage id="EducationDashboardPage.featureToggles" />
                      <HelpTip
                        content={intl.formatMessage({ id: 'EducationDashboardPage.helpFeatureToggles' })}
                        position="right"
                        size="medium"
                      />
                    </h3>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      dispatch(saveTenantSettings({
                        aiCoaching: formData.get('aiCoaching') === 'on',
                        assessments: formData.get('assessments') === 'on',
                      }));
                    }}>
                      <label className={css.toggleLabel}>
                        <input type="checkbox" name="aiCoaching" defaultChecked={tenant.features?.aiCoaching} />
                        <FormattedMessage id="EducationDashboardPage.featureAiCoaching" />
                        <HelpTip
                          content={intl.formatMessage({ id: 'EducationDashboardPage.helpFeatureAiCoaching' })}
                          position="right"
                          size="small"
                        />
                      </label>
                      <label className={css.toggleLabel}>
                        <input type="checkbox" name="assessments" defaultChecked={tenant.features?.assessments} />
                        <FormattedMessage id="EducationDashboardPage.featureAssessments" />
                        <HelpTip
                          content={intl.formatMessage({ id: 'EducationDashboardPage.helpFeatureAssessments' })}
                          position="right"
                          size="small"
                        />
                      </label>
                      <button type="submit" className={css.submitButton} disabled={tenantSaveInProgress}>
                        {tenantSaveInProgress
                          ? intl.formatMessage({ id: 'EducationDashboardPage.saving' })
                          : intl.formatMessage({ id: 'EducationDashboardPage.saveSettings' })}
                      </button>
                    </form>
                  </div>

                  {/* Landing Page Section Visibility */}
                  <div className={css.settingsCard}>
                    <h3>Landing Page Sections</h3>
                    <p className={css.cardDescription}>
                      Choose which sections appear on your institution's landing page. Sections disabled by the platform administrator cannot be re-enabled here.
                    </p>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target);
                      const sectionVisibility = {};
                      ['hero', 'statistics', 'features', 'howItWorks', 'videoTestimonial', 'testimonials', 'aiCoaching', 'cta'].forEach(key => {
                        sectionVisibility[key] = formData.get(key) === 'on';
                      });
                      dispatch(saveTenantSettings({ sectionVisibility }));
                    }}>
                      {[
                        { key: 'hero', label: 'Hero Banner' },
                        { key: 'statistics', label: 'Statistics' },
                        { key: 'features', label: 'Features / Why Us' },
                        { key: 'howItWorks', label: 'How It Works' },
                        { key: 'videoTestimonial', label: 'Video Testimonial' },
                        { key: 'testimonials', label: 'Written Testimonials' },
                        { key: 'aiCoaching', label: 'AI Coaching' },
                        { key: 'cta', label: 'Call to Action' },
                      ].map(section => (
                        <label key={section.key} className={css.toggleLabel}>
                          <input
                            type="checkbox"
                            name={section.key}
                            defaultChecked={tenant?.sectionVisibility?.[section.key] !== false}
                          />
                          {section.label}
                        </label>
                      ))}
                      <button type="submit" className={css.submitButton} disabled={tenantSaveInProgress}>
                        {tenantSaveInProgress
                          ? intl.formatMessage({ id: 'EducationDashboardPage.saving' })
                          : 'Save Section Visibility'}
                      </button>
                    </form>
                  </div>

                  {/* Tenant Info */}
                  <div className={css.settingsCard}>
                    <h3><FormattedMessage id="EducationDashboardPage.portalInfo" /></h3>
                    <p><strong>Status:</strong> <span className={`${css.statusBadge} ${css['status_' + tenant.status]}`}>{tenant.status}</span></p>
                    <p><strong>Domain:</strong> {tenant.domain}</p>
                    <p><strong>Tenant ID:</strong> {tenant.id}</p>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon="🏛️"
                  title={intl.formatMessage({ id: 'EducationDashboardPage.emptyBrandingTitle' })}
                  description={intl.formatMessage({ id: 'EducationDashboardPage.emptyBrandingDescription' })}
                  size="medium"
                />
              )}
            </div>
          )}
          </DashboardErrorBoundary>
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
    tenant,
    tenantFetchInProgress,
    tenantSaveInProgress,
    tenantSaveSuccess,
    tenantRequestSubmitted,
    tenantRequestInProgress,
    alumni,
    alumniPagination,
    alumniFetchInProgress,
    alumniInviteInProgress,
    alumniInviteSuccess,
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
    tenant: typeof tenant !== 'undefined' ? tenant : null,
    tenantFetchInProgress: tenantFetchInProgress || false,
    tenantSaveInProgress: tenantSaveInProgress || false,
    tenantSaveSuccess: tenantSaveSuccess || false,
    tenantRequestSubmitted: tenantRequestSubmitted || false,
    tenantRequestInProgress: tenantRequestInProgress || false,
    alumni: alumni || [],
    alumniPagination: alumniPagination || null,
    alumniFetchInProgress: alumniFetchInProgress || false,
    alumniInviteInProgress: alumniInviteInProgress || false,
    alumniInviteSuccess: alumniInviteSuccess || false,
    alumniDeleteInProgress: state.EducationDashboardPage.alumniDeleteInProgress || false,
    alumniResendInProgress: state.EducationDashboardPage.alumniResendInProgress || false,
    studentsDetail: state.EducationDashboardPage.studentsDetail || [],
    studentsPagination: state.EducationDashboardPage.studentsPagination || null,
    studentsFetchInProgress: state.EducationDashboardPage.studentsFetchInProgress || false,
    studentStats: state.EducationDashboardPage.studentStats || null,
    reportsOverview: state.EducationDashboardPage.reportsOverview || null,
    reportsFetchInProgress: state.EducationDashboardPage.reportsFetchInProgress || false,
    logoUploadInProgress: state.EducationDashboardPage.logoUploadInProgress || false,
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
  onDeleteAlumni: alumniId => dispatch(deleteAlumniAction(alumniId)),
  onResendInvitation: alumniId => dispatch(resendAlumniInvitationAction(alumniId)),
  onUploadLogo: (logoData, mimeType) => dispatch(uploadTenantLogoAction(logoData, mimeType)),
  onFetchStudents: params => dispatch(fetchStudentsAction(params)),
  onFetchStudentStats: () => dispatch(fetchStudentStatsAction()),
  onFetchReportsOverview: params => dispatch(fetchReportsOverviewAction(params)),
  dispatch,
});

const EducationDashboardPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EducationDashboardPageComponent);

export default EducationDashboardPage;
