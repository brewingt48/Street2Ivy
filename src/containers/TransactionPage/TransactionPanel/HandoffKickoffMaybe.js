import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';

import css from './TransactionPanel.module.css';

/**
 * Renders the "Project Kickoff" info panel after a project application is accepted.
 *
 * Shows contact details, a checklist for getting started, and a reminder
 * that all project work happens off-platform. Replaces the old WorkspaceLinkMaybe.
 *
 * @param {Object} props
 * @param {boolean} props.showHandoffInfo - Whether to render this section
 * @param {boolean} props.isProvider - Whether current user is the provider (corporate partner)
 * @param {Object} [props.listing] - The listing object (for preferred contact method)
 * @param {Object} [props.protectedData] - Transaction protected data (contact instructions shared after acceptance)
 */
const HandoffKickoffMaybe = props => {
  const { showHandoffInfo, isProvider, listing, protectedData } = props;

  if (!showHandoffInfo) {
    return null;
  }

  const publicData = listing?.attributes?.publicData || {};
  const preferredContactMethod = publicData.preferredContactMethod;
  const contactInstructions = protectedData?.contactInstructions || publicData.contactInstructions;

  return (
    <div className={css.handoffContainer}>
      <div className={css.handoffHeader}>
        <span className={css.handoffIcon}>🤝</span>
        <h3 className={css.handoffTitle}>
          <FormattedMessage id="TransactionPanel.handoffTitle" />
        </h3>
      </div>

      <p className={css.handoffDescription}>
        <FormattedMessage
          id={
            isProvider
              ? 'TransactionPanel.handoffDescriptionProvider'
              : 'TransactionPanel.handoffDescriptionCustomer'
          }
        />
      </p>

      {/* Contact Method */}
      {preferredContactMethod ? (
        <div className={css.handoffDetail}>
          <span className={css.handoffDetailLabel}>
            <FormattedMessage id="TransactionPanel.handoffContactMethod" />
          </span>
          <span className={css.handoffDetailValue}>
            <FormattedMessage
              id={`TransactionPanel.handoffContactMethod.${preferredContactMethod}`}
            />
          </span>
        </div>
      ) : null}

      {/* Contact Instructions (shown only after acceptance) */}
      {contactInstructions ? (
        <div className={css.handoffDetail}>
          <span className={css.handoffDetailLabel}>
            <FormattedMessage id="TransactionPanel.handoffContactInstructions" />
          </span>
          <span className={css.handoffDetailValue}>{contactInstructions}</span>
        </div>
      ) : null}

      {/* Checklist */}
      <div className={css.handoffChecklist}>
        <h4 className={css.handoffChecklistTitle}>
          <FormattedMessage
            id={
              isProvider
                ? 'TransactionPanel.handoffChecklistTitleProvider'
                : 'TransactionPanel.handoffChecklistTitleCustomer'
            }
          />
        </h4>
        <ul className={css.handoffChecklistItems}>
          {isProvider ? (
            <>
              <li className={css.handoffChecklistItem}>
                <span className={css.checkIcon}>☐</span>
                <FormattedMessage id="TransactionPanel.handoffChecklist.provider.1" />
              </li>
              <li className={css.handoffChecklistItem}>
                <span className={css.checkIcon}>☐</span>
                <FormattedMessage id="TransactionPanel.handoffChecklist.provider.2" />
              </li>
              <li className={css.handoffChecklistItem}>
                <span className={css.checkIcon}>☐</span>
                <FormattedMessage id="TransactionPanel.handoffChecklist.provider.3" />
              </li>
            </>
          ) : (
            <>
              <li className={css.handoffChecklistItem}>
                <span className={css.checkIcon}>☐</span>
                <FormattedMessage id="TransactionPanel.handoffChecklist.customer.1" />
              </li>
              <li className={css.handoffChecklistItem}>
                <span className={css.checkIcon}>☐</span>
                <FormattedMessage id="TransactionPanel.handoffChecklist.customer.2" />
              </li>
              <li className={css.handoffChecklistItem}>
                <span className={css.checkIcon}>☐</span>
                <FormattedMessage id="TransactionPanel.handoffChecklist.customer.3" />
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Off-Platform Reminder */}
      <div className={css.handoffReminder}>
        <span className={css.handoffReminderIcon}>ℹ️</span>
        <p className={css.handoffReminderText}>
          <FormattedMessage id="TransactionPanel.handoffOffPlatformReminder" />
        </p>
      </div>
    </div>
  );
};

export default HandoffKickoffMaybe;
