import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { ResponsiveImage } from '../../components/';
import { fetchPublicContent, apiBaseUrl } from '../../util/api';

import css from './Logo.module.css';

// Module-level cache for CMS branding data.
// This ensures subsequent mounts (e.g. page navigation) don't re-flash.
let cmsLogoCache = null;
// Shared fetch promise so concurrent Logo mounts don't fire duplicate requests.
let cmsFetchPromise = null;

const HEIGHT_24 = 24;
const HEIGHT_36 = 36;
const HEIGHT_48 = 48;
const HEIGHT_60 = 60;
const HEIGHT_72 = 72;
const HEIGHT_OPTIONS = [HEIGHT_24, HEIGHT_36, HEIGHT_48, HEIGHT_60, HEIGHT_72];

// logoSettings property supports 5 height options
const isValidLogoSettings = settings =>
  settings?.format === 'image' && HEIGHT_OPTIONS.includes(settings?.height);
const isImageAsset = logo => logo?.type === 'imageAsset';

// Each type can have multiple image variants
const getVariantNames = variantsObj => {
  return Object.keys(variantsObj) || [];
};

// Variant data contains width and height among other things
// The width is needed for sizes attribute of responsive logo imgs
const getVariantData = variants => {
  // This assume that "scaled" variant exists
  // If other variants are introduced, this setup might need some tuning.
  return variants['scaled'];
};

// We have maximum heights for each logo type. It's enforced through classes
const getHeightClassName = height => {
  switch (height) {
    case HEIGHT_72:
      return css.logo72;
    case HEIGHT_60:
      return css.logo60;
    case HEIGHT_48:
      return css.logo48;
    case HEIGHT_36:
      return css.logo36;
    default:
      return css.logo24;
  }
};

export const LogoComponent = props => {
  const {
    className,
    logoImageClassName,
    layout,
    marketplaceName,
    logoImageDesktop,
    logoImageMobile,
    logoSettings,
    defaultLogoDesktop,
    defaultLogoMobile,
    isLoading,
    ...rest
  } = props;

  const hasValidLogoSettings = isValidLogoSettings(logoSettings);
  const logoClasses = className || css.root;
  const logoImageClasses = classNames(
    logoImageClassName || css.logo,
    getHeightClassName(logoSettings?.height)
  );

  // If the CMS logo fails to load (e.g. ephemeral file lost on Heroku),
  // fall back to the built-in Campus2Career default logo (not the old branding).
  const handleImgError = (e) => {
    const fallback = layout === 'desktop' ? defaultLogoDesktop : defaultLogoMobile;
    if (fallback && e.target.src !== fallback) {
      e.target.src = fallback;
    }
  };

  // While the CMS fetch is in flight, show the built-in default logo immediately.
  // This prevents a flash of broken/empty content during the async fetch.
  // Since the default logo is now Campus2Career, the user always sees correct branding.
  if (isLoading) {
    const fallbackSrc = layout === 'desktop' ? defaultLogoDesktop : defaultLogoMobile;
    return (
      <div className={logoClasses}>
        <img
          className={logoImageClasses}
          src={fallbackSrc}
          alt={marketplaceName}
        />
      </div>
    );
  }

  // Logo from hosted asset
  if (isImageAsset(logoImageDesktop) && hasValidLogoSettings && layout === 'desktop') {
    const variants = logoImageDesktop.attributes.variants;
    const variantNames = getVariantNames(variants);
    const { width } = getVariantData(variants);
    return (
      <div className={logoClasses} style={{ width: `${width}px` }}>
        <ResponsiveImage
          rootClassName={logoImageClasses}
          alt={marketplaceName}
          image={logoImageDesktop}
          variants={variantNames}
          sizes={`${width}px`}
          width={width}
          height={logoSettings?.height}
        />
      </div>
    );
  } else if (isImageAsset(logoImageMobile) && hasValidLogoSettings && layout === 'mobile') {
    const variants = logoImageMobile.attributes.variants;
    const variantNames = getVariantNames(variants);
    const { width } = getVariantData(variants);

    // Sizes on small screens are mainly limited by space: side buttons take 2x66 px, the rest is for logo.
    // If logo's (1x) width is less than 188, we can use logo's width as limit for sizes attribute
    // On general case, up to the screen size of 500px, we could say that the logo _might_ take all the available space
    // However, after 500px, the max aspect ratio for the logo should start limiting the logo's width.
    const sizes =
      width <= 188 ? `${width}px` : `(max-width: 500px) calc(100vw - 132px), ${width}px`;
    return (
      <div className={logoClasses}>
        <ResponsiveImage
          rootClassName={logoImageClasses}
          alt={marketplaceName}
          image={logoImageMobile}
          variants={variantNames}
          sizes={sizes}
          width={width}
        />
      </div>
    );
  } else if (layout === 'desktop') {
    return (
      <div className={logoClasses}>
        <img
          className={logoImageClasses}
          src={logoImageDesktop}
          alt={marketplaceName}
          onError={handleImgError}
          {...rest}
        />
      </div>
    );
  }

  return (
    <div className={logoClasses}>
      <img
        className={logoImageClasses}
        src={logoImageMobile}
        alt={marketplaceName}
        onError={handleImgError}
        {...rest}
      />
    </div>
  );
};

