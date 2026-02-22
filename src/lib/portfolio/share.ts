/**
 * Portfolio Share Utilities
 */

/**
 * Generate the public portfolio URL.
 */
export function getPortfolioUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://proveground.com';
  return `${baseUrl}/portfolio/${slug}`;
}

/**
 * Generate a LinkedIn share URL.
 */
export function getLinkedInShareUrl(portfolioUrl: string, title: string): string {
  const params = new URLSearchParams({
    url: portfolioUrl,
    title: `${title} - Proveground Portfolio`,
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}
