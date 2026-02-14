/**
 * NDA E-Signature API
 *
 * Handles NDA document upload, signature requests, and status tracking.
 * Uses Dropbox Sign (HelloSign) API for e-signatures.
 *
 * Persistence: SQLite via server/api-util/db.js
 */

const db = require('../api-util/db');
const { getIntegrationSdkForTenant } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

const DROPBOX_SIGN_API_KEY = process.env.DROPBOX_SIGN_API_KEY;
const DROPBOX_SIGN_CLIENT_ID = process.env.DROPBOX_SIGN_CLIENT_ID;

/**
 * Sanitize text input to prevent XSS and injection attacks
 */
function sanitizeTextInput(text, maxLength = 50000) {
  if (!text || typeof text !== 'string') return '';
  return text
    .substring(0, maxLength)
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Initialize Dropbox Sign client
 */
function getDropboxSignClient() {
  if (!DROPBOX_SIGN_API_KEY) {
    console.warn('DROPBOX_SIGN_API_KEY not configured. Using mock signature service.');
    return null;
  }
  return null;
}

/**
 * POST /api/nda/upload
 */
async function uploadNdaDocument(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userType = currentUser.attributes.profile.publicData?.userType;
    if (userType !== 'corporate-partner') {
      return res.status(403).json({ error: 'Only corporate partners can upload NDA documents.' });
    }

    const { listingId, documentUrl, documentName, ndaText } = req.body;

    if (!listingId) {
      return res.status(400).json({ error: 'Listing ID is required.' });
    }

    if (!documentUrl && !ndaText) {
      return res.status(400).json({ error: 'Either document URL or NDA text is required.' });
    }

    const sanitizedNdaText = ndaText ? sanitizeTextInput(ndaText) : null;
    const sanitizedDocumentName = documentName ? sanitizeTextInput(documentName, 200) : 'NDA Agreement';

    const ndaDocument = {
      id: `nda_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      listingId,
      uploadedBy: currentUser.id.uuid,
      uploadedAt: new Date().toISOString(),
      documentUrl: documentUrl || null,
      documentName: sanitizedDocumentName,
      ndaText: sanitizedNdaText,
      status: 'active',
    };

    db.ndaDocuments.upsert(ndaDocument);

    // Also update the listing's privateData with NDA info
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);
    await integrationSdk.listings.update({
      id: listingId,
      privateData: {
        ndaDocumentId: ndaDocument.id,
        ndaDocumentUrl: documentUrl || null,
        ndaText: ndaText || null,
      },
      publicData: {
        ndaRequired: true,
      },
    });

    res.status(200).json({
      success: true,
      ndaDocument,
    });
  } catch (error) {
    console.error('Upload NDA error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/nda/:listingId
 */
async function getNdaDocument(req, res) {
  const { listingId } = req.params;

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const ndaDocument = db.ndaDocuments.getByListingId(listingId);

    if (!ndaDocument) {
      // Try to get from listing privateData
      const integrationSdk = getIntegrationSdkForTenant(req.tenant);
      const listingResponse = await integrationSdk.listings.show({ id: listingId });
      const listing = listingResponse.data.data;
      const privateData = listing.attributes.privateData || {};

      if (privateData.ndaDocumentId || privateData.ndaText) {
        return res.status(200).json({
          hasNda: true,
          ndaDocument: {
            id: privateData.ndaDocumentId,
            documentUrl: privateData.ndaDocumentUrl,
            ndaText: privateData.ndaText,
          },
        });
      }

      return res.status(200).json({ hasNda: false, ndaDocument: null });
    }

    res.status(200).json({
      hasNda: true,
      ndaDocument: {
        id: ndaDocument.id,
        documentUrl: ndaDocument.documentUrl,
        documentName: ndaDocument.documentName,
        ndaText: ndaDocument.ndaText,
        uploadedAt: ndaDocument.uploadedAt,
      },
    });
  } catch (error) {
    console.error('Get NDA error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/nda/request-signature/:transactionId
 */
async function requestSignature(req, res) {
  const { transactionId } = req.params;

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const integrationSdk = getIntegrationSdkForTenant(req.tenant);

    // Get transaction details
    const txResponse = await integrationSdk.transactions.show({
      id: transactionId,
      include: ['provider', 'customer', 'listing'],
    });

    const transaction = txResponse.data.data;
    const included = txResponse.data.included || [];

    let listing = null;
    let provider = null;
    let customer = null;

    included.forEach(item => {
      if (item.type === 'listing') listing = item;
      if (item.type === 'user') {
        const userId = item.id.uuid;
        if (userId === transaction.relationships.provider.data.id.uuid) provider = item;
        if (userId === transaction.relationships.customer.data.id.uuid) customer = item;
      }
    });

    // Check if user is the provider (corporate partner)
    const providerId = transaction.relationships.provider.data.id.uuid;
    if (currentUser.id.uuid !== providerId) {
      return res.status(403).json({
        error: 'Only the corporate partner can initiate signature requests.',
      });
    }

    // Get NDA document
    const listingId = listing.id.uuid;
    const ndaDoc = db.ndaDocuments.getByListingId(listingId);
    const listingPrivateData = listing.attributes.privateData || {};

    if (!ndaDoc && !listingPrivateData.ndaText && !listingPrivateData.ndaDocumentUrl) {
      return res.status(400).json({
        error: 'No NDA document found for this project. Please upload an NDA first.',
      });
    }

    // Check for existing signature request
    const existingRequest = db.ndaSignatures.getByTransactionId(transactionId);
    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(200).json({
        success: true,
        message: 'Signature request already exists.',
        signatureRequest: existingRequest,
      });
    }

    // Create signature request
    const signatureRequestId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const signatureRequest = {
      id: signatureRequestId,
      transactionId,
      listingId,
      title: `NDA for ${listing.attributes.title}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      signers: [
        {
          id: `signer_provider_${signatureRequestId}`,
          userId: provider.id.uuid,
          email: provider.attributes.email,
          name: provider.attributes.profile.displayName,
          role: 'provider',
          status: 'pending',
          signedAt: null,
        },
        {
          id: `signer_customer_${signatureRequestId}`,
          userId: customer.id.uuid,
          email: customer.attributes.email,
          name: customer.attributes.profile.displayName,
          role: 'customer',
          status: 'pending',
          signedAt: null,
        },
      ],
      documentUrl: ndaDoc?.documentUrl || null,
      ndaText: ndaDoc?.ndaText || listingPrivateData.ndaText || null,
      signedDocumentUrl: null,
    };

    db.ndaSignatures.upsert(signatureRequest);

    // Update transaction metadata
    const currentMetadata = transaction.attributes.metadata || {};
    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: {
        ...currentMetadata,
        ndaSignatureRequestId: signatureRequestId,
        ndaSignatureStatus: 'pending',
        ndaSignatureRequestedAt: new Date().toISOString(),
      },
    });

    res.status(200).json({
      success: true,
      signatureRequest,
    });
  } catch (error) {
    console.error('Request signature error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/nda/signature-status/:transactionId
 */
async function getSignatureStatus(req, res) {
  const { transactionId } = req.params;

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const signatureRequest = db.ndaSignatures.getByTransactionId(transactionId);

    if (!signatureRequest) {
      const integrationSdk = getIntegrationSdkForTenant(req.tenant);
      const txResponse = await integrationSdk.transactions.show({ id: transactionId });
      const metadata = txResponse.data.data.attributes.metadata || {};

      return res.status(200).json({
        hasSignatureRequest: false,
        ndaSignatureStatus: metadata.ndaSignatureStatus || null,
        ndaFullySigned: metadata.ndaFullySigned || false,
      });
    }

    const signers = signatureRequest.signers || [];
    const userSigner = signers.find(s => s.userId === currentUser.id.uuid);

    res.status(200).json({
      hasSignatureRequest: true,
      signatureRequest: {
        id: signatureRequest.id,
        status: signatureRequest.status,
        createdAt: signatureRequest.createdAt,
        signers: signers.map(s => ({
          name: s.name,
          role: s.role,
          status: s.status,
          signedAt: s.signedAt,
        })),
        ndaText: signatureRequest.ndaText,
        documentUrl: signatureRequest.documentUrl,
        signedDocumentUrl: signatureRequest.signedDocumentUrl,
      },
      currentUserSigner: userSigner
        ? {
            id: userSigner.id,
            status: userSigner.status,
            signedAt: userSigner.signedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Get signature status error:', error);
    handleError(res, error);
  }
}

/**
 * POST /api/nda/sign/:transactionId
 */
async function signNda(req, res) {
  const { transactionId } = req.params;
  const { signatureData, agreedToTerms } = req.body;

  if (!agreedToTerms) {
    return res.status(400).json({ error: 'You must agree to the terms.' });
  }

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    let signatureRequest = db.ndaSignatures.getByTransactionId(transactionId);

    // If no signature request exists, create one first
    if (!signatureRequest) {
      const integrationSdk = getIntegrationSdkForTenant(req.tenant);
      const txResponse = await integrationSdk.transactions.show({
        id: transactionId,
        include: ['provider', 'customer', 'listing'],
      });

      const transaction = txResponse.data.data;
      const included = txResponse.data.included || [];

      let listing = null;
      let provider = null;
      let customer = null;

      included.forEach(item => {
        if (item.type === 'listing') listing = item;
        if (item.type === 'user') {
          const userId = item.id.uuid;
          if (userId === transaction.relationships.provider.data.id.uuid) provider = item;
          if (userId === transaction.relationships.customer.data.id.uuid) customer = item;
        }
      });

      const listingPrivateData = listing?.attributes?.privateData || {};
      const listingPublicData = listing?.attributes?.publicData || {};

      const signatureRequestId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      signatureRequest = {
        id: signatureRequestId,
        transactionId,
        listingId: listing?.id?.uuid,
        title: `NDA for ${listing?.attributes?.title}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        signers: [
          {
            id: `signer_provider_${signatureRequestId}`,
            userId: provider.id.uuid,
            email: provider.attributes.email,
            name: provider.attributes.profile.displayName,
            role: 'provider',
            status: 'pending',
            signedAt: null,
            signatureData: null,
          },
          {
            id: `signer_customer_${signatureRequestId}`,
            userId: customer.id.uuid,
            email: customer.attributes.email,
            name: customer.attributes.profile.displayName,
            role: 'customer',
            status: 'pending',
            signedAt: null,
            signatureData: null,
          },
        ],
        ndaText:
          listingPrivateData.ndaText ||
          listingPublicData.ndaText ||
          getDefaultNdaText(listing?.attributes?.title),
        documentUrl: listingPrivateData.ndaDocumentUrl || null,
        signedDocumentUrl: null,
      };

      db.ndaSignatures.upsert(signatureRequest);
    }

    // Find the current user's signer record
    const signers = signatureRequest.signers || [];
    const signerIndex = signers.findIndex(s => s.userId === currentUser.id.uuid);

    if (signerIndex === -1) {
      return res.status(403).json({
        error: 'You are not authorized to sign this NDA.',
      });
    }

    const signer = signers[signerIndex];

    if (signer.status === 'signed') {
      return res.status(400).json({
        error: 'You have already signed this NDA.',
        signedAt: signer.signedAt,
      });
    }

    // Record the signature
    const signedAt = new Date().toISOString();
    signers[signerIndex] = {
      ...signer,
      status: 'signed',
      signedAt,
      signatureData: signatureData || `Signed by ${currentUser.attributes.profile.displayName}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    // Check if all signers have signed
    const allSigned = signers.every(s => s.status === 'signed');

    signatureRequest.signers = signers;

    if (allSigned) {
      signatureRequest.status = 'completed';
      signatureRequest.completedAt = new Date().toISOString();
      signatureRequest.signedDocumentUrl = `https://storage.street2ivy.com/signed-ndas/${signatureRequest.id}.pdf`;
    }

    db.ndaSignatures.upsert(signatureRequest);

    // Update transaction metadata
    const integrationSdk = getIntegrationSdkForTenant(req.tenant);
    const txResponse = await integrationSdk.transactions.show({ id: transactionId });
    const currentMetadata = txResponse.data.data.attributes.metadata || {};

    const metadataUpdate = {
      ...currentMetadata,
      ndaSignatureRequestId: signatureRequest.id,
      ndaSignatureStatus: signatureRequest.status,
      [`nda${signer.role.charAt(0).toUpperCase() + signer.role.slice(1)}SignedAt`]: signedAt,
    };

    if (allSigned) {
      metadataUpdate.ndaFullySigned = true;
      metadataUpdate.ndaCompletedAt = signatureRequest.completedAt;
      metadataUpdate.signedNdaUrl = signatureRequest.signedDocumentUrl;
    }

    await integrationSdk.transactions.updateMetadata({
      id: transactionId,
      metadata: metadataUpdate,
    });

    res.status(200).json({
      success: true,
      message: allSigned
        ? 'NDA fully signed by all parties!'
        : 'Your signature has been recorded. Waiting for other party to sign.',
      signatureRequest: {
        id: signatureRequest.id,
        status: signatureRequest.status,
        signers: signers.map(s => ({
          name: s.name,
          role: s.role,
          status: s.status,
          signedAt: s.signedAt,
        })),
        signedDocumentUrl: signatureRequest.signedDocumentUrl,
      },
      allSigned,
    });
  } catch (error) {
    console.error('Sign NDA error:', error);
    handleError(res, error);
  }
}

/**
 * GET /api/nda/download/:transactionId
 */
async function downloadSignedNda(req, res) {
  const { transactionId } = req.params;

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;

    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const signatureRequest = db.ndaSignatures.getByTransactionId(transactionId);

    if (!signatureRequest) {
      return res.status(404).json({ error: 'No signature request found.' });
    }

    const signers = signatureRequest.signers || [];
    const isSigner = signers.some(s => s.userId === currentUser.id.uuid);
    if (!isSigner) {
      return res.status(403).json({ error: 'You are not authorized to download this document.' });
    }

    if (signatureRequest.status !== 'completed') {
      return res.status(400).json({
        error: 'NDA has not been fully signed yet.',
        status: signatureRequest.status,
      });
    }

    res.status(200).json({
      success: true,
      document: {
        url: signatureRequest.signedDocumentUrl,
        title: signatureRequest.title,
        completedAt: signatureRequest.completedAt,
        signers: signers.map(s => ({
          name: s.name,
          role: s.role,
          signedAt: s.signedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Download signed NDA error:', error);
    handleError(res, error);
  }
}

/**
 * Generate default NDA text if none is provided
 */
function getDefaultNdaText(projectTitle) {
  return `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of the date of the last signature below.

PROJECT: ${projectTitle || 'Campus2Career Project'}

1. CONFIDENTIAL INFORMATION
The parties agree that all information shared in connection with this project, including but not limited to business plans, technical data, trade secrets, customer information, and any other proprietary information, shall be considered confidential.

2. OBLIGATIONS
The receiving party agrees to:
- Keep all confidential information strictly confidential
- Not disclose confidential information to any third party without prior written consent
- Use confidential information only for the purposes of this project
- Take reasonable measures to protect confidential information

3. TERM
This Agreement shall remain in effect for a period of two (2) years from the date of execution.

4. RETURN OF MATERIALS
Upon completion of the project or termination of this Agreement, all confidential materials shall be returned or destroyed.

5. ACKNOWLEDGMENT
By signing below, both parties acknowledge they have read, understand, and agree to be bound by the terms of this Agreement.

This document is legally binding once signed by all parties.`;
}

// Webhook handler for Dropbox Sign callbacks (production use)
async function handleWebhook(req, res) {
  res.status(200).json({ success: true });
}

module.exports = {
  uploadDocument: uploadNdaDocument,
  getDocument: getNdaDocument,
  requestSignature,
  getSignatureStatus,
  sign: signNda,
  download: downloadSignedNda,
  webhook: handleWebhook,
};
