import React, { useEffect, useState } from 'react';
import truncate from 'lodash/truncate';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { richText } from '../../../util/richText';
import { ensureUser, ensureCurrentUser } from '../../../util/data';
import { propTypes } from '../../../util/types';

import { AvatarLarge, NamedLink, InlineTextButton } from '../../../components';

import css from './UserCard.module.css';

// Approximated collapsed size so that there are ~three lines of text
// in the desktop layout in the author section of the ListingPage.
const BIO_COLLAPSED_LENGTH = 170;
const MIN_LENGTH_FOR_LONG_WORDS = 20;

const truncated = s => {
  return truncate(s, {
    length: BIO_COLLAPSED_LENGTH,

    // Allow truncated text end only in specific characters. This will
    // make the truncated text shorter than the length if the original
    // text has to be shortened and the substring ends in a separator.
    //
    // This ensures that the final text doesn't get cut in the middle
    // of a word.
    separator: /\s|,|\.|:|;/,
    omission: '…',
  });
};

const ExpandableBio = props => {
  const [expand, setExpand] = useState(false);
  const { className, bio } = props;
  const bioWithLinks = richText(bio, {
    linkify: true,
    longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
    longWordClass: css.longWord,
  });
  const truncatedBio = richText(truncated(bio), {
    linkify: true,
    longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS,
    longWordClass: css.longWord,
    breakChars: '/',
  });

  const handleShowMoreClick = () => {
    setExpand(true);
  };
  const showMore = (
    <InlineTextButton rootClassName={css.showMore} onClick={handleShowMoreClick}>
      <FormattedMessage id="UserCard.showFullBioLink" />
    </InlineTextButton>
  );
  return (
    <p className={className}>
      {expand ? bioWithLinks : truncatedBio}
      {bio.length >= BIO_COLLAPSED_LENGTH && !expand ? showMore : null}
    </p>
  );
};

// Helper to get label for an enum option
const getEnumLabel = (options, value) => {
  if (!options || !value) return value;
  const found = options.find(o => o.option === value);
  return found ? found.label : value;
};

// Industry options matching configUser.js for label resolution
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
  { option: 'other', label: 'Other' },
];

/**
 * Corporate Partner Card - shows company info instead of personal profile
 */
