/**
 * Tenant Listing Filters API
 *
 * Returns the current tenant's corporate partner IDs so the frontend
 * can scope Sharetribe listing searches to only the authors that belong
 * to this tenant's marketplace.
 *
 * - For tenants with configured corporatePartnerIds, returns those IDs
 *   as `authorIds` so the frontend can pass them to the Sharetribe SDK
 *   query (e.g. `authorId` filter).
 * - For the default tenant (no partner IDs), returns null so no
 *   author-based filtering is applied (all listings are shown).
 *
 * This endpoint is public (no authentication required) because it only
 * exposes filter configuration, not any sensitive data.
 */

module.exports = (req, res) => {
  const partnerIds = req.tenant?.corporatePartnerIds || [];

  // If no partner IDs configured (default tenant), don't filter
  res.status(200).json({
    authorIds: partnerIds.length > 0 ? partnerIds : null,
    tenantId: req.tenant?.id || 'default',
  });
};
