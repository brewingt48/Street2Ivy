import React, { useState } from 'react';
import { FormattedMessage } from '../../util/reactIntl';

import { Modal, Button } from '../../components';

import css from './SearchStudentsPage.module.css';

const InviteModal = props => {
  const {
    isOpen,
    onClose,
    onSubmit,
    student,
    ownListings,
    inviteInProgress,
    inviteError,
    inviteSuccess,
    onManageDisableScrolling,
  } = props;

  const [selectedListingId, setSelectedListingId] = useState('');
  const [message, setMessage] = useState('');

  const studentName = student?.attributes?.profile?.displayName || 'Student';

  // Filter to only published listings
  const publishedListings = (ownListings || []).filter(l => l.state === 'published');

  const handleSubmit = e => {
    e.preventDefault();
    if (!selectedListingId) return;

    onSubmit({
      studentId: student.id,
      listingId: selectedListingId,
      message:
        message.trim() ||
        `Hi ${studentName}, I'd like to invite you to apply for this project on Street2Ivy.`,
    });
  };

  const handleClose = () => {
    setSelectedListingId('');
    setMessage('');
    onClose();
  };

  if (inviteSuccess) {
    return (
      <Modal
        id="InviteModal"
        isOpen={isOpen}
        onClose={handleClose}
        onManageDisableScrolling={onManageDisableScrolling}
        usePortal
      >
        <div className={css.inviteModalContent}>
          <h2 className={css.inviteModalTitle}>
            <FormattedMessage id="InviteModal.successTitle" />
          </h2>
          <p className={css.inviteModalMessage}>
            <FormattedMessage id="InviteModal.successMessage" values={{ name: studentName }} />
          </p>
          <Button className={css.inviteModalSubmit} onClick={handleClose}>
            <FormattedMessage id="InviteModal.done" />
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      id="InviteModal"
      isOpen={isOpen}
      onClose={handleClose}
      onManageDisableScrolling={onManageDisableScrolling}
      usePortal
    >
      <div className={css.inviteModalContent}>
        <h2 className={css.inviteModalTitle}>
          <FormattedMessage id="InviteModal.title" values={{ name: studentName }} />
        </h2>

        <form onSubmit={handleSubmit}>
          <div className={css.inviteFormGroup}>
            <label htmlFor="inviteProject" className={css.inviteLabel}>
              <FormattedMessage id="InviteModal.selectProject" />
            </label>
            <select
              id="inviteProject"
              className={css.inviteSelect}
              value={selectedListingId}
              onChange={e => setSelectedListingId(e.target.value)}
              required
            >
              <option value="">-- Select a project --</option>
              {publishedListings.map(listing => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
            {publishedListings.length === 0 && (
              <p className={css.inviteNoProjects}>
                <FormattedMessage id="InviteModal.noProjects" />
              </p>
            )}
          </div>

          <div className={css.inviteFormGroup}>
            <label htmlFor="inviteMessage" className={css.inviteLabel}>
              <FormattedMessage id="InviteModal.messageLabel" />
            </label>
            <textarea
              id="inviteMessage"
              className={css.inviteTextarea}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Hi ${studentName}, I'd like to invite you to apply for this project on Street2Ivy.`}
              rows={4}
            />
          </div>

          {inviteError && (
            <p className={css.inviteErrorMessage}>
              <FormattedMessage id="InviteModal.error" />
            </p>
          )}

          <Button
            className={css.inviteModalSubmit}
            type="submit"
            disabled={!selectedListingId || inviteInProgress}
            inProgress={inviteInProgress}
          >
            <FormattedMessage id="InviteModal.submit" />
          </Button>
        </form>
      </div>
    </Modal>
  );
};

export default InviteModal;
