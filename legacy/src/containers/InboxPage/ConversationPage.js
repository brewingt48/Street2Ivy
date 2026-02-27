/**
 * ConversationPage — displays the full message thread for a custom application conversation.
 *
 * Route: /inbox/conversation/:id
 *
 * This is NOT the Sharetribe TransactionPage — it uses our custom SQLite-backed
 * messaging API (Phase 4 endpoints) for free-form conversations between
 * students and corporate partners.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { connect } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';
import {
  fetchConversationMessages,
  sendConversationMessage,
  markConversationRead,
} from '../../util/api';
import {
  H2,
  Page,
  IconSpinner,
  LayoutSideNavigation,
} from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './ConversationPage.module.css';

const ConversationPage = props => {
  const { currentUser } = props;
  const intl = useIntl();
  const history = useHistory();
  const { id: applicationId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const messagesEndRef = useRef(null);

  const currentUserId = currentUser?.id?.uuid;

  // Fetch conversation data
  const loadConversation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchConversationMessages(applicationId);
      setApplication(response.application);
      setMessages(response.messages || []);
      // Mark messages as read
      markConversationRead(applicationId).catch(() => {});
    } catch (err) {
      console.error('[ConversationPage] Failed to load:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (applicationId) {
      loadConversation();
    }
  }, [applicationId, loadConversation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message handler
  const handleSend = async e => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || sending) return;

    try {
      setSending(true);
      setSendError(null);
      const response = await sendConversationMessage(applicationId, text);
      setMessages(prev => [...prev, response.message]);
      setMessageText('');
    } catch (err) {
      console.error('[ConversationPage] Send failed:', err);
      setSendError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const isStudent = application?.studentId === currentUserId;
  const otherPartyName = isStudent
    ? (application?.corporateName || 'Corporate Partner')
    : (application?.studentName || 'Student');

  const formatTime = dateStr => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Status badge
  const statusLabelMap = {
    pending: 'Pending',
    invited: 'Invited',
    accepted: 'Accepted',
    student_accepted: 'Accepted',
    rejected: 'Declined',
    declined: 'Declined',
    withdrawn: 'Withdrawn',
    completed: 'Completed',
  };

  const canSendMessage = application && !['withdrawn', 'cancelled'].includes(application.status);

  return (
    <Page title={`Conversation — ${application?.listingTitle || 'Loading...'}`} scrollingDisabled={false}>
      <LayoutSideNavigation
        topbar={<TopbarContainer />}
        sideNav={null}
        footer={<FooterContainer />}
      >
        <div className={css.root}>
          {/* Header */}
          <div className={css.header}>
            <button className={css.backButton} onClick={() => history.push('/inbox/messages')}>
              ← Back to Messages
            </button>
            <div className={css.headerInfo}>
              <h2 className={css.headerTitle}>{application?.listingTitle || 'Loading...'}</h2>
              <div className={css.headerMeta}>
                <span className={css.headerOtherParty}>{otherPartyName}</span>
                {application?.status && (
                  <span className={css.headerStatus}>
                    {statusLabelMap[application.status] || application.status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className={css.messagesContainer}>
            {loading ? (
              <div className={css.loadingContainer}>
                <IconSpinner />
                <span className={css.loadingText}>Loading conversation...</span>
              </div>
            ) : error ? (
              <div className={css.errorContainer}>
                <p>{error}</p>
                <button onClick={loadConversation} className={css.retryButton}>Retry</button>
              </div>
            ) : messages.length === 0 ? (
              <div className={css.emptyMessages}>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className={css.messagesList}>
                {messages.map(msg => {
                  const isOwn = msg.senderId === currentUserId;
                  const isSystem = msg.messageType === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className={css.systemMessage}>
                        <span className={css.systemMessageText}>{msg.content}</span>
                        <span className={css.systemMessageTime}>{formatTime(msg.createdAt)}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={classNames(css.messageBubbleRow, { [css.messageBubbleRowOwn]: isOwn })}>
                      {!isOwn && (
                        <div className={css.messageAvatar}>
                          {(msg.senderName || '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className={classNames(css.messageBubble, { [css.messageBubbleOwn]: isOwn })}>
                        {!isOwn && <span className={css.messageSenderName}>{msg.senderName}</span>}
                        <p className={css.messageContent}>{msg.content}</p>
                        <span className={css.messageTime}>{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Send message form */}
          {canSendMessage && (
            <form className={css.sendForm} onSubmit={handleSend}>
              {sendError && <div className={css.sendError}>{sendError}</div>}
              <div className={css.sendFormRow}>
                <textarea
                  className={css.messageInput}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  maxLength={5000}
                  disabled={sending}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  className={css.sendButton}
                  disabled={!messageText.trim() || sending}
                >
                  {sending ? '...' : 'Send'}
                </button>
              </div>
            </form>
          )}

          {!canSendMessage && application && (
            <div className={css.closedNotice}>
              This conversation is closed ({statusLabelMap[application.status] || application.status}).
            </div>
          )}
        </div>
      </LayoutSideNavigation>
    </Page>
  );
};

const mapStateToProps = state => ({
  currentUser: state.user.currentUser,
});

export default connect(mapStateToProps)(ConversationPage);