const CorporatePartnerContent = props => {
  const {
    publicData,
    displayName,
    ensuredUser,
    isCurrentUser,
    mounted,
    onContactUser,
    showContact,
    contactLinkId,
    user,
  } = props;

  const companyName = publicData?.companyName || displayName;
  const industry = publicData?.industry;
  const department = publicData?.department;
  const companyWebsite = publicData?.companyWebsite;
  const companyDescription = publicData?.companyDescription;
  const companySize = publicData?.companySize;

  const industryLabel = getEnumLabel(INDUSTRY_OPTIONS, industry);

  const handleContactUserClick = () => {
    onContactUser(user);
  };

  const separator =
    (mounted && isCurrentUser) || !showContact ? null : (
      <span className={css.linkSeparator}>•</span>
    );

  const contact = showContact ? (
    <InlineTextButton
      id={contactLinkId}
      rootClassName={css.contact}
      onClick={handleContactUserClick}
      enforcePagePreloadFor="SignupPage"
    >
      <FormattedMessage id="UserCard.contactUser" />
    </InlineTextButton>
  ) : null;

  const editProfileMobile = (
    <span className={css.editProfileMobile}>
      <span className={css.linkSeparator}>•</span>
      <NamedLink name="ProfileSettingsPage">
        <FormattedMessage id="ListingPage.editProfileLink" />
      </NamedLink>
    </span>
  );

  const editProfileDesktop =
    mounted && isCurrentUser ? (
      <NamedLink className={css.editProfileDesktop} name="ProfileSettingsPage">
        <FormattedMessage id="ListingPage.editProfileLink" />
      </NamedLink>
    ) : null;

  const links = ensuredUser.id ? (
    <p className={css.links}>
      <NamedLink className={css.link} name="ProfilePage" params={{ id: ensuredUser.id.uuid }}>
        <FormattedMessage id="UserCard.viewProfileLink" />
      </NamedLink>
      {separator}
      {mounted && isCurrentUser ? editProfileMobile : contact}
    </p>
  ) : null;

  return (
    <>
      <div className={css.content}>
        <AvatarLarge className={css.avatar} user={user} />
        <div className={css.info}>
          <div className={css.headingRow}>
            <span className={css.companyName}>{companyName}</span>
            {editProfileDesktop}
          </div>
          <div className={css.companyMeta}>
            {industryLabel && <span className={css.companyMetaItem}>{industryLabel}</span>}
            {department && <span className={css.companyMetaItem}>{department} Dept.</span>}
            {companySize && <span className={css.companyMetaItem}>{companySize} employees</span>}
          </div>
          {companyWebsite && (
            <a
              href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
              target="_blank"
              rel="noopener noreferrer"
              className={css.companyWebsite}
            >
              {companyWebsite.replace(/^https?:\/\//, '')}
            </a>
          )}
          {companyDescription ? (
            <ExpandableBio className={css.desktopBio} bio={companyDescription} />
          ) : null}
          {links}
        </div>
      </div>
      {companyDescription ? (
        <ExpandableBio className={css.mobileBio} bio={companyDescription} />
      ) : null}
    </>
  );
};

/**
 * The UserCard component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.user | propTypes.currentUser} props.user - The user
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {function} props.onContactUser - The on contact user function
 * @param {boolean} [props.showContact] - Whether to show the contact user button
 * @returns {JSX.Element} user card component
 */
const UserCard = props => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    rootClassName,
    className,
    user,
    currentUser,
    onContactUser,
    showContact = true,
    contactLinkId = 'contactUserLink',
  } = props;

  const userIsCurrentUser = user && user.type === 'currentUser';
  const ensuredUser = userIsCurrentUser ? ensureCurrentUser(user) : ensureUser(user);

  const ensuredCurrentUser = ensureCurrentUser(currentUser);
  const isCurrentUser =
    ensuredUser.id && ensuredCurrentUser.id && ensuredUser.id.uuid === ensuredCurrentUser.id.uuid;
  const { displayName, bio, publicData } = ensuredUser.attributes.profile;

  // Street2Ivy: Check if user is a corporate partner
  const isCorporatePartner = publicData?.userType === 'corporate-partner';

  const classes = classNames(rootClassName || css.root, className);

  // Corporate partner: show company-focused card
  if (isCorporatePartner) {
    return (
      <div className={classes}>
        <CorporatePartnerContent
          publicData={publicData}
          displayName={displayName}
          ensuredUser={ensuredUser}
          isCurrentUser={isCurrentUser}
          mounted={mounted}
          onContactUser={onContactUser}
          showContact={showContact}
          contactLinkId={contactLinkId}
          user={user}
        />
      </div>
    );
  }

  // Default: student / standard user card
  const handleContactUserClick = () => {
    onContactUser(user);
  };

  const hasBio = !!bio;
  const linkClasses = classNames(css.links, {
    [css.withBioMissingAbove]: !hasBio,
  });

  const separator =
    (mounted && isCurrentUser) || !showContact ? null : (
      <span className={css.linkSeparator}>•</span>
    );

  const contact = showContact ? (
    <InlineTextButton
      id={contactLinkId}
      rootClassName={css.contact}
      onClick={handleContactUserClick}
      enforcePagePreloadFor="SignupPage"
    >
      <FormattedMessage id="UserCard.contactUser" />
    </InlineTextButton>
  ) : null;

  const editProfileMobile = (
    <span className={css.editProfileMobile}>
      <span className={css.linkSeparator}>•</span>
      <NamedLink name="ProfileSettingsPage">
        <FormattedMessage id="ListingPage.editProfileLink" />
      </NamedLink>
    </span>
  );

  const editProfileDesktop =
    mounted && isCurrentUser ? (
      <NamedLink className={css.editProfileDesktop} name="ProfileSettingsPage">
        <FormattedMessage id="ListingPage.editProfileLink" />
      </NamedLink>
    ) : null;

  const links = ensuredUser.id ? (
    <p className={linkClasses}>
      <NamedLink className={css.link} name="ProfilePage" params={{ id: ensuredUser.id.uuid }}>
        <FormattedMessage id="UserCard.viewProfileLink" />
      </NamedLink>
      {separator}
      {mounted && isCurrentUser ? editProfileMobile : contact}
    </p>
  ) : null;

  return (
    <div className={classes}>
      <div className={css.content}>
        <AvatarLarge className={css.avatar} user={user} />
        <div className={css.info}>
          <div className={css.headingRow}>
            <FormattedMessage id="UserCard.heading" values={{ name: displayName }} />
            {editProfileDesktop}
          </div>
          {hasBio ? <ExpandableBio className={css.desktopBio} bio={bio} /> : null}
          {links}
        </div>
      </div>
      {hasBio ? <ExpandableBio className={css.mobileBio} bio={bio} /> : null}
    </div>
  );
};

export default UserCard;
