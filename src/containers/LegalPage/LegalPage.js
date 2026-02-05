import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useConfiguration } from '../../context/configurationContext';
import { fetchLegalPage } from '../../util/api';
import { LayoutSingleColumn, Page } from '../../components';

import css from './LegalPage.module.css';

// Map URL slugs to API page types
const slugToPageType = {
  'privacy-policy': 'privacyPolicy',
  'terms-of-service': 'termsOfService',
  'cookie-policy': 'cookiePolicy',
  'disclaimer': 'disclaimer',
  'acceptable-use': 'acceptableUse',
  'refund-policy': 'refundPolicy',
};

const LegalPage = () => {
  const { slug } = useParams();
  const config = useConfiguration();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const pageType = slugToPageType[slug];

    if (!pageType) {
      setError('Page not found');
      setLoading(false);
      return;
    }

    fetchLegalPage(pageType)
      .then(response => {
        setPageData(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load page');
        setLoading(false);
      });
  }, [slug]);

  const pageTitle = pageData?.title || 'Legal';
  const siteTitle = config.marketplaceName || 'Street2Ivy';

  if (loading) {
    return (
      <Page title={`${pageTitle} | ${siteTitle}`}>
        <LayoutSingleColumn>
          <div className={css.container}>
            <div className={css.loading}>Loading...</div>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  if (error || !pageData) {
    return (
      <Page title={`Legal | ${siteTitle}`}>
        <LayoutSingleColumn>
          <div className={css.container}>
            <div className={css.error}>
              <h1>Page Not Found</h1>
              <p>The legal page you requested could not be found.</p>
            </div>
          </div>
        </LayoutSingleColumn>
      </Page>
    );
  }

  return (
    <Page title={`${pageTitle} | ${siteTitle}`}>
      <LayoutSingleColumn>
        <div className={css.container}>
          <div className={css.content}>
            <h1 className={css.title}>{pageData.title}</h1>
            {pageData.lastUpdated && (
              <p className={css.lastUpdated}>
                Last updated: {new Date(pageData.lastUpdated).toLocaleDateString()}
              </p>
            )}
            <div
              className={css.body}
              dangerouslySetInnerHTML={{ __html: pageData.content }}
            />
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default LegalPage;
