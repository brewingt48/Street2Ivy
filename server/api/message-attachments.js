const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSdk, handleError } = require('../api-util/sdk');

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
 * Upload attachment
 * POST /api/attachments/upload
 */
async function uploadAttachment(req, res) {
  try {
    // Verify user is authenticated
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
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
    const { id } = req.params;

    // Load metadata
    const meta = loadAttachmentsMeta();
    const attachment = meta.attachments[id];

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

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
    const { contextType, contextId } = req.query;

    if (!contextType || !contextId) {
      return res.status(400).json({ error: 'Missing contextType or contextId' });
    }

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
    // Verify user is authenticated
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
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
