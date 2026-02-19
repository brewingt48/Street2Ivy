const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../api-util/db');
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

  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { allowed: false, reason: `File type ${ext} is not allowed for security reasons` };
  }

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
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const userId = currentUser.id.uuid;

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const { contextType, contextId } = req.body;

    if (!contextType || !contextId) {
      return res.status(400).json({ error: 'Missing contextType or contextId' });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`
      });
    }

    const typeCheck = isFileTypeAllowed(file.name);
    if (!typeCheck.allowed) {
      return res.status(400).json({ error: typeCheck.reason });
    }

    const attachmentId = generateAttachmentId();
    const ext = getFileExtension(file.name);
    const safeFilename = `${attachmentId}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    // Save the actual file to disk
    await file.mv(filePath);

    // Create attachment metadata in SQLite
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
      contextType,
      contextId,
      downloadCount: 0,
    };

    db.attachments.create(attachment);

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
    const sdk = getSdk(req, res);
    await sdk.currentUser.show();

    const { id } = req.params;

    const attachment = db.attachments.getById(id);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Update download count
    db.attachments.incrementDownloadCount(id);

    // SECURITY: Sanitize filename to prevent Content-Disposition header injection
    const safeName = attachment.originalName
      .replace(/["\\\n\r]/g, '_')
      .replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', attachment.size);

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
    const sdk = getSdk(req, res);
    await sdk.currentUser.show();

    const { id } = req.params;

    const attachment = db.attachments.getById(id);

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

    // SECURITY: Sanitize filename for inline display
    const safeName = attachment.originalName
      .replace(/["\\\n\r]/g, '_')
      .replace(/[^\x20-\x7E]/g, '_');
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

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
    const sdk = getSdk(req, res);
    await sdk.currentUser.show();

    const { contextType, contextId } = req.query;

    if (!contextType || !contextId) {
      return res.status(400).json({ error: 'Missing contextType or contextId' });
    }

    const attachmentsList = db.attachments.getByContext(contextType, contextId);

    const attachments = attachmentsList.map(a => ({
      id: a.id,
      name: a.originalName,
      size: a.size,
      sizeFormatted: a.sizeFormatted,
      fileType: a.fileType,
      extension: a.extension,
      uploadedAt: a.uploadedAt,
      url: `/api/attachments/${a.id}/download`,
      previewUrl: a.fileType === 'image' ? `/api/attachments/${a.id}/preview` : null,
    }));

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
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const userId = currentUser.id.uuid;

    const { id } = req.params;

    const attachment = db.attachments.getById(id);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Only uploader can delete
    if (attachment.uploadedBy !== userId) {
      return res.status(403).json({ error: 'You can only delete your own attachments' });
    }

    // Delete the actual file from disk
    const filePath = path.join(UPLOAD_DIR, attachment.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove metadata from SQLite
    db.attachments.delete(id);

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
    const sdk = getSdk(req, res);
    await sdk.currentUser.show();

    const { id } = req.params;

    const attachment = db.attachments.getById(id);

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