/**
 * Shared fetch function that deduplicates concurrent requests.
 * Returns a promise that resolves to the branding data object or false.
 */
const fetchCmsBranding = () => {
  if (cmsFetchPromise) {
    return cmsFetchPromise;
  }

  cmsFetchPromise = fetchPublicContent()
    .then(response => {
      const branding = response?.data?.branding;
      const brandingData = branding
        ? {
            logoUrl: branding.logoUrl || null,
            logoHeight: branding.logoHeight || null,
          }
        : false;
      cmsLogoCache = brandingData;
      cmsFetchPromise = null;
      return brandingData;
    })
    .catch(() => {
      cmsLogoCache = false;
      cmsFetchPromise = null;
      return false;
    });

  return cmsFetchPromise;
};

/**
 * This component returns a logo
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className add more style rules in addition to components own css.root
 * @param {string?} props.rootClassName overwrite components own css.root
 * @param {('desktop' | 'mobile')} props.layout
 * @param {string?} props.alt alt text for logo image
 * @returns {JSX.Element} logo component
 */
const Logo = props => {
  const config = useConfiguration();
  const { layout = 'desktop', ...rest } = props;
  // NOTE: logo images are set in hosted branding.json asset or src/config/brandingConfig.js
  const { logoImageDesktop, logoImageMobile, logoSettings } = config.branding;

  // Start from cache if available, otherwise null (triggers loading state).
  const [cmsBranding, setCmsBranding] = useState(cmsLogoCache);
  const mountedRef = useRef(true);

  // Fetch CMS content to check for custom logo and settings
  useEffect(() => {
    mountedRef.current = true;

    // If we have a cached result, use it immediately (no loading flash).
    if (cmsLogoCache !== null) {
      setCmsBranding(cmsLogoCache);
    }

    // Always fetch fresh data to pick up admin changes.
    fetchCmsBranding().then(data => {
      if (mountedRef.current) {
        setCmsBranding(data);
      }
    });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Determine loading state: only true on first mount when there's no cache yet.
  const isLoading = cmsBranding === null;

  // Use CMS logo if available, otherwise use default
  const cmsLogoUrl = cmsBranding && cmsBranding !== false ? cmsBranding.logoUrl : null;
  const cmsLogoHeight = cmsBranding && cmsBranding !== false ? cmsBranding.logoHeight : null;

  // For CMS logo URLs that start with /api/, prepend the API base URL in development.
  // This ensures the logo loads from the correct server.
  const resolvedLogoUrl = cmsLogoUrl && cmsLogoUrl.startsWith('/api/')
    ? `${apiBaseUrl()}${cmsLogoUrl}`
    : cmsLogoUrl;

  const effectiveLogoDesktop = resolvedLogoUrl || logoImageDesktop;
  const effectiveLogoMobile = resolvedLogoUrl || logoImageMobile;

  // Use CMS logo height if set, otherwise use default logoSettings.
  // Ensure format is set to 'image' for valid settings.
  const effectiveLogoSettings = cmsLogoHeight
    ? { ...logoSettings, height: cmsLogoHeight, format: 'image' }
    : logoSettings;

  return (
    <LogoComponent
      {...rest}
      layout={layout}
      logoImageDesktop={effectiveLogoDesktop}
      logoImageMobile={effectiveLogoMobile}
      logoSettings={effectiveLogoSettings}
      marketplaceName={config.marketplaceName}
      defaultLogoDesktop={logoImageDesktop}
      defaultLogoMobile={logoImageMobile}
      isLoading={isLoading}
    />
  );
};

export default Logo;
