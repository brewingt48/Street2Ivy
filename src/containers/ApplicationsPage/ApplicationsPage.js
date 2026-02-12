/**
 * ApplicationsPage
 *
 * v53: This page now redirects to InboxPage (sales tab).
 * Applications are managed through Sharetribe's built-in Inbox/Transaction system.
 * Any existing bookmarks to /dashboard/applications will redirect to /inbox/sales.
 */
import React from 'react';
import { NamedRedirect } from '../../components';

const ApplicationsPage = () => {
  return <NamedRedirect name="InboxPage" params={{ tab: 'sales' }} />;
};

export default ApplicationsPage;
