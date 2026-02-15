import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import {
  fetchWorkspace,
  sendMessage,
  markMessagesRead,
} from './ProjectWorkspacePage.duck';

import css from './ProjectWorkspacePage.module.css';

// ================ Access Denied Component ================ //

const AccessDeniedView = ({ reason, depositConfirmed, transactionState }) => {
  let icon = '';
  let title = '';
  let message = '';

  switch (reason) {
    case 'not_accepted':
      icon = '';
      title = 'Awaiting Acceptance';
      message =
        'You have not been accepted for this project yet. The corporate partner is reviewing your application. You will gain access to the project workspace once you are accepted.';
      break;
    case 'deposit_pending':
      icon = '';
      title = 'Deposit Pending';
      message =
        "Great news - you've been accepted for this project! However, access to the project workspace is pending until the corporate partner's deposit is confirmed by Street2Ivy. You will receive a notification once you have full access.";
      break;
    case 'unauthorized':
    default:
      icon = '';
      title = 'Access Restricted';
      message = 'You do not have permission to access this project workspace.';
      break;
  }

  return (
    <div className={css.accessDenied}>
      <div className={css.accessIcon}>{icon}</div>
      <h2>{title}</h2>
      <p>{message}</p>
      <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.backButton}>
        <FormattedMessage id="ProjectWorkspacePage.backToInbox" />
      </NamedLink>
    </div>
  );
};

// ================ Messages Section ================ //

// File type icons for attachments
const FILE_TYPE_ICONS = {
  pdf: '📄',
  document: '📝',
  spreadsheet: '📊',
  presentation: '📽️',
  image: '🖼️',
  file: '📎',
};

// Allowed file types
const ALLOWED_FILE_TYPES = ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.doc', '.xls', '.ppt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const getFileExtension = filename => filename.slice(filename.lastIndexOf('.')).toLowerCase();

const getFileTypeCategory = filename => {
  const ext = getFileExtension(filename);
  if (['.pdf'].includes(ext)) return 'pdf';
  if (['.doc', '.docx'].includes(ext)) return 'document';
  if (['.xls', '.xlsx'].includes(ext)) return 'spreadsheet';
  if (['.ppt', '.pptx'].includes(ext)) return 'presentation';
  if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) return 'image';
  return 'file';
};

