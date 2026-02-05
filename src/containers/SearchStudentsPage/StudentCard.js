import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '../../util/reactIntl';

import { AvatarMedium, NamedLink } from '../../components';

import css from './SearchStudentsPage.module.css';

// Reuse the same skill options from configUser for label resolution
const SKILL_OPTIONS = [
  { option: 'leadership', label: 'Leadership' },
  { option: 'communication', label: 'Communication' },
  { option: 'data-analysis', label: 'Data Analysis' },
  { option: 'project-management', label: 'Project Management' },
  { option: 'graphic-design', label: 'Graphic Design' },
  { option: 'software-development', label: 'Software Development' },
  { option: 'marketing', label: 'Marketing' },
  { option: 'research', label: 'Research' },
  { option: 'writing', label: 'Writing & Editing' },
  { option: 'financial-analysis', label: 'Financial Analysis' },
  { option: 'social-media', label: 'Social Media' },
  { option: 'public-speaking', label: 'Public Speaking' },
  { option: 'event-planning', label: 'Event Planning' },
  { option: 'video-production', label: 'Video Production' },
  { option: 'ux-ui-design', label: 'UX/UI Design' },
];

const STATE_MAP = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

const getSkillLabel = option => {
  const found = SKILL_OPTIONS.find(s => s.option === option);
  return found ? found.label : option;
};

const StudentCard = props => {
  const { user, onInvite, userStatsData, onLoadStats } = props;
  const { attributes, profileImage } = user;
  const { profile } = attributes;
  const { displayName, publicData = {} } = profile;

  const [showStats, setShowStats] = useState(false);

  const { university, major, graduationYear, skills = [], studentState } = publicData;

  // Load stats when the stats section is expanded
  useEffect(() => {
    if (showStats && !userStatsData && onLoadStats) {
      onLoadStats();
    }
  }, [showStats, userStatsData, onLoadStats]);

  const stats = userStatsData?.stats;
  const statsLoading = userStatsData?.isLoading;

  // Build a user-like object for AvatarMedium
  const userForAvatar = {
    id: { uuid: user.id },
    type: 'user',
    attributes: {
      profile: {
        displayName,
        abbreviatedName: profile.abbreviatedName || displayName?.charAt(0) || '?',
      },
    },
    profileImage: profileImage
      ? {
          id: { uuid: profileImage.id },
          type: 'image',
          attributes: profileImage.attributes,
        }
      : null,
  };

  const toggleStats = () => {
    setShowStats(!showStats);
  };

  return (
    <div className={css.studentCard}>
      <div className={css.cardHeader}>
        <AvatarMedium user={userForAvatar} />
        <div className={css.cardInfo}>
          <NamedLink className={css.studentName} name="ProfilePage" params={{ id: user.id }}>
            {displayName}
            <span className={css.profileArrow}>→</span>
          </NamedLink>
          {university && <p className={css.university}>{university}</p>}
        </div>
      </div>

      <div className={css.cardDetails}>
        {major && (
          <div className={css.detailRow}>
            <span className={css.detailLabel}>
              <FormattedMessage id="StudentCard.major" />
            </span>
            <span className={css.detailValue}>{major}</span>
          </div>
        )}
        {graduationYear && (
          <div className={css.detailRow}>
            <span className={css.detailLabel}>
              <FormattedMessage id="StudentCard.graduationYear" />
            </span>
            <span className={css.detailValue}>{graduationYear}</span>
          </div>
        )}
        {studentState && (
          <div className={css.detailRow}>
            <span className={css.detailLabel}>
              <FormattedMessage id="StudentCard.state" />
            </span>
            <span className={css.detailValue}>{STATE_MAP[studentState] || studentState}</span>
          </div>
        )}
      </div>

      {skills.length > 0 && (
        <div className={css.skillsContainer}>
          {skills.slice(0, 5).map(skill => (
            <span key={skill} className={css.skillPill}>
              {getSkillLabel(skill)}
            </span>
          ))}
          {skills.length > 5 && <span className={css.skillPill}>+{skills.length - 5}</span>}
        </div>
      )}

      {/* Project Stats Section */}
      <div className={css.statsSection}>
        <button
          type="button"
          className={css.statsToggle}
          onClick={toggleStats}
          aria-expanded={showStats}
        >
          <span className={css.statsToggleText}>
            <FormattedMessage id="StudentCard.projectStats" />
          </span>
          <span className={`${css.statsToggleIcon} ${showStats ? css.expanded : ''}`}>▼</span>
        </button>

        {showStats && (
          <div className={css.statsContent}>
            {statsLoading && (
              <p className={css.statsLoading}>
                <FormattedMessage id="StudentCard.loadingStats" />
              </p>
            )}

            {!statsLoading && stats && (
              <div className={css.statsGrid}>
                <div className={css.statItem}>
                  <span className={css.statValue}>{stats.completedProjects || 0}</span>
                  <span className={css.statLabel}>
                    <FormattedMessage id="StudentCard.completedProjects" />
                  </span>
                </div>
                <div className={css.statItem}>
                  <span className={css.statValue}>{stats.activeProjects || 0}</span>
                  <span className={css.statLabel}>
                    <FormattedMessage id="StudentCard.activeProjects" />
                  </span>
                </div>
                <div className={css.statItem}>
                  <span className={css.statValue}>{stats.pendingProjects || 0}</span>
                  <span className={css.statLabel}>
                    <FormattedMessage id="StudentCard.pendingProjects" />
                  </span>
                </div>
              </div>
            )}

            {!statsLoading && !stats && (
              <p className={css.statsError}>
                <FormattedMessage id="StudentCard.statsUnavailable" />
              </p>
            )}
          </div>
        )}
      </div>

      <div className={css.cardActions}>
        <NamedLink className={css.viewProfileLink} name="ProfilePage" params={{ id: user.id }}>
          <FormattedMessage id="StudentCard.viewProfile" />
        </NamedLink>
        {onInvite && (
          <button className={css.inviteButton} onClick={() => onInvite(user)} type="button">
            <FormattedMessage id="StudentCard.inviteToApply" />
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentCard;
