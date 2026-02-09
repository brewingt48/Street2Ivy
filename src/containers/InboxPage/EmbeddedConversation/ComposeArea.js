import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';

import css from './ComposeArea.module.css';

const MAX_CHARS = 10000;
const CHAR_WARNING_THRESHOLD = 0.8; // Show count at 80%
const ROWS_MIN = 1;
const ROWS_MAX = 5;
const LINE_HEIGHT_PX = 22; // Approximate line height for auto-resize

/**
 * SVG send icon — paper plane.
 * Matches the existing SendMessageForm icon pattern.
 */
const IconSend = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 14 14"
    xmlns="http://www.w3.org/2000/svg"
    role="none"
    fill="none"
  >
    <g stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M12.91 1L0 7.003l5.052 2.212z" />
      <path d="M10.75 11.686L5.042 9.222l7.928-8.198z" />
      <path d="M5.417 8.583v4.695l2.273-2.852" />
    </g>
  </svg>
);

/**
 * ComposeArea — message composition area with auto-expanding textarea.
 *
 * Features:
 * - Auto-expand from 1 to 5 rows
 * - Enter to send, Shift+Enter for newline
 * - Character count indicator at >80% of 10,000 char max
 * - Circular send button with IconSend SVG
 * - Disabled state during sendMessageInProgress
 *
 * All CSS uses --s2i-* design tokens for branding customization.
 */
const ComposeArea = props => {
  const {
    onSendMessage,
    sendMessageInProgress = false,
    sendMessageError = null,
  } = props;

  const intl = useIntl();
  const textareaRef = useRef(null);
  const [message, setMessage] = useState('');

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset height to measure scrollHeight correctly
    el.style.height = 'auto';
    const maxHeight = LINE_HEIGHT_PX * ROWS_MAX + 20; // padding
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [message, adjustHeight]);

  const handleChange = e => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setMessage(value);
    }
  };

  const handleSend = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed || sendMessageInProgress) return;

    onSendMessage(trimmed);
    setMessage('');

    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, sendMessageInProgress, onSendMessage]);

  const handleKeyDown = e => {
    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const charCount = message.length;
  const showCharCount = charCount >= MAX_CHARS * CHAR_WARNING_THRESHOLD;
  const isOverLimit = charCount >= MAX_CHARS;
  const isNearLimit = charCount >= MAX_CHARS * 0.95;
  const isEmpty = message.trim().length === 0;
  const isDisabled = isEmpty || sendMessageInProgress || isOverLimit;

  const charCountClass = isOverLimit
    ? css.charCountError
    : isNearLimit
    ? css.charCountWarning
    : css.charCount;

  return (
    <div className={css.root}>
      <div className={css.inputWrapper}>
        <textarea
          ref={textareaRef}
          className={css.textarea}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={intl.formatMessage({ id: 'ComposeArea.placeholder' })}
          aria-label={intl.formatMessage({ id: 'ComposeArea.placeholder' })}
          disabled={sendMessageInProgress}
          rows={ROWS_MIN}
        />
        {showCharCount ? (
          <span className={charCountClass}>
            {charCount}/{MAX_CHARS}
          </span>
        ) : null}
        {sendMessageError ? (
          <p className={css.errorMessage}>
            <FormattedMessage id="ComposeArea.sendFailed" />
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className={css.sendButton}
        onClick={handleSend}
        disabled={isDisabled}
        aria-label={intl.formatMessage({ id: 'ComposeArea.send' })}
      >
        <IconSend />
      </button>
    </div>
  );
};

export default ComposeArea;
