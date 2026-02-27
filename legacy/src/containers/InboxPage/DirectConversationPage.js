/**
 * DirectConversationPage — displays a direct message thread (user ↔ admin).
 *
 * Route: /inbox/direct/:threadId
 *
 * Uses the direct_messages SQLite table and /api/direct-messages/* endpoints.
 * Nearly identical to ConversationPage.js but for admin/direct threads.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { connect } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import classNames from 'classnames';

import { useIntl } from '../../util/reactIntl';
import {
  fetchDirectMessages,
  sendDirectMessageReply,
  markDirectMessageRead,
} from '../../util/api';
import {
  Page,
  IconSpinner,
  LayoutSideNavigation,
} from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

// Re-use ConversationPage styles — same chat bubble layout
import css from './ConversationPage.module.css';

const DirectConversationPage = props => {
  const { currentUser } = props;
  const intl = useIntl();
  const history = useHistory();
  const { threadId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherUserId, setOtherUserId] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const messagesEndRef = useRef(null);

  const currentUserId = currentUser?.id?.uuid;

  // Derive the other party's name from the first message that isn't ours
  const otherPartyName = (() => {
    for (const msg of messages) {
      if (msg.senderId !== currentUserId) {
        return msg.senderName || 'User';
      }
    }
    // If all messages are ours, check recipient name from first message
    if (messages.length > 0) {
      return messages[0].recipientName || 'User';
    }
    return 'User';
  })();

  // Derive thread subject from first message
  const threadSubject = (() => {
    for (const msg of messages) {
      if (msg.subject) return msg.subject;
    }
    return null;
  })();

  // Fetch thread data
  const loadThread = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchDirectMessages(threadId);
      setMessages(response.messages || []);
      setOtherUserId(response.otherUserId);
      // Mark messages as read
      markDirectMessageRead(threadId).catch(() => {});
    } catch (err) {
      console.error('[DirectConversationPage] Failed to load:', err);
      setError(err.message || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    if (threadId) {
      loadThread();
    }
  }, [threadId, loadThread]);

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
      const response = await sendDirectMessageReply(threadId, text);
      setMessages(prev => [...prev, response.message]);
      setMessageText('');
    } catch (err) {
      console.error('[DirectConversationPage] Send failed:', err);
      setSendError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

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

  const pageTitle = threadSubject
    ? `${otherPartyName} — ${threadSubject}`
    : `Conversation with ${otherPartyName}`;

  return (
    <Page title={pageTitle} scrollingDisabled={false}>
      <LayoutSideNavigation
        topbar={<TopbarContainer />}
        sideNav={null}
        footer={<FooterContainer />}
      >
        <div className={css.root}>
          {/* Header */}
          <div className={css.header}>
            <button className={css.backButton} onClick={() => history.push('/inbox/messages')}>
              &larr; Back to Messages
            </button>
            <div className={css.headerInfo}>
              <h2 className={css.headerTitle}>
                {threadSubject || 'Direct Message'}
              </h2>
              <div className={css.headerMeta}>
                <span className={css.headerOtherParty}>{otherPartyName}</span>
                <span className={css.headerStatus}>Direct</span>
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
                <button onClick={loadThread} className={css.retryButton}>Retry</button>
              </div>
            ) : messages.length === 0 ? (
              <div className={css.emptyMessages}>
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className={css.messagesList}>
                {messages.map(msg => {
                  const isOwn = msg.senderId === currentUserId;

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
        </div>
      </LayoutSideNavigation>
    </Page>
  );
};

const mapStateToProps = state => ({
  currentUser: state.user.currentUser,
});

export default connect(mapStateToProps)(DirectConversationPage);
