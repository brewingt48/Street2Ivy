/**
 * Reviews API
 *
 * Fetches reviews using the Marketplace SDK (user's authenticated session).
 * Note: The Integration SDK does NOT support the reviews endpoint,
 * so we must use the Marketplace SDK which has reviews.query() and reviews.show().
 */
const { getSdk, handleError } = require('../api-util/sdk');
const { types: sdkTypes } = require('sharetribe-flex-sdk');
const { UUID } = sdkTypes;

const getReviewsForUser = async (req, res) => {
  try {
    const sdk = getSdk(req, res);

    // Get current user
    const currentUserRes = await sdk.currentUser.show();
    const userId = currentUserRes.data.data.id;

    // Use Marketplace SDK for reviews (Integration SDK doesn't support reviews endpoint)
    // Fetch reviews about this user (where they are the subject)
    const aboutUserRes = await sdk.reviews.query({
      subjectId: userId,
      state: 'public',
      include: ['author', 'author.profileImage', 'listing'],
    });

    // Fetch reviews written by this user
    const byUserRes = await sdk.reviews.query({
      authorId: userId,
      state: 'public',
      include: ['subject', 'subject.profileImage', 'listing'],
    });

    // Format the reviews
    const formatReviews = (response, type) => {
      const reviews = response.data.data || [];
      const included = response.data.included || [];

      return reviews.map(review => {
        const attrs = review.attributes;

        // Find related entities in included
        const authorRel = review.relationships?.author?.data;
        const subjectRel = review.relationships?.subject?.data;
        const listingRel = review.relationships?.listing?.data;

        const author = authorRel ? included.find(i => i.id.uuid === authorRel.id.uuid && i.type === 'user') : null;
        const subject = subjectRel ? included.find(i => i.id.uuid === subjectRel.id.uuid && i.type === 'user') : null;
        const listing = listingRel ? included.find(i => i.id.uuid === listingRel.id.uuid && i.type === 'listing') : null;

        return {
          id: review.id.uuid,
          type: attrs.type, // 'ofProvider' or 'ofCustomer'
          rating: attrs.rating,
          content: attrs.content,
          createdAt: attrs.createdAt,
          state: attrs.state,
          author: author ? {
            id: author.id.uuid,
            displayName: author.attributes.profile?.displayName || 'Unknown',
            abbreviatedName: author.attributes.profile?.abbreviatedName || '??',
          } : null,
          subject: subject ? {
            id: subject.id.uuid,
            displayName: subject.attributes.profile?.displayName || 'Unknown',
          } : null,
          projectTitle: listing?.attributes?.title || 'Unknown Project',
        };
      });
    };

    const reviewsAboutUser = formatReviews(aboutUserRes, 'about');
    const reviewsByUser = formatReviews(byUserRes, 'by');

    res.status(200).json({
      reviewsAboutUser,
      reviewsByUser,
      totalAbout: reviewsAboutUser.length,
      totalBy: reviewsByUser.length,
      averageRating: reviewsAboutUser.length > 0
        ? (reviewsAboutUser.reduce((sum, r) => sum + r.rating, 0) / reviewsAboutUser.length).toFixed(1)
        : null,
    });

  } catch (err) {
    console.error('[Reviews] Failed to fetch reviews:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch reviews', details: err.message });
  }
};

const getReviewsForTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const sdk = getSdk(req, res);

    // Use Marketplace SDK for reviews (Integration SDK doesn't support reviews endpoint)
    const reviewsRes = await sdk.reviews.query({
      transactionId: new UUID(transactionId),
      state: 'public',
      include: ['author', 'author.profileImage', 'subject'],
    });

    const reviews = reviewsRes.data.data || [];
    const included = reviewsRes.data.included || [];

    const formattedReviews = reviews.map(review => {
      const attrs = review.attributes;
      const authorRel = review.relationships?.author?.data;
      const subjectRel = review.relationships?.subject?.data;

      const author = authorRel ? included.find(i => i.id.uuid === authorRel.id.uuid && i.type === 'user') : null;
      const subject = subjectRel ? included.find(i => i.id.uuid === subjectRel.id.uuid && i.type === 'user') : null;

      return {
        id: review.id.uuid,
        type: attrs.type,
        rating: attrs.rating,
        content: attrs.content,
        createdAt: attrs.createdAt,
        author: author ? {
          id: author.id.uuid,
          displayName: author.attributes.profile?.displayName || 'Unknown',
        } : null,
        subject: subject ? {
          id: subject.id.uuid,
          displayName: subject.attributes.profile?.displayName || 'Unknown',
        } : null,
      };
    });

    res.status(200).json({ reviews: formattedReviews });

  } catch (err) {
    console.error('[Reviews] Failed to fetch transaction reviews:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch reviews', details: err.message });
  }
};

module.exports = {
  getReviewsForUser,
  getReviewsForTransaction,
};
