/**
 * Listing Management API
 *
 * Endpoints for corporate partners to manage their project listings:
 * - Close/delete a listing (soft close via Sharetribe SDK)
 *
 * Also includes the deadline expiration scheduler that auto-closes
 * listings whose application deadline has passed.
 */

const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');

/**
 * POST /api/listings/:listingId/close
 *
 * Corporate partner closes (removes) one of their own listings.
 * Sharetribe uses "close" rather than "delete" — the listing becomes
 * invisible on the marketplace but the data is preserved.
 */
const closeListing = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const { listingId } = req.params;

    const sharetribeSdk = require('sharetribe-flex-sdk');
    const { UUID } = sharetribeSdk.types;

    // Verify ownership by using ownListings.show (throws if not owned)
    const listingResponse = await sdk.ownListings.show({ id: new UUID(listingId) });
    const listing = listingResponse.data.data;
    const state = listing.attributes.state;

    if (state === 'closed') {
      return res.status(400).json({ error: 'This project is already closed.' });
    }

    if (state === 'draft') {
      // Discard draft listings
      await sdk.ownListings.discardDraft({ id: new UUID(listingId) });
      return res.status(200).json({
        success: true,
        message: 'Draft project has been discarded.',
        action: 'discarded',
      });
    }

    // Close published or pending listings
    await sdk.ownListings.close({ id: new UUID(listingId) });

    res.status(200).json({
      success: true,
      message: 'Project has been closed and removed from the marketplace.',
      action: 'closed',
    });
  } catch (e) {
    console.error('Error closing listing:', e);
    handleError(res, e);
  }
};

/**
 * POST /api/listings/:listingId/reopen
 *
 * Corporate partner reopens a closed listing.
 */
const reopenListing = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const { listingId } = req.params;

    const sharetribeSdk = require('sharetribe-flex-sdk');
    const { UUID } = sharetribeSdk.types;

    // Verify ownership
    const listingResponse = await sdk.ownListings.show({ id: new UUID(listingId) });
    const listing = listingResponse.data.data;
    const state = listing.attributes.state;

    if (state !== 'closed') {
      return res.status(400).json({ error: 'Only closed projects can be reopened.' });
    }

    await sdk.ownListings.open({ id: new UUID(listingId) });

    res.status(200).json({
      success: true,
      message: 'Project has been reopened.',
    });
  } catch (e) {
    console.error('Error reopening listing:', e);
    handleError(res, e);
  }
};

// ─── Deadline Expiration Scheduler ───────────────────────────────
//
// Periodically checks all published listings for expired application
// deadlines and auto-closes them. The applicationDeadline field is
// a relative enum (e.g. '1-week', '2-months') stored in publicData.
// We calculate the absolute deadline from the listing's createdAt date.
// ─────────────────────────────────────────────────────────────────

const DEADLINE_OFFSETS = {
  'asap': 7 * 24 * 60 * 60 * 1000,        // 7 days (rolling, give a grace period)
  '1-week': 7 * 24 * 60 * 60 * 1000,       // 7 days
  '2-weeks': 14 * 24 * 60 * 60 * 1000,     // 14 days
  '1-month': 30 * 24 * 60 * 60 * 1000,     // 30 days
  '2-months': 60 * 24 * 60 * 60 * 1000,    // 60 days
  // 'open' — never expires (open until filled)
};

let expirationTimerRunning = false;

function startDeadlineExpirationScheduler() {
  if (expirationTimerRunning) return;
  expirationTimerRunning = true;

  const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

  console.log('[Scheduler] Deadline expiration scheduler started (checks every hour)');

  const runCheck = async () => {
    try {
      // Use integration SDK to query all published listings across tenants
      const integrationSdk = getIntegrationSdkForTenant();

      if (!integrationSdk) {
        return;
      }

      const sharetribeSdk = require('sharetribe-flex-sdk');
      const now = Date.now();
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await integrationSdk.listings.query({
          states: ['published'],
          perPage: 100,
          page,
        });

        const listings = response.data.data;

        for (const listing of listings) {
          const { publicData, createdAt } = listing.attributes;
          const applicationDeadline = publicData?.applicationDeadline;

          if (!applicationDeadline || applicationDeadline === 'open') {
            continue; // Skip open-ended listings
          }

          const offset = DEADLINE_OFFSETS[applicationDeadline];
          if (!offset) continue;

          const createdTime = new Date(createdAt).getTime();
          const expiresAt = createdTime + offset;

          if (now > expiresAt) {
            // This listing's deadline has passed — close it
            try {
              await integrationSdk.listings.close({ id: listing.id });
              console.log(
                `[Scheduler] Auto-closed expired listing: ${listing.attributes.title} (${listing.id.uuid}) — deadline: ${applicationDeadline}`
              );
            } catch (closeErr) {
              console.error(
                `[Scheduler] Failed to close listing ${listing.id.uuid}:`,
                closeErr.message || closeErr
              );
            }
          }
        }

        const meta = response.data.meta;
        hasMore = meta && page < meta.totalPages;
        page++;
      }
    } catch (err) {
      console.error('[Scheduler] Deadline expiration check failed:', err.message || err);
    }
  };

  // Run first check after a short delay (let server start up)
  setTimeout(runCheck, 30 * 1000);

  // Then run periodically
  setInterval(runCheck, CHECK_INTERVAL);
}

module.exports = {
  closeListing,
  reopenListing,
  startDeadlineExpirationScheduler,
};
