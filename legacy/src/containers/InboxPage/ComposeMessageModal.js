import React, { useState, useEffect, useCallback } from 'react';

import { fetchEligibleRecipients, composeMessage } from '../../util/api';
import { useIntl } from '../../util/reactIntl';

import css from './ComposeMessageModal.module.css';

const MAX_CHARS = 5000;

/**
 * ComposeMessageModal — modal for initiating a new message conversation.
 *
 * Students can message: admins (always), corporate partners (after being invited)
 * Corporate partners can message: admins (always), students (after accepting their application)
 */
const ComposeMessageModal = ({ isOpen, onClose, onSuccess }) => {
  const intl = useIntl();
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  // Load eligible recipients when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setRecipientId('');
      setSubject('');
      setContent('');

      fetchEligibleRecipients()
        .then(res => {
          setRecipients(res.recipients || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching recipients:', err);
          setError(intl.formatMessage({ id: 'ComposeMessage.error' }));
          setLoading(false);
        });
    }
  }, [isOpen, intl]);

  const handleSend = useCallback(async () => {
    if (!recipientId || !content.trim()) return;

    setSending(true);
    setError(null);

    try {
      const result = await composeMessage({
        recipientId,
        subject: subject.trim() || undefined,
        content: content.trim(),
      });

      setSuccess(true);
      setSending(false);

      // Auto-redirect after a brief pause
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        }
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(
        err.message || intl.formatMessage({ id: 'ComposeMessage.error' })
      );
      setSending(false);
    }
  }, [recipientId, subject, content, onSuccess, onClose, intl]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group recipients by type
  const adminRecipients = recipients.filter(
    r => r.userType === 'educational-admin' || r.userType === 'system-admin'
  );
  const otherRecipients = recipients.filter(
    r => r.userType !== 'educational-admin' && r.userType !== 'system-admin'
  );

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const canSend = recipientId && content.trim().length > 0 && !isOverLimit && !sending;

  return (
    <div className={css.overlay} onClick={onClose}>
      <div className={css.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={css.header}>
          <h2 className={css.title}>
            {intl.formatMessage({ id: 'ComposeMessage.title' })}
          </h2>
          <button className={css.closeButton} onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div className={css.body}>
          {success && (
            <div className={css.successMessage}>
              {intl.formatMessage({ id: 'ComposeMessage.success' })}
            </div>
          )}

          {error && (
            <div className={css.errorMessage}>{error}</div>
          )}

          {loading ? (
            <div className={css.loadingMessage}>Loading recipients...</div>
          ) : recipients.length === 0 && !error ? (
            <div className={css.noRecipients}>
              {intl.formatMessage({ id: 'ComposeMessage.noRecipients' })}
            </div>
          ) : (
            <>
              {/* Recipient selector */}
              <div className={css.field}>
                <label className={css.label} htmlFor="compose-recipient">
                  {intl.formatMessage({ id: 'ComposeMessage.recipientLabel' })}
                </label>
                <select
                  id="compose-recipient"
                  className={css.select}
                  value={recipientId}
                  onChange={e => setRecipientId(e.target.value)}
                  disabled={sending || success}
                >
                  <option value="">
                    {intl.formatMessage({ id: 'ComposeMessage.recipientPlaceholder' })}
                  </option>
                  {adminRecipients.length > 0 && (
                    <optgroup
                      label={intl.formatMessage({ id: 'ComposeMessage.sectionAdmin' })}
                      className={css.optionGroup}
                    >
                      {adminRecipients.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}{r.userType === 'system-admin' ? ' (System Admin)' : ' (Educational Admin)'}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherRecipients.length > 0 && (
                    <optgroup
                      label={
                        otherRecipients[0]?.userType === 'corporate-partner'
                          ? intl.formatMessage({ id: 'ComposeMessage.sectionPartners' })
                          : intl.formatMessage({ id: 'ComposeMessage.sectionStudents' })
                      }
                      className={css.optionGroup}
                    >
                      {otherRecipients.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {r.projectTitle ? ` — ${r.projectTitle}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Subject */}
              <div className={css.field}>
                <label className={css.label} htmlFor="compose-subject">
                  {intl.formatMessage({ id: 'ComposeMessage.subjectLabel' })}
                </label>
                <input
                  id="compose-subject"
                  type="text"
                  className={css.input}
                  placeholder={intl.formatMessage({ id: 'ComposeMessage.subjectPlaceholder' })}
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={200}
                  disabled={sending || success}
                />
              </div>

              {/* Message body */}
              <div className={css.field}>
                <label className={css.label} htmlFor="compose-content">
                  {intl.formatMessage({ id: 'ComposeMessage.contentLabel' })}
                </label>
                <textarea
                  id="compose-content"
                  className={css.textarea}
                  placeholder={intl.formatMessage({ id: 'ComposeMessage.contentPlaceholder' })}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  disabled={sending || success}
                />
                <div className={isOverLimit ? css.charCountWarning : css.charCount}>
                  {charCount}/{MAX_CHARS}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={css.footer}>
          <button
            className={css.cancelButton}
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className={css.sendButton}
            onClick={handleSend}
            disabled={!canSend}
          >
            {sending
              ? intl.formatMessage({ id: 'ComposeMessage.sending' })
              : intl.formatMessage({ id: 'ComposeMessage.sendButton' })}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposeMessageModal;
