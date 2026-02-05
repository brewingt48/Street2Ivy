import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '../../util/reactIntl';

import { AvatarMedium, NamedLink, VerificationBadge } from '../../components';

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

const getIndustryLabel = option => {
  const found = INDUSTRY_OPTIONS.find(i => i.option === option);
  return found ? found.label : option;
};

const getSizeLabel = option => {
  const found = SIZE_OPTIONS.find(s => s.option === option);
  return found ? found.label : option;
};

const CompanyCard = props => {
  const { user, companyListingsData, onLoadListings } = props;
  const { attributes, profileImage } = user;
  const { profile } = attributes;
  const { displayName, publicData = {} } = profile;

  const [showProjects, setShowProjects] = useState(false);

  const {
    companyName,
    industry,
    companySize,
    companyState,
    companyWebsite,
    companyDescription,
    isVerified,
  } = publicData;

  const name = companyName || displayName;

  // Load listings when the projects section is expanded
  useEffect(() => {
    if (showProjects && !companyListingsData && onLoadListings) {
      onLoadListings();
    }
  }, [showProjects, companyListingsData, onLoadListings]);

  const listings = companyListingsData?.listings || [];
  const listingsLoading = companyListingsData?.isLoading;
  const totalProjects = companyListingsData?.pagination?.totalItems;

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

  const toggleProjects = () => {
    setShowProjects(!showProjects);
  };

  return (
    <div className={css.companyCard}>
      <div className={css.cardHeader}>
        <AvatarMedium user={userForAvatar} />
        <div className={css.cardInfo}>
          <div className={css.companyNameRow}>
            <NamedLink className={css.companyNameLink} name="ProfilePage" params={{ id: user.id }}>
              {name}
              <span className={css.profileArrow}>→</span>
            </NamedLink>
            {isVerified && <VerificationBadge type="company" size="small" showLabel={false} />}
          </div>
          {industry && <p className={css.industryLabel}>{getIndustryLabel(industry)}</p>}
        </div>
      </div>

      <div className={css.metaPills}>
        {companySize && <span className={css.metaPill}>{getSizeLabel(companySize)}</span>}
        {companyState && (
          <span className={css.metaPill}>{STATE_MAP[companyState] || companyState}</span>
        )}
        {industry && <span className={css.metaPill}>{getIndustryLabel(industry)}</span>}
      </div>

      {companyDescription && (
        <p className={css.companyDescription}>
          {companyDescription.length > 120
            ? `${companyDescription.substring(0, 120)}...`
            : companyDescription}
        </p>
      )}

      {/* Open Projects Section */}
      <div className={css.projectsSection}>
        <button
          type="button"
          className={css.projectsToggle}
          onClick={toggleProjects}
          aria-expanded={showProjects}
        >
          <span className={css.projectsToggleText}>
            <FormattedMessage id="CompanyCard.openProjects" />
            {totalProjects !== undefined && (
              <span className={css.projectCount}>({totalProjects})</span>
            )}
          </span>
          <span className={`${css.projectsToggleIcon} ${showProjects ? css.expanded : ''}`}>
            ▼
          </span>
        </button>

        {showProjects && (
          <div className={css.projectsList}>
            {listingsLoading && (
              <p className={css.projectsLoading}>
                <FormattedMessage id="CompanyCard.loadingProjects" />
              </p>
            )}

            {!listingsLoading && listings.length === 0 && (
              <p className={css.noProjects}>
                <FormattedMessage id="CompanyCard.noOpenProjects" />
              </p>
            )}

            {!listingsLoading &&
              listings.length > 0 &&
              listings.map(listing => (
                <NamedLink
                  key={listing.id}
                  className={css.projectItem}
                  name="ListingPage"
                  params={{ id: listing.id, slug: listing.attributes.title?.replace(/\s+/g, '-').toLowerCase() || 'project' }}
                >
                  <div className={css.projectItemContent}>
                    <span className={css.projectTitle}>{listing.attributes.title}</span>
                    {listing.attributes.publicData?.projectType && (
                      <span className={css.projectType}>
                        {listing.attributes.publicData.projectType}
                      </span>
                    )}
                  </div>
                  <span className={css.projectArrow}>→</span>
                </NamedLink>
              ))}

            {!listingsLoading && totalProjects > 5 && (
              <NamedLink
                className={css.viewAllProjects}
                name="SearchPage"
                to={{ search: `?pub_authorId=${user.id}` }}
              >
                <FormattedMessage
                  id="CompanyCard.viewAllProjects"
                  values={{ count: totalProjects }}
                />
              </NamedLink>
            )}
          </div>
        )}
      </div>

      <div className={css.cardActions}>
        <NamedLink className={css.viewProfileLink} name="ProfilePage" params={{ id: user.id }}>
          <FormattedMessage id="CompanyCard.viewProfile" />
        </NamedLink>
        {companyWebsite && (
          <a
            className={css.websiteLink}
            href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
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
