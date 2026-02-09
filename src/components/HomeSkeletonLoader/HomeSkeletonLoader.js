import React from 'react';
import classNames from 'classnames';

import css from './HomeSkeletonLoader.module.css';

/**
 * HomeSkeletonLoader provides a shimmer loading state that matches
 * the authenticated home layout structure.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS class
 */
const HomeSkeletonLoader = props => {
  const { className } = props;

  return (
    <div className={classNames(css.root, className)}>
      {/* Greeting skeleton */}
      <div className={css.greetingBlock}>
        <div className={css.greetingCard}>
          <div className={css.accentBarSkeleton} />
          <div className={css.greetingContent}>
            <div className={classNames(css.skeleton, css.greetingLine)} />
            <div className={classNames(css.skeleton, css.subtitleLine)} />
          </div>
          <div className={classNames(css.skeleton, css.dateLine)} />
        </div>
      </div>

      {/* Stats grid skeleton */}
      <div className={css.statsGrid}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={css.statSkeleton}>
            <div className={classNames(css.skeleton, css.statIcon)} />
            <div className={css.statContent}>
              <div className={classNames(css.skeleton, css.statValue)} />
              <div className={classNames(css.skeleton, css.statLabel)} />
            </div>
          </div>
        ))}
      </div>

      {/* Actions grid skeleton */}
      <div className={css.actionsGrid}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={css.actionSkeleton}>
            <div className={classNames(css.skeleton, css.actionIcon)} />
            <div className={css.actionContent}>
              <div className={classNames(css.skeleton, css.actionTitle)} />
              <div className={classNames(css.skeleton, css.actionDesc)} />
            </div>
          </div>
        ))}
      </div>

      {/* Content section skeleton */}
      <div className={css.contentSkeleton}>
        <div className={classNames(css.skeleton, css.sectionTitle)} />
        <div className={css.contentCards}>
          {[0, 1, 2].map(i => (
            <div key={i} className={classNames(css.skeleton, css.contentCard)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomeSkeletonLoader;
