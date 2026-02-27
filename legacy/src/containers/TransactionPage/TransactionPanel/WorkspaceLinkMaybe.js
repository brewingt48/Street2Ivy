import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './TransactionPanel.module.css';

/**
 * Renders a link to the project details page if the student has been accepted.
 * The link is only shown when showWorkspaceLink is true in the state data.
 */
const WorkspaceLinkMaybe = props => {
  const { showWorkspaceLink, transactionId } = props;

  if (!showWorkspaceLink || !transactionId) {
    return null;
  }

  return (
    <div className={css.workspaceLinkContainer}>
      <h3 className={css.workspaceLinkTitle}>
        <FormattedMessage id="TransactionPanel.workspaceTitle" />
      </h3>
      <p className={css.workspaceLinkDescription}>
        <FormattedMessage id="TransactionPanel.workspaceDescription" />
      </p>
      <NamedLink
        className={css.workspaceLink}
        name="ProjectWorkspacePage"
        params={{ id: transactionId }}
      >
        <FormattedMessage id="TransactionPanel.workspaceButton" />
      </NamedLink>
    </div>
  );
};

export default WorkspaceLinkMaybe;
