import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { EmptyState } from '../../../components';

/**
 * InboxEmptyState — displays contextual empty states for the inbox.
 *
 * Variants:
 * - noConversations: No transactions exist at all
 * - noSelection: Desktop split-pane, no conversation selected yet
 * - noResults: Search/filter returned zero results
 */
const InboxEmptyState = ({ variant = 'noSelection' }) => {
  const iconMap = {
    noConversations: '💬',
    noSelection: '📨',
    noResults: '🔍',
  };

  return (
    <EmptyState
      icon={iconMap[variant] || '💬'}
      title={<FormattedMessage id={`InboxEmptyState.${variant}.title`} />}
      description={<FormattedMessage id={`InboxEmptyState.${variant}.description`} />}
      variant="muted"
      size="medium"
    />
  );
};

export default InboxEmptyState;
