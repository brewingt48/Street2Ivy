import React from 'react';
import classNames from 'classnames';
import { useIntl } from '../../../util/reactIntl';

import css from './InboxFilterBar.module.css';

const SORT_OPTIONS = [
  { key: 'createdAt', labelId: 'InboxPage.sortBy.createdAt' },
  { key: 'lastMessageAt', labelId: 'InboxPage.sortBy.lastMessageAt' },
  { key: 'lastTransitionedAt', labelId: 'InboxPage.sortBy.lastTransitionedAt' },
];

/**
 * InboxFilterBar — filter pills, search input, and sort dropdown for the inbox.
 *
 * All CSS uses --s2i-* design tokens for branding customization.
 */
const InboxFilterBar = props => {
  const {
    filter = 'all',
    onFilterChange,
    searchQuery = '',
    onSearchChange,
    sortValue = 'createdAt',
    onSortChange,
  } = props;

  const intl = useIntl();

  const filters = [
    { key: 'all', labelId: 'InboxFilterBar.filterAll' },
    { key: 'unread', labelId: 'InboxFilterBar.filterUnread' },
  ];

  return (
    <div className={css.root}>
      {/* Filter pills */}
      <div className={css.filterRow}>
        <div className={css.filters}>
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              className={classNames(css.filterPill, {
                [css.filterPillActive]: filter === f.key,
              })}
              onClick={() => onFilterChange(f.key)}
            >
              {intl.formatMessage({ id: f.labelId })}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <select
          className={css.sortSelect}
          value={sortValue}
          onChange={e => onSortChange(e.target.value)}
          aria-label={intl.formatMessage({ id: 'InboxSearchForm.sortLabel' })}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>
              {intl.formatMessage({ id: opt.labelId })}
            </option>
          ))}
        </select>
      </div>

      {/* Search input */}
      <div className={css.searchRow}>
        <div className={css.searchInputWrapper}>
          <svg
            className={css.searchIcon}
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.9-2.9"
              stroke="currentColor"
              strokeWidth="1.33"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            className={css.searchInput}
            placeholder={intl.formatMessage({ id: 'InboxFilterBar.searchPlaceholder' })}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            aria-label={intl.formatMessage({ id: 'InboxFilterBar.searchPlaceholder' })}
          />
          {searchQuery ? (
            <button
              type="button"
              className={css.clearButton}
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default InboxFilterBar;
