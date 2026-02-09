import { createContext, useContext } from 'react';

/**
 * TenantContext provides tenant-specific configuration for multi-tenant (white-label) support.
 *
 * The tenant object shape:
 * {
 *   id: string,              // Unique tenant identifier (e.g. 'harvard', 'mit')
 *   name: string,            // Display name (e.g. 'Harvard University')
 *   domain: string,          // Domain or subdomain (e.g. 'harvard.street2ivy.com')
 *   status: string,          // 'active' | 'inactive' | 'trial'
 *   branding: {
 *     marketplaceColor: string | null,      // Hex color override (e.g. '#A51C30')
 *     colorPrimaryButton: string | null,    // Primary button color override
 *     marketplaceName: string | null,       // Override for marketplace name
 *     logoUrl: string | null,               // URL to tenant logo image
 *     faviconUrl: string | null,            // URL to tenant favicon
 *     brandImageUrl: string | null,         // URL to hero/brand image
 *     facebookImageUrl: string | null,      // Social sharing image (1200x630)
 *     twitterImageUrl: string | null,       // Social sharing image (600x314)
 *   },
 *   features: {              // Feature flags per tenant
 *     aiCoaching: boolean,
 *     nda: boolean,
 *     assessments: boolean,
 *   },
 *   createdAt: string,       // ISO date
 *   updatedAt: string,       // ISO date
 * }
 *
 * When no tenant is active (e.g. main Street2Ivy domain), the context value is null.
 */
export const TenantContext = createContext(null);

export const TenantProvider = TenantContext.Provider;

/**
 * Hook to access the current tenant context.
 *
 * @returns {Object|null} The current tenant object, or null if no tenant is active (default marketplace).
 */
export const useTenant = () => {
  return useContext(TenantContext);
};
