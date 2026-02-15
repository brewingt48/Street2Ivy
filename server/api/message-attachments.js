/**
 * Message Attachments API
 *
 * IMPORTANT: Heroku Ephemeral Filesystem Limitation
 * ================================================
 * This module stores files on the local filesystem and metadata in a JSON file.
 * On Heroku, the filesystem is ephemeral — files are lost on every deploy or
 * dyno restart. This means:
 * - Uploaded attachments will be lost on deploy
 * - Attachment metadata (JSON file) will be reset
 *
 * TODO: Migrate to cloud storage:
 * 1. Install aws-sdk and configure S3 bucket
 * 2. Store files in S3 instead of local filesystem
 * 3. Store metadata in Sharetribe transaction metadata
 * 4. Use S3 signed URLs for secure, time-limited downloads
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSdk, handleError } = require('../api-util/sdk');
const { getIntegrationSdk } = require('../api-util/integrationSdk');

// Configuration
const UPLOAD_DIR = path.join(__dirname, '../uploads/attachments');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.doc', '.xls', '.ppt'];
const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.sh', '.cmd', '.ps1', '.msi', '.jar', '.js', '.vbs'];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Metadata file for tracking attachments
const ATTACHMENTS_META_FILE = path.join(__dirname, '../data/attachments-meta.json');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Load attachments metadata from persistent storage
 */