const formatFileSize = bytes => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const MessagesSection = ({ messages, currentUserId, transactionId, onSendMessage, sendInProgress }) => {
  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [attachmentError, setAttachmentError] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async e => {
    e.preventDefault();
    if ((!newMessage.trim() && pendingAttachments.length === 0) || sendInProgress) return;

    // Send message with attachments
    await onSendMessage(newMessage.trim(), pendingAttachments);
    setNewMessage('');
    setPendingAttachments([]);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = event => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setAttachmentError(null);
    const newAttachments = [];

    for (const file of files) {
      const ext = getFileExtension(file.name);

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(ext)) {
        setAttachmentError(`File type ${ext} is not supported`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError('File size exceeds 10MB limit');
        continue;
      }

      newAttachments.push({
        id: `local-${Date.now()}-${file.name}`,
        file,
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        fileType: getFileTypeCategory(file.name),
        isLocal: true,
      });
    }

    setPendingAttachments([...pendingAttachments, ...newAttachments]);
    event.target.value = '';
  };

  const handleRemoveAttachment = attachmentToRemove => {
    setPendingAttachments(pendingAttachments.filter(a => a.id !== attachmentToRemove.id));
  };

  const formatTime = dateString => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className={css.messagesSection}>
      <div className={css.messagesHeader}>
        <h3 className={css.messagesTitle}>
          <FormattedMessage id="ProjectWorkspacePage.secureMessages" />
        </h3>
      </div>

      <div className={css.messagesList}>
        {messages.length === 0 ? (
          <div className={css.noMessages}>
            <FormattedMessage id="ProjectWorkspacePage.noMessages" />
          </div>
        ) : (
          messages.map(msg => {
            const isSent = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`${css.messageItem} ${isSent ? css.sent : css.received}`}
              >
                <div className={css.messageBubble}>
                  {msg.content}
                  {/* Display attachments if present */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={css.messageAttachments}>
                      {msg.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={css.attachmentLink}
                          download
                        >
                          <span className={css.attachmentIcon}>
                            {FILE_TYPE_ICONS[att.fileType] || '📎'}
                          </span>
                          <span className={css.attachmentName}>{att.name}</span>
                          <span className={css.attachmentSize}>{att.sizeFormatted}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className={css.messageMeta}>
                  {!isSent && <span className={css.messageSender}>{msg.senderName}</span>}
                  <span>{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={css.messageInput}>
        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className={css.pendingAttachments}>
            {pendingAttachments.map(att => (
              <div key={att.id} className={css.pendingAttachment}>
                <span className={css.pendingAttachmentIcon}>
                  {FILE_TYPE_ICONS[att.fileType] || '📎'}
                </span>
                <span className={css.pendingAttachmentName}>{att.name}</span>
                <button
                  type="button"
                  className={css.removeAttachmentBtn}
                  onClick={() => handleRemoveAttachment(att)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {attachmentError && (
          <div className={css.attachmentError}>
            ⚠️ {attachmentError}
          </div>
        )}

        <form className={css.messageForm} onSubmit={handleSubmit}>
          {/* Attachment button */}
          <button
            type="button"
            className={css.attachButton}
            onClick={handleAttachClick}
            title="Attach files (PDF, Word, Excel, PowerPoint, images)"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className={css.hiddenFileInput}
            onChange={handleFileSelect}
            accept={ALLOWED_FILE_TYPES.join(',')}
            multiple
          />

          <textarea
            className={css.messageTextarea}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a secure message..."
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            className={css.sendButton}
            disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sendInProgress}
          >
            {sendInProgress ? '...' : 'Send'}
          </button>
        </form>
        <div className={css.attachmentHint}>
          PDF, Word, Excel, PowerPoint, images (max 10MB)
        </div>
      </div>
    </div>
  );
};

// ================ Main Component ================ //

const ProjectWorkspacePageComponent = props => {
  const {
    scrollingDisabled,
    currentUser,
    workspace,
    accessGranted,
    accessDeniedReason,
    fetchInProgress,
    fetchError,
    sendMessageInProgress,
    onFetchWorkspace,
    onSendMessage,
    onMarkMessagesRead,
  } = props;

  const intl = useIntl();
  const params = useParams();
  const transactionId = params.id;

  useEffect(() => {
    if (transactionId) {
      onFetchWorkspace(transactionId);
    }
  }, [transactionId, onFetchWorkspace]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (workspace?.messages && currentUser) {
      const unreadIds = workspace.messages
        .filter(msg => msg.senderId !== currentUser.id.uuid && !msg.readAt)
        .map(msg => msg.id);

      if (unreadIds.length > 0) {
        onMarkMessagesRead(transactionId, unreadIds);
      }
    }
  }, [workspace?.messages, currentUser, transactionId, onMarkMessagesRead]);

  const handleSendMessage = async (content, attachments = []) => {
    await onSendMessage(transactionId, content, attachments);
  };

  const title = intl.formatMessage({ id: 'ProjectWorkspacePage.title' });

  // Loading state
  if (fetchInProgress) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.loadingState}>
            <FormattedMessage id="ProjectWorkspacePage.loading" />
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  // Access denied state
  if (!accessGranted && accessDeniedReason) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <AccessDeniedView
            reason={accessDeniedReason}
            depositConfirmed={workspace?.transaction?.metadata?.depositConfirmed}
            transactionState={workspace?.transactionState}
          />
        </LayoutSingleColumn>
      </Page>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
          <div className={css.accessDenied}>
            <h2>Unable to Load Workspace</h2>
            <p>There was an error loading the project workspace. Please try again later.</p>
            <NamedLink name="InboxPage" params={{ tab: 'orders' }} className={css.backButton}>
              <FormattedMessage id="ProjectWorkspacePage.backToInbox" />
            </NamedLink>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  // No workspace data
  if (!workspace) {
    return null;
  }

  const { listing, provider, customer, messages = [] } = workspace;

  const confidential = listing?.confidentialDetails || {};
  const isCustomer = currentUser?.id?.uuid === customer?.id;
  const isProvider = currentUser?.id?.uuid === provider?.id;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.pageContent}>
          <div className={css.pageHeader}>
            <h1 className={css.pageTitle}>{listing?.title || 'Project Workspace'}</h1>
            <p className={css.pageSubtitle}>
              <FormattedMessage
                id="ProjectWorkspacePage.subtitle"
                values={{ company: provider?.companyName || provider?.displayName }}
              />
            </p>
          </div>

          <div className={css.workspaceLayout}>
            {/* Project Details Section */}
            <div className={css.projectSection}>
              <div className={css.sectionHeader}>
                <h2 className={css.sectionTitle}>
                  <FormattedMessage id="ProjectWorkspacePage.projectDetails" />
                </h2>
                <span className={css.confidentialBadge}>Confidential</span>
              </div>

              {/* Basic Project Info */}
              <div className={css.infoGrid}>
                <div className={css.infoCard}>
                  <p className={css.infoLabel}>Company</p>
                  <p className={css.infoValue}>{provider?.companyName || provider?.displayName}</p>
                </div>
                <div className={css.infoCard}>
                  <p className={css.infoLabel}>Estimated Hours</p>
                  <p className={css.infoValue}>{listing?.publicData?.estimatedHours || 'TBD'}</p>
                </div>
                <div className={css.infoCard}>
                  <p className={css.infoLabel}>Compensation</p>
                  <p className={css.infoValue}>
                    {listing?.publicData?.compensationAmount || 'TBD'}
                  </p>
                </div>
                <div className={css.infoCard}>
                  <p className={css.infoLabel}>Deadline</p>
                  <p className={css.infoValue}>{listing?.publicData?.deadline || 'TBD'}</p>
                </div>
              </div>

              {/* Confidential Details */}
              <div className={css.confidentialSection}>
                  <h3 className={css.confidentialTitle}>Confidential Project Information</h3>
                  <div className={css.confidentialContent}>
                    {/* Project Brief */}
                    {confidential.projectBrief && (
                      <div className={css.briefSection}>
                        <p className={css.briefLabel}>Project Brief</p>
                        <p className={css.briefText}>{confidential.projectBrief}</p>
                      </div>
                    )}

                    {/* Deliverables */}
                    {confidential.deliverables && (
                      <div className={css.briefSection}>
                        <p className={css.briefLabel}>Deliverables</p>
                        <p className={css.briefText}>{confidential.deliverables}</p>
                      </div>
                    )}

                    {/* Contact Information */}
                    {(confidential.contactName || confidential.contactEmail || provider?.email) && (
                      <div className={css.contactSection}>
                        <p className={css.contactTitle}>Contact Information</p>
                        <div className={css.contactGrid}>
                          {confidential.contactName && (
                            <div className={css.contactItem}>
                              <span className={css.contactLabel}>Contact Name</span>
                              <span className={css.contactValue}>{confidential.contactName}</span>
                            </div>
                          )}
                          {(confidential.contactEmail || provider?.email) && (
                            <div className={css.contactItem}>
                              <span className={css.contactLabel}>Email</span>
                              <span className={css.contactValue}>
                                <a href={`mailto:${confidential.contactEmail || provider?.email}`}>
                                  {confidential.contactEmail || provider?.email}
                                </a>
                              </span>
                            </div>
                          )}
                          {confidential.contactPhone && (
                            <div className={css.contactItem}>
                              <span className={css.contactLabel}>Phone</span>
                              <span className={css.contactValue}>
                                <a href={`tel:${confidential.contactPhone}`}>
                                  {confidential.contactPhone}
                                </a>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {confidential.attachments && confidential.attachments.length > 0 && (
                      <div className={css.attachmentsSection}>
                        <p className={css.attachmentsTitle}>Project Files</p>
                        <div className={css.attachmentsList}>
                          {confidential.attachments.map((attachment, idx) => (
                            <a
                              key={idx}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={css.attachmentItem}
                            >
                              <span className={css.attachmentIcon}>📎</span>
                              <div className={css.attachmentInfo}>
                                <p className={css.attachmentName}>{attachment.name}</p>
                                {attachment.size && (
                                  <p className={css.attachmentSize}>{attachment.size}</p>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            </div>

            {/* Messages Section */}
            <MessagesSection
              messages={messages}
              currentUserId={currentUser?.id?.uuid}
              transactionId={transactionId}
              onSendMessage={handleSendMessage}
              sendInProgress={sendMessageInProgress}
            />
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    workspace,
    accessGranted,
    accessDeniedReason,
    fetchInProgress,
    fetchError,
    sendMessageInProgress,
  } = state.ProjectWorkspacePage;

  return {
    scrollingDisabled: isScrollingDisabled(state),
    currentUser,
    workspace,
    accessGranted,
    accessDeniedReason,
    fetchInProgress,
    fetchError,
    sendMessageInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchWorkspace: transactionId => dispatch(fetchWorkspace(transactionId)),
  onSendMessage: (transactionId, content) => dispatch(sendMessage(transactionId, content)),
  onMarkMessagesRead: (transactionId, messageIds) =>
    dispatch(markMessagesRead(transactionId, messageIds)),
});

const ProjectWorkspacePage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ProjectWorkspacePageComponent);

export default ProjectWorkspacePage;
