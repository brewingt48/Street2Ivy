import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';

import { AvatarMedium, NamedLink } from '../../components';

import css from './SearchCompaniesPage.module.css';

const INDUSTRY_OPTIONS = [
  { option: 'technology', label: 'Technology' },
  { option: 'finance', label: 'Finance & Banking' },
  { option: 'consulting', label: 'Consulting' },
  { option: 'healthcare', label: 'Healthcare' },
  { option: 'education', label: 'Education' },
  { option: 'manufacturing', label: 'Manufacturing' },
  { option: 'retail', label: 'Retail & E-commerce' },
  { option: 'media', label: 'Media & Entertainment' },
  { option: 'nonprofit', label: 'Nonprofit' },
  { option: 'government', label: 'Government' },
  { option: 'energy', label: 'Energy' },
  { option: 'real-estate', label: 'Real Estate' },
  { option: 'legal', label: 'Legal' },
  { option: 'startups', label: 'Startups' },
];

const SIZE_OPTIONS = [
  { option: 'startup', label: '1-10 employees' },
  { option: 'small', label: '11-50 employees' },
  { option: 'medium', label: '51-200 employees' },
  { option: 'large', label: '201-1000 employees' },
  { option: 'enterprise', label: '1000+ employees' },
];

const STATE_MAP = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const getIndustryLabel = option => {
  const found = INDUSTRY_OPTIONS.find(i => i.option === option);
  return found ? found.label : option;
};

const getSizeLabel = option => {
  const found = SIZE_OPTIONS.find(s => s.option === option);
  return found ? found.label : option;
};

const CompanyCard = props => {
  const { user } = props;
  const { attributes, profileImage } = user;
  const { profile } = attributes;
  const { displayName, publicData = {} } = profile;

  const {
    companyName,
    industry,
    companySize,
    companyState,
    companyWebsite,
    companyDescription,
  } = publicData;

  const name = companyName || displayName;

  // Build a user-like object for AvatarMedium
  const userForAvatar = {
    id: { uuid: user.id },
    type: 'user',
    attributes: {
      profile: {
        displayName: name,
        abbreviatedName: name?.charAt(0) || '?',
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

  return (
    <div className={css.companyCard}>
      <div className={css.cardHeader}>
        <AvatarMedium user={userForAvatar} />
        <div className={css.cardInfo}>
          <NamedLink
            className={css.companyNameLink}
            name="ProfilePage"
            params={{ id: user.id }}
          >
            {name}
          </NamedLink>
          {industry && (
            <p className={css.industryLabel}>{getIndustryLabel(industry)}</p>
          )}
        </div>
      </div>

      <div className={css.metaPills}>
        {companySize && (
          <span className={css.metaPill}>{getSizeLabel(companySize)}</span>
        )}
        {companyState && (
          <span className={css.metaPill}>
            {STATE_MAP[companyState] || companyState}
          </span>
        )}
        {industry && (
          <span className={css.metaPill}>{getIndustryLabel(industry)}</span>
        )}
      </div>

      {companyDescription && (
        <p className={css.companyDescription}>
          {companyDescription.length > 120
            ? `${companyDescription.substring(0, 120)}...`
            : companyDescription}
        </p>
      )}

      <div className={css.cardActions}>
        <NamedLink
          className={css.viewProfileLink}
          name="ProfilePage"
          params={{ id: user.id }}
        >
          <FormattedMessage id="CompanyCard.viewProfile" />
        </NamedLink>
        {companyWebsite && (
          <a
            className={css.websiteLink}
            href={
              companyWebsite.startsWith('http')
                ? companyWebsite
                : `https://${companyWebsite}`
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            <FormattedMessage id="CompanyCard.visitWebsite" />
          </a>
        )}
      </div>
    </div>
  );
};

export default CompanyCard;