function loadAttachmentsMeta() {
  try {
    if (fs.existsSync(ATTACHMENTS_META_FILE)) {
      const data = fs.readFileSync(ATTACHMENTS_META_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading attachments metadata:', error);
  }
  return { attachments: {}, idCounter: 1 };
}

/**
 * Save attachments metadata to persistent storage
 */
function saveAttachmentsMeta(meta) {
  try {
    fs.writeFileSync(ATTACHMENTS_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving attachments metadata:', error);
    return false;
  }
}

/**
 * Generate a unique attachment ID
 */
function generateAttachmentId() {
  return crypto.randomUUID();
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Check if file type is allowed
 */
function isFileTypeAllowed(filename) {
  const ext = getFileExtension(filename);

  // Block dangerous extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { allowed: false, reason: `File type ${ext} is not allowed for security reasons` };
  }

  // Check if extension is in allowed list
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      allowed: false,
      reason: `File type ${ext} is not supported. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  return { allowed: true };
}

/**
 * Get file type category for display
 */
function getFileTypeCategory(filename) {
  const ext = getFileExtension(filename);

  if (['.pdf'].includes(ext)) return 'pdf';
  if (['.doc', '.docx'].includes(ext)) return 'document';
  if (['.xls', '.xlsx'].includes(ext)) return 'spreadsheet';
  if (['.ppt', '.pptx'].includes(ext)) return 'presentation';
  if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) return 'image';
  return 'file';
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Authenticate the current user and return their data.
 * Returns null and sends a 401 response if not authenticated.
 */
async function authenticateUser(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    if (!currentUser) {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    }
    return currentUser;
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }
}

/**
 * Verify that the user is a participant in the given transaction context.
 * Returns true if authorized, false otherwise (sends 403 response).
 */
async function verifyContextAccess(userId, attachment, res) {
  if (attachment.contextType === 'transaction' || attachment.contextType === 'workspace') {
    try {
      const integrationSdk = getIntegrationSdk();
      const txResponse = await integrationSdk.transactions.show({
        id: attachment.contextId,
      });
      const tx = txResponse.data.data;
      const customerId = tx.relationships?.customer?.data?.id?.uuid;
      const providerId = tx.relationships?.provider?.data?.id?.uuid;

      if (userId !== customerId && userId !== providerId) {
        res.status(403).json({ error: 'You do not have access to this attachment' });
        return false;
      }
      return true;
    } catch (error) {
      // If the transaction doesn't exist or can't be fetched, deny access
      res.status(403).json({ error: 'Unable to verify access to this attachment' });
      return false;
    }
  }
  // For non-transaction contexts, authenticated user is sufficient
  return true;
}

/**
 * Scan uploaded file for potential threats.
 *
 * Current implementation: Basic content validation (magic bytes check).
 * TODO: Integrate with ClamAV (via clamscan npm package) or a cloud
 * scanning API (e.g., VirusTotal, AWS Macie) for real malware detection.
 */
async function scanFile(file) {
  try {
    const filePath = file.tempFilePath || file.path;
    if (!filePath || !fs.existsSync(filePath)) {
      return { safe: true, warning: 'No temp file path available for scanning' };
    }

    const buffer = fs.readFileSync(filePath);
    const header = buffer.slice(0, 8);
    const ext = getFileExtension(file.name);

    // PDF files should start with %PDF
    if (ext === '.pdf' && !buffer.slice(0, 5).toString().startsWith('%PDF')) {
      return { safe: false, reason: 'File content does not match PDF format' };
    }

    // JPEG files should start with FF D8 FF
    if (['.jpg', '.jpeg'].includes(ext)) {
      if (header[0] !== 0xFF || header[1] !== 0xD8 || header[2] !== 0xFF) {
        return { safe: false, reason: 'File content does not match JPEG format' };
      }
    }

    // PNG files should start with 89 50 4E 47
    if (ext === '.png') {
      if (header[0] !== 0x89 || header[1] !== 0x50 || header[2] !== 0x4E || header[3] !== 0x47) {
        return { safe: false, reason: 'File content does not match PNG format' };
      }
    }

    // GIF files should start with GIF87a or GIF89a
    if (ext === '.gif') {
      const gifHeader = buffer.slice(0, 6).toString();
      if (gifHeader !== 'GIF87a' && gifHeader !== 'GIF89a') {
        return { safe: false, reason: 'File content does not match GIF format' };
      }
    }

    // Check for embedded scripts in document files
    if (['.pdf'].includes(ext)) {
      const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
      if (content.includes('/JavaScript') || content.includes('/JS')) {
        console.log(JSON.stringify({
          _type: 'audit',
          _version: 1,
          eventType: 'FILE_SCAN_WARNING',
          filename: file.name,
          reason: 'PDF contains JavaScript',
          timestamp: new Date().toISOString(),
        }));
      }
    }

    return { safe: true };
  } catch (error) {
    console.error('File scan error:', error);
    return { safe: true, warning: 'Scan skipped due to error' };
  }
}

/**
 * Upload attachment
 * POST /api/attachments/upload
 */
async function uploadAttachment(req, res) {
  try {
    const currentUser = await authenticateUser(req, res);
    if (!currentUser) return;
    const userId = currentUser.id.uuid;

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const { contextType, contextId } = req.body;

    // Validate context
    if (!contextType || !contextId) {
      return res.status(400).json({ error: 'Missing contextType or contextId' });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`
      });
    }

    // Check file type
    const typeCheck = isFileTypeAllowed(file.name);
    if (!typeCheck.allowed) {
      return res.status(400).json({ error: typeCheck.reason });
    }

    // Scan file for threats
    const scanResult = await scanFile(file);
    if (!scanResult.safe) {
      return res.status(400).json({
        error: `File rejected: ${scanResult.reason}`,
        code: 'FILE_SCAN_FAILED',
      });
    }

    // Generate unique ID and filename
    const attachmentId = generateAttachmentId();
    const ext = getFileExtension(file.name);
    const safeFilename = `${attachmentId}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    // Save file
    await file.mv(filePath);

    // Create attachment metadata
    const attachment = {
      id: attachmentId,
      originalName: file.name,
      storedName: safeFilename,
      mimeType: file.mimetype,
      size: file.size,
      sizeFormatted: formatFileSize(file.size),
      fileType: getFileTypeCategory(file.name),
      extension: ext,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      contextType, // 'transaction', 'workspace', etc.
      contextId,   // The ID of the transaction/workspace
      downloadCount: 0,
    };

    // Save metadata
    const meta = loadAttachmentsMeta();
    meta.attachments[attachmentId] = attachment;
    saveAttachmentsMeta(meta);

    res.status(200).json({
      success: true,
      attachment: {
        id: attachment.id,
        name: attachment.originalName,
        size: attachment.size,
        sizeFormatted: attachment.sizeFormatted,
        fileType: attachment.fileType,
        extension: attachment.extension,
        url: `/api/attachments/${attachmentId}/download`,
        previewUrl: attachment.fileType === 'image' ? `/api/attachments/${attachmentId}/preview` : null,
      },
    });
  } catch (error) {
    console.error('Attachment upload error:', error);
    handleError(res, error);
  }
}

/**
 * Download attachment
 * GET /api/attachments/:id/download
 */
async function downloadAttachment(req, res) {
  try {
    // SECURITY: Require authentication
    const currentUser = await authenticateUser(req, res);
    if (!currentUser) return;

    const { id } = req.params;

    // Load metadata
    const meta = loadAttachmentsMeta();
    const attachment = meta.attachments[id];

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // SECURITY: Verify user has access to this attachment's context
    const hasAccess = await verifyContextAccess(currentUser.id.uuid, attachment, res);
    if (!hasAccess) return;

    const filePath = path.join(UPLOAD_DIR, attachment.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Update download count
    attachment.downloadCount++;
    attachment.lastDownloadedAt = new Date().toISOString();
    saveAttachmentsMeta(meta);

    // Set headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', attachment.size);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Attachment download error:', error);
    handleError(res, error);
  }
}

/**
 * Preview attachment (for images)
 * GET /api/attachments/:id/preview
 */
async function previewAttachment(req, res) {
  try {
    // SECURITY: Require authentication
    const currentUser = await authenticateUser(req, res);
    if (!currentUser) return;

    const { id } = req.params;

    // Load metadata
    const meta = loadAttachmentsMeta();
    const attachment = meta.attachments[id];

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (attachment.fileType !== 'image') {
      return res.status(400).json({ error: 'Preview only available for images' });
    }

    // SECURITY: Verify user has access to this attachment's context
    const hasAccess = await verifyContextAccess(currentUser.id.uuid, attachment, res);
    if (!hasAccess) return;

    const filePath = path.join(UPLOAD_DIR, attachment.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set headers for inline display
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);

    // Stream file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Attachment preview error:', error);
    handleError(res, error);
  }
}

/**
 * Get attachments for a context (e.g., all attachments for a transaction)
 * GET /api/attachments?contextType=transaction&contextId=xxx
 */
async function getAttachments(req, res) {
  try {
    // SECURITY: Require authentication
    const currentUser = await authenticateUser(req, res);
    if (!currentUser) return;

    const { contextType, contextId } = req.query;

    if (!contextType || !contextId) {
      return res.status(400).json({ error: 'Missing contextType or contextId' });
    }

    // SECURITY: Verify user has access to this context
    const hasAccess = await verifyContextAccess(
      currentUser.id.uuid,
      { contextType, contextId },
      res
    );
    if (!hasAccess) return;

    // Load metadata
    const meta = loadAttachmentsMeta();

    // Filter attachments by context
    const attachments = Object.values(meta.attachments)
      .filter(a => a.contextType === contextType && a.contextId === contextId)
      .map(a => ({
        id: a.id,
        name: a.originalName,
        size: a.size,
        sizeFormatted: a.sizeFormatted,
        fileType: a.fileType,
        extension: a.extension,
        uploadedAt: a.uploadedAt,
        url: `/api/attachments/${a.id}/download`,
        previewUrl: a.fileType === 'image' ? `/api/attachments/${a.id}/preview` : null,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.status(200).json({
      success: true,
      attachments,
    });
  } catch (error) {
    console.error('Get attachments error:', error);
    handleError(res, error);
  }
}

/**
 * Delete attachment
 * DELETE /api/attachments/:id
 */
async function deleteAttachment(req, res) {
  try {
    const currentUser = await authenticateUser(req, res);
    if (!currentUser) return;
    const userId = currentUser.id.uuid;

    const { id } = req.params;

    // Load metadata
    const meta = loadAttachmentsMeta();
    const attachment = meta.attachments[id];

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Only uploader can delete
    if (attachment.uploadedBy !== userId) {
      return res.status(403).json({ error: 'You can only delete your own attachments' });
    }

    // Delete file
    const filePath = path.join(UPLOAD_DIR, attachment.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from metadata
    delete meta.attachments[id];
    saveAttachmentsMeta(meta);

    res.status(200).json({
      success: true,
      message: 'Attachment deleted',
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    handleError(res, error);
  }
}

/**
 * Get attachment info
 * GET /api/attachments/:id
 */
async function getAttachmentInfo(req, res) {
  try {
    // SECURITY: Require authentication
    const currentUser = await authenticateUser(req, res);
    if (!currentUser) return;

    const { id } = req.params;

    // Load metadata
    const meta = loadAttachmentsMeta();
    const attachment = meta.attachments[id];

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    res.status(200).json({
      success: true,
      attachment: {
        id: attachment.id,
        name: attachment.originalName,
        size: attachment.size,
        sizeFormatted: attachment.sizeFormatted,
        fileType: attachment.fileType,
        extension: attachment.extension,
        uploadedAt: attachment.uploadedAt,
        url: `/api/attachments/${attachment.id}/download`,
        previewUrl: attachment.fileType === 'image' ? `/api/attachments/${attachment.id}/preview` : null,
      },
    });
  } catch (error) {
    console.error('Get attachment info error:', error);
    handleError(res, error);
  }
}

module.exports = {
  uploadAttachment,
  downloadAttachment,
  previewAttachment,
  getAttachments,
  deleteAttachment,
  getAttachmentInfo,
};
