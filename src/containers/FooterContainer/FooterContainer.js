import React, { useState, useEffect } from 'react';
import { useConfiguration } from '../../context/configurationContext';
import { fetchPublicContent } from '../../util/api';
import loadable from '@loadable/component';

import css from './FooterContainer.module.css';

const SectionBuilder = loadable(
  () => import(/* webpackChunkName: "SectionBuilder" */ '../PageBuilder/PageBuilder'),
  {
    resolveComponent: components => components.SectionBuilder,
  }
);

const FooterComponent = () => {
  const { footer = {}, topbar } = useConfiguration();
  const [cmsBranding, setCmsBranding] = useState(null);

  // Fetch CMS content for social media links and tagline
  useEffect(() => {
    fetchPublicContent()
      .then(response => {
        const branding = response?.data?.branding;
        setCmsBranding(branding || false);
      })
      .catch(() => {
        setCmsBranding(false);
      });
  }, []);

  // If footer asset is not set, let's not render Footer at all.
  if (Object.keys(footer).length === 0) {
    return null;
  }

  // Build social media links from CMS branding
  const cmsSocialLinks = [];
  if (cmsBranding && cmsBranding !== false) {
    const socialPlatforms = [
      { key: 'socialFacebook', platform: 'facebook' },
      { key: 'socialTwitter', platform: 'twitter' },
      { key: 'socialInstagram', platform: 'instagram' },
      { key: 'socialLinkedin', platform: 'linkedin' },
      { key: 'socialYoutube', platform: 'youtube' },
      { key: 'socialTiktok', platform: 'tiktok' },
    ];

    socialPlatforms.forEach(({ key, platform }) => {
      const url = cmsBranding[key];
      if (url) {
        cmsSocialLinks.push({
          blockType: 'socialMediaLink',
          link: {
            fieldType: 'socialMediaLink',
            platform: platform,
            url: url,
          },
        });
      }
    });
  }

  // Merge CMS social links with existing footer social links
  const existingSocialLinks = footer.socialMediaLinks || [];
  const mergedSocialLinks = cmsSocialLinks.length > 0 ? cmsSocialLinks : existingSocialLinks;

  // The footer asset does not specify sectionId or sectionType. However, the SectionBuilder
  // expects sectionId and sectionType in order to identify the section. We add those
  // attributes here before passing the asset to SectionBuilder.
  const footerSection = {
    ...footer,
    sectionId: 'footer',
    sectionType: 'footer',
    linkLogoToExternalSite: topbar?.logoLink,
    socialMediaLinks: mergedSocialLinks,
  };

  return <SectionBuilder sections={[footerSection]} />;
};

// NOTE: if you want to add dynamic data to FooterComponent,
//       you could just connect this FooterContainer to Redux Store
//
// const mapStateToProps = state => {
//   const { currentUser } = state.user;
//   return { currentUser };
// };
// const FooterContainer = compose(connect(mapStateToProps))(FooterComponent);
// export default FooterContainer;

export default FooterComponent;
