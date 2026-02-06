/**
 * NDA E-Signature API
 *
 * Handles NDA document upload, signature requests, and status tracking.
 * Uses Dropbox Sign (HelloSign) API for e-signatures.
 *
 * Flow:
 * 1. Corporate partner uploads NDA document when creating project
 * 2. When student is accepted, signature request is created
 * 3. Both parties sign electronically
 * 4. Signed document is stored and both parties get copies
 *
 * Environment variables needed:
 * - DROPBOX_SIGN_API_KEY: API key for Dropbox Sign (HelloSign)
 * - DROPBOX_SIGN_CLIENT_ID: Client ID for embedded signing
 */

const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getSdk, handleError } = require('../api-util/sdk');

// For production, use the actual Dropbox Sign SDK:
// const HelloSignSDK = require('@dropbox/sign');
// For now, we'll implement a mock that can be swapped with real API

const DROPBOX_SIGN_API_KEY = process.env.DROPBOX_SIGN_API_KEY;
const DROPBOX_SIGN_CLIENT_ID = process.env.DROPBOX_SIGN_CLIENT_ID;

/**
 * Sanitize text input to prevent XSS and injection attacks
 */
function sanitizeTextInput(text, maxLength = 50000) {
  if (!text || typeof text !== 'string') return '';
  return text
    .substring(0, maxLength)
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escape HTML entities for safe display
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// In-memory store for NDA documents and signature requests
// In production, this would be in a database
let ndaDocuments = new Map();
let signatureRequests = new Map();

/**
 * Initialize Dropbox Sign client
 */
function getDropboxSignClient() {
  if (!DROPBOX_SIGN_API_KEY) {
    console.warn('DROPBOX_SIGN_API_KEY not configured. Using mock signature service.');
    return null;
  }

  // In production, initialize the actual SDK:
  // const api = new HelloSignSDK.SignatureRequestApi();
  // api.username = DROPBOX_SIGN_API_KEY;
  // return api;
  return null;
}

/**
 * POST /api/nda/upload
 *
 * Upload an NDA document for a listing.
 * Called by corporate partners when creating/editing their project listing.
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

    // Sanitize text inputs to prevent XSS
    const sanitizedNdaText = ndaText ? sanitizeTextInput(ndaText) : null;
    const sanitizedDocumentName = documentName ? sanitizeTextInput(documentName, 200) : 'NDA Agreement';

    const ndaDocument = {
      id: `nda_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      listingId,
      uploadedBy: currentUser.id.uuid,
      uploadedAt: new Date().toISOString(),
      documentUrl: documentUrl || null,
      documentName: sanitizedDocumentName,
      ndaText: sanitizedNdaText, // For text-based NDAs
      status: 'active',
    };

    ndaDocuments.set(listingId, ndaDocument);

    // Also update the listing's privateData with NDA info
    const integrationSdk = getIntegrationSdk();
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
 *
 * Get NDA document info for a listing.
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

    const ndaDocument = ndaDocuments.get(listingId);

    if (!ndaDocument) {
      // Try to get from listing privateData
      const integrationSdk = getIntegrationSdk();
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
 *
 * Create a signature request for an NDA when a student is accepted.
 * This initiates the e-signature workflow for both parties.
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

    const integrationSdk = getIntegrationSdk();

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
    const ndaDoc = ndaDocuments.get(listingId);
    const listingPrivateData = listing.attributes.privateData || {};

    if (!ndaDoc && !listingPrivateData.ndaText && !listingPrivateData.ndaDocumentUrl) {
      return res.status(400).json({
        error: 'No NDA document found for this project. Please upload an NDA first.',
      });
    }

    // Check for existing signature request
    const existingRequest = signatureRequests.get(transactionId);
    if (existingRequest && existingRequest.status === 'pending') {
      return res.status(200).json({
        success: true,
        message: 'Signature request already exists.',
        signatureRequest: existingRequest,
      });
    }

    // Create signature request
    const signatureRequestId = `sig_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const dropboxSignClient = getDropboxSignClient();

    let signatureRequest;

    if (dropboxSignClient) {
      // Production: Use Dropbox Sign API
      // const sigRequest = await dropboxSignClient.createEmbeddedSignatureRequest({
      //   clientId: DROPBOX_SIGN_CLIENT_ID,
      //   title: `NDA for ${listing.attributes.title}`,
      //   subject: 'Please sign the Non-Disclosure Agreement',
      //   message: 'Please review and sign the NDA to proceed with the project.',
      //   signers: [
      //     { emailAddress: provider.attributes.email, name: provider.attributes.profile.displayName, order: 0 },
      //     { emailAddress: customer.attributes.email, name: customer.attributes.profile.displayName, order: 1 },
      //   ],
      //   fileUrls: ndaDoc?.documentUrl ? [ndaDoc.documentUrl] : undefined,
      //   testMode: process.env.NODE_ENV !== 'production',
      // });

      signatureRequest = {
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
            signUrl: null, // Would be populated by Dropbox Sign
          },
          {
            id: `signer_customer_${signatureRequestId}`,
            userId: customer.id.uuid,
            email: customer.attributes.email,
            name: customer.attributes.profile.displayName,
            role: 'customer',
            status: 'pending',
            signedAt: null,
            signUrl: null,
          },
        ],
        documentUrl: ndaDoc?.documentUrl || null,
        ndaText: ndaDoc?.ndaText || listingPrivateData.ndaText || null,
        signedDocumentUrl: null,
      };
    } else {
      // Development/Mock: Create local signature request
      signatureRequest = {
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
    }

    signatureRequests.set(transactionId, signatureRequest);

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
 *
 * Get the current signature status for a transaction's NDA.
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

    const signatureRequest = signatureRequests.get(transactionId);

    if (!signatureRequest) {
      // Check transaction metadata
      const integrationSdk = getIntegrationSdk();
      const txResponse = await integrationSdk.transactions.show({ id: transactionId });
      const metadata = txResponse.data.data.attributes.metadata || {};

      return res.status(200).json({
        hasSignatureRequest: false,
        ndaSignatureStatus: metadata.ndaSignatureStatus || null,
        ndaFullySigned: metadata.ndaFullySigned || false,
      });
    }

    // Check if current user is a signer
    const userSigner = signatureRequest.signers.find(s => s.userId === currentUser.id.uuid);

    res.status(200).json({
      hasSignatureRequest: true,
      signatureRequest: {
        id: signatureRequest.id,
        status: signatureRequest.status,
        createdAt: signatureRequest.createdAt,
        signers: signatureRequest.signers.map(s => ({
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
 *
 * Sign the NDA (for in-app signature without external provider).
 * Records the user's digital signature.
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

    let signatureRequest = signatureRequests.get(transactionId);

    // If no signature request exists, create one first
    if (!signatureRequest) {
      const integrationSdk = getIntegrationSdk();
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

      // Create a new signature request
      const signatureRequestId = `sig_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

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

      signatureRequests.set(transactionId, signatureRequest);
    }

    // Find the current user's signer record
    const signerIndex = signatureRequest.signers.findIndex(s => s.userId === currentUser.id.uuid);

    if (signerIndex === -1) {
      return res.status(403).json({
        error: 'You are not authorized to sign this NDA.',
      });
    }

    const signer = signatureRequest.signers[signerIndex];

    if (signer.status === 'signed') {
      return res.status(400).json({
        error: 'You have already signed this NDA.',
        signedAt: signer.signedAt,
      });
    }

    // Record the signature
    const signedAt = new Date().toISOString();
    signatureRequest.signers[signerIndex] = {
      ...signer,
      status: 'signed',
      signedAt,
      signatureData: signatureData || `Signed by ${currentUser.attributes.profile.displayName}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
    };

    // Check if all signers have signed
    const allSigned = signatureRequest.signers.every(s => s.status === 'signed');

    if (allSigned) {
      signatureRequest.status = 'completed';
      signatureRequest.completedAt = new Date().toISOString();

      // In production, generate signed PDF and store URL
      signatureRequest.signedDocumentUrl = `https://storage.street2ivy.com/signed-ndas/${signatureRequest.id}.pdf`;
    }

    signatureRequests.set(transactionId, signatureRequest);

    // Update transaction metadata
    const integrationSdk = getIntegrationSdk();
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
        signers: signatureRequest.signers.map(s => ({
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
 *
 * Download the signed NDA document.
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

    const signatureRequest = signatureRequests.get(transactionId);

    if (!signatureRequest) {
      return res.status(404).json({ error: 'No signature request found.' });
    }

    // Verify user is a party to this NDA
    const isSigner = signatureRequest.signers.some(s => s.userId === currentUser.id.uuid);
    if (!isSigner) {
      return res.status(403).json({ error: 'You are not authorized to download this document.' });
    }

    if (signatureRequest.status !== 'completed') {
      return res.status(400).json({
        error: 'NDA has not been fully signed yet.',
        status: signatureRequest.status,
      });
    }

    // In production, return the actual signed document URL or stream the file
    // For now, return the document info
    res.status(200).json({
      success: true,
      document: {
        url: signatureRequest.signedDocumentUrl,
        title: signatureRequest.title,
        completedAt: signatureRequest.completedAt,
        signers: signatureRequest.signers.map(s => ({
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

PROJECT: ${projectTitle || 'Street2Ivy Project'}

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
  // In production, verify webhook signature and handle events
  // Events: signature_request_signed, signature_request_all_signed, etc.
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
