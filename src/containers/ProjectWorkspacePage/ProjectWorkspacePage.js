import React, { useState, useEffect, useRef } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { useParams } from 'react-router-dom';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import {
  Page,
  LayoutSingleColumn,
  NamedLink,
} from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import {
  fetchWorkspace,
  sendMessage,
  acceptNda,
  markMessagesRead,
  fetchNdaStatus,
  signNdaDocument,
  requestNdaSignatures,
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
      message = 'You have not been accepted for this project yet. The corporate partner is reviewing your application. You will gain access to the project workspace once you are accepted.';
      break;
    case 'deposit_pending':
      icon = '';
      title = 'Deposit Pending';
      message = "Great news - you've been accepted for this project! However, access to the project workspace is pending until the corporate partner's deposit is confirmed by Street2Ivy. You will receive a notification once you have full access.";
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

// ================ NDA E-Signature Section ================ //

const NdaSignatureSection = ({
  ndaRequired,
  ndaSignatureStatus,
  currentUserId,
  isProvider,
  onRequestSignatures,
  onSignNda,
  signInProgress,
  requestInProgress,
}) => {
  const [showNdaText, setShowNdaText] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signatureText, setSignatureText] = useState('');

  if (!ndaRequired) return null;

  const signatureRequest = ndaSignatureStatus?.signatureRequest;
  const hasSignatureRequest = ndaSignatureStatus?.hasSignatureRequest;
  const currentUserSigner = ndaSignatureStatus?.currentUserSigner;
  const allSigned = signatureRequest?.status === 'completed';

  // If fully signed, show completion status
  if (allSigned) {
    return (
      <div className={css.ndaSection} style={{ background: '#dcfce7', borderColor: '#86efac' }}>
        <div className={css.ndaSignedStatus}>
          <h3 className={css.ndaTitle}>NDA Fully Signed</h3>
          <p className={css.ndaCompletedText}>
            All parties have signed the Non-Disclosure Agreement.
          </p>
          <div className={css.signersStatus}>
            {signatureRequest?.signers?.map(signer => (
              <div key={signer.role} className={css.signerItem}>
                <span className={css.signerName}>{signer.name}</span>
                <span className={css.signerRole}>({signer.role === 'provider' ? 'Corporate Partner' : 'Student'})</span>
                <span className={css.signedBadge}>Signed {new Date(signer.signedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          {signatureRequest?.signedDocumentUrl && (
            <a
              href={signatureRequest.signedDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={css.downloadNdaButton}
            >
              Download Signed NDA
            </a>
          )}
        </div>
      </div>
    );
  }

  // If no signature request exists and user is provider, show option to initiate
  if (!hasSignatureRequest && isProvider) {
    return (
      <div className={css.ndaSection}>
        <h3 className={css.ndaTitle}>NDA Required</h3>
        <p className={css.ndaText}>
          This project requires an NDA. Click below to initiate the signature process for both you and the student.
        </p>
        <button
          className={css.ndaAcceptButton}
          onClick={onRequestSignatures}
          disabled={requestInProgress}
        >
          {requestInProgress ? 'Initiating...' : 'Initiate NDA Signing'}
        </button>
      </div>
    );
  }

  // Show signing interface
  const userHasSigned = currentUserSigner?.status === 'signed';

  return (
    <div className={css.ndaSection}>
      <h3 className={css.ndaTitle}>Non-Disclosure Agreement</h3>

      {/* Signature Status */}
      <div className={css.signatureStatusBar}>
        {signatureRequest?.signers?.map(signer => (
          <div
            key={signer.role}
            className={`${css.signerStatusItem} ${signer.status === 'signed' ? css.signed : css.pending}`}
          >
            <span className={css.statusIcon}>{signer.status === 'signed' ? '✓' : '○'}</span>
            <span className={css.signerLabel}>
              {signer.role === 'provider' ? 'Corporate Partner' : 'Student'}
            </span>
            <span className={css.signerStatus}>
              {signer.status === 'signed' ? 'Signed' : 'Pending'}
            </span>
          </div>
        ))}
      </div>

      {/* If user hasn't signed yet, show signing form */}
      {!userHasSigned ? (
        <div className={css.signingForm}>
          {/* NDA Text Preview */}
          <div className={css.ndaPreview}>
            <button
              type="button"
              className={css.toggleNdaButton}
              onClick={() => setShowNdaText(!showNdaText)}
            >
              {showNdaText ? 'Hide NDA Text' : 'View NDA Agreement'}
            </button>
            {showNdaText && signatureRequest?.ndaText && (
              <div className={css.ndaTextContent}>
                <pre className={css.ndaTextPre}>{signatureRequest.ndaText}</pre>
              </div>
            )}
          </div>

          {/* Signature Input */}
          <div className={css.signatureInput}>
            <label className={css.signatureLabel}>
              Type your full name to sign:
            </label>
            <input
              type="text"
              className={css.signatureField}
              value={signatureText}
              onChange={e => setSignatureText(e.target.value)}
              placeholder="Your Full Legal Name"
            />
          </div>

          {/* Agreement Checkbox */}
          <div className={css.agreementCheckbox}>
            <label className={css.checkboxLabel}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
              />
              <span>
                I have read and agree to the terms of this Non-Disclosure Agreement.
                I understand this is a legally binding document.
              </span>
            </label>
          </div>

          {/* Sign Button */}
          <button
            className={css.signNdaButton}
            onClick={() => onSignNda(signatureText)}
            disabled={signInProgress || !agreedToTerms || !signatureText.trim()}
          >
            {signInProgress ? 'Signing...' : 'Sign NDA Electronically'}
          </button>
        </div>
      ) : (
        <div className={css.waitingForOther}>
          <p className={css.waitingText}>
            You have signed the NDA. Waiting for the other party to sign.
          </p>
        </div>
      )}
    </div>
  );
};

// Legacy NDA Section (simple acceptance without e-signature)
const NdaSection = ({ ndaRequired, ndaAccepted, onAcceptNda, acceptInProgress }) => {
  if (!ndaRequired) return null;

  if (ndaAccepted) {
    return (
      <div className={css.ndaSection} style={{ background: '#dcfce7', borderColor: '#86efac' }}>
        <div className={css.ndaAccepted}>
          <span>NDA Accepted</span>
        </div>
      </div>
    );
  }

  return (
    <div className={css.ndaSection}>
      <h3 className={css.ndaTitle}>
        <FormattedMessage id="ProjectWorkspacePage.ndaRequired" />
      </h3>
      <p className={css.ndaText}>
        <FormattedMessage id="ProjectWorkspacePage.ndaDescription" />
      </p>
      <button
        className={css.ndaAcceptButton}
        onClick={onAcceptNda}
        disabled={acceptInProgress}
      >
        {acceptInProgress ? 'Accepting...' : 'I Accept the NDA'}
      </button>
    </div>
  );
};

// ================ Messages Section ================ //

const MessagesSection = ({
  messages,
  currentUserId,
  onSendMessage,
  sendInProgress,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!newMessage.trim() || sendInProgress) return;

    await onSendMessage(newMessage.trim());
    setNewMessage('');
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
                <div className={css.messageBubble}>{msg.content}</div>
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
        <form className={css.messageForm} onSubmit={handleSubmit}>
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
            disabled={!newMessage.trim() || sendInProgress}
          >
            {sendInProgress ? '...' : 'Send'}
          </button>
        </form>
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
    acceptNdaInProgress,
    ndaSignatureStatus,
    signNdaInProgress,
    requestNdaInProgress,
    onFetchWorkspace,
    onSendMessage,
    onAcceptNda,
    onMarkMessagesRead,
    onFetchNdaStatus,
    onSignNda,
    onRequestSignatures,
  } = props;

  const intl = useIntl();
  const params = useParams();
  const transactionId = params.id;

  useEffect(() => {
    if (transactionId) {
      onFetchWorkspace(transactionId);
      onFetchNdaStatus(transactionId);
    }
  }, [transactionId, onFetchWorkspace, onFetchNdaStatus]);

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

  const handleSendMessage = async content => {
    await onSendMessage(transactionId, content);
  };

  const handleAcceptNda = async () => {
    await onAcceptNda(transactionId);
  };

  const handleSignNda = async signatureData => {
    await onSignNda(transactionId, signatureData);
  };

  const handleRequestSignatures = async () => {
    await onRequestSignatures(transactionId);
  };

  const title = intl.formatMessage({ id: 'ProjectWorkspacePage.title' });

  // Loading state
  if (fetchInProgress) {
    return (
      <Page title={title} scrollingDisabled={scrollingDisabled}>
        <LayoutSingleColumn
          topbar={<TopbarContainer />}
          footer={<FooterContainer />}
        >
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
        <LayoutSingleColumn
          topbar={<TopbarContainer />}
          footer={<FooterContainer />}
        >
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
        <LayoutSingleColumn
          topbar={<TopbarContainer />}
          footer={<FooterContainer />}
        >
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

  const {
    listing,
    provider,
    customer,
    messages = [],
    ndaRequired,
    ndaAccepted,
  } = workspace;

  const confidential = listing?.confidentialDetails || {};
  const isCustomer = currentUser?.id?.uuid === customer?.id;
  const isProvider = currentUser?.id?.uuid === provider?.id;

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
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
                <span className={css.confidentialBadge}>
                  Confidential
                </span>
              </div>

              {/* NDA E-Signature Section (for both provider and customer) */}
              <NdaSignatureSection
                ndaRequired={ndaRequired}
                ndaSignatureStatus={ndaSignatureStatus}
                currentUserId={currentUser?.id?.uuid}
                isProvider={isProvider}
                onRequestSignatures={handleRequestSignatures}
                onSignNda={handleSignNda}
                signInProgress={signNdaInProgress}
                requestInProgress={requestNdaInProgress}
              />

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
                  <p className={css.infoValue}>{listing?.publicData?.compensationAmount || 'TBD'}</p>
                </div>
                <div className={css.infoCard}>
                  <p className={css.infoLabel}>Deadline</p>
                  <p className={css.infoValue}>{listing?.publicData?.deadline || 'TBD'}</p>
                </div>
              </div>

              {/* Confidential Details - Show only if NDA is signed or not required */}
              {(!ndaRequired || ndaSignatureStatus?.signatureRequest?.status === 'completed') && (
                <div className={css.confidentialSection}>
                  <h3 className={css.confidentialTitle}>
                    Confidential Project Information
                  </h3>
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
              )}
            </div>

            {/* Messages Section */}
            <MessagesSection
              messages={messages}
              currentUserId={currentUser?.id?.uuid}
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
    acceptNdaInProgress,
    ndaSignatureStatus,
    signNdaInProgress,
    requestNdaInProgress,
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
    acceptNdaInProgress,
    ndaSignatureStatus,
    signNdaInProgress,
    requestNdaInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onFetchWorkspace: transactionId => dispatch(fetchWorkspace(transactionId)),
  onSendMessage: (transactionId, content) => dispatch(sendMessage(transactionId, content)),
  onAcceptNda: transactionId => dispatch(acceptNda(transactionId)),
  onMarkMessagesRead: (transactionId, messageIds) =>
    dispatch(markMessagesRead(transactionId, messageIds)),
  onFetchNdaStatus: transactionId => dispatch(fetchNdaStatus(transactionId)),
  onSignNda: (transactionId, signatureData) => dispatch(signNdaDocument(transactionId, signatureData)),
  onRequestSignatures: transactionId => dispatch(requestNdaSignatures(transactionId)),
});

const ProjectWorkspacePage = compose(
  connect(mapStateToProps, mapDispatchToProps)
)(ProjectWorkspacePageComponent);

export default ProjectWorkspacePage;
