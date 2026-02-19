/////////////////////////////////////////////////////////
// This file contains configs that affect branding     //
// NOTE: these are just some of the relevant configs   //
// Most of the work happens in marketplaceDefaults.css //
// and in components.                                  //
/////////////////////////////////////////////////////////

// Note: These come from the branding asset nowadays by default.
//       To use this built-in configuration, you need to remove the overwrite from configHelper.js (mergeBranding func)

// Marketplace color.
// This is saved as CSS Property: --marketplaceColor in src/app.js
// Also --marketplaceColorDark and --marketplaceColorLight are generated from this one
// by adding +/- 10% to lightness.
export const marketplaceColor = '#2C5282';

// Campus2Career logo SVGs encoded as data URIs.
// Using data URIs ensures these work as <img src> values regardless of the
// webpack SVG loader configuration (@svgr/webpack returns React components
// for default imports, but we need a URL string here).
// These are the built-in fallback logos that are always available, even when
// uploaded logos are lost (e.g. Heroku ephemeral filesystem on dyno restart).
//
// Desktop: full "Campus2Career by Street2Ivy" wordmark with graduation cap icon
// Mobile:  graduation cap icon only (compact for small screens)

const logoDesktopSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 60" width="360" height="60"><defs><style>.lt{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-weight:700;font-size:32px;fill:%232C5282}.la{fill:%234299E1}.lb{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-weight:400;font-size:11px;fill:%23718096;letter-spacing:0.5px}</style></defs><g transform="translate(4,8)"><polygon points="22,8 2,20 22,32 42,20" fill="%232C5282"/><polygon points="22,12 8,20 22,28 36,20" fill="%234299E1" opacity="0.4"/><line x1="36" y1="20" x2="40" y2="34" stroke="%234299E1" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="36" r="2.5" fill="%234299E1"/><path d="M10,22 L10,32 Q22,40 34,32 L34,22" fill="none" stroke="%232C5282" stroke-width="2"/></g><text x="54" y="38" class="lt">Campus<tspan class="la">2</tspan>Career</text><text x="54" y="52" class="lb">by Street2Ivy</text></svg>`;

const logoMobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" width="44" height="44"><g transform="translate(0,4)"><polygon points="22,4 2,18 22,32 42,18" fill="%232C5282"/><polygon points="22,9 8,18 22,27 36,18" fill="%234299E1" opacity="0.4"/><line x1="36" y1="18" x2="40" y2="32" stroke="%234299E1" stroke-width="2.5" stroke-linecap="round"/><circle cx="40" cy="34" r="3" fill="%234299E1"/><path d="M9,20 L9,30 Q22,38 35,30 L35,20" fill="none" stroke="%232C5282" stroke-width="2.5"/></g></svg>`;

// Logo is used in Topbar on mobile and desktop, where height is the limiting factor.
// Therefore, we strongly suggest that your image file for desktop logo is in landscape!
//
// If you need to fine-tune the logo, the component is defined in src/components/Logo/Logo.js
// By default logo gets 36 pixels vertical space, but it could be wider (e.g. 180px)
export const logoImageDesktopURL = `data:image/svg+xml,${logoDesktopSvg}`;
export const logoImageMobileURL = `data:image/svg+xml,${logoMobileSvg}`;

// The _logoSettings_ settings for the logo. Due to constraints in current Topbar, we only support 3 height variants
// at this point. There could be more height variants in the future and potentially other logo formats than 'image'.
// Note: logo image is always scaled and the limiting factor is height. However, there's also maximum width,
//       which is 370px in the Topbar. If the logo is wider than that, browser will scale it down.
export const logoSettings = {
  height: 36, // Hosted asset supports: 24, 36, 48
  format: 'image',
};

// brandImageURL is used as a background image on the "hero" section of several pages.
// Used on AuthenticationPage, EmailVerificationPage, PasswordRecoveryPage, PasswordResetPage etc.
// NOTE: Those pages use ResponsiveBackgroundImageContainer component,
//       it's possible to include more image variants to make image fetching more performant.
// NOTE: In production, this is overridden by the loginBackgroundImage from the hosted branding asset.
export const brandImageURL = null;

// Default images for social media sharing
// These can be overwritten per page
// NOTE: In production, these are overridden by socialSharingImage from the hosted branding asset.

// For Facebook, the aspect ratio should be 1200x630 (otherwise, the image is cropped)
export const facebookImageURL = null;
// For Twitter, the aspect ratio should be 600x314 (otherwise, the image is cropped)
export const twitterImageURL = null;
