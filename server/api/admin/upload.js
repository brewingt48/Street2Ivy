/**
 * File Upload API for Admin Dashboard
 *
 * Handles file uploads for branding assets (logo, favicon, hero images/videos)
 * Files are stored in the server's public/uploads directory
 *
 * Security features:
 * - Admin authentication required
 * - MIME type validation
 * - Magic byte (file signature) verification
 * - File size limits
 * - Path traversal prevention
 * - Filename sanitization
 */

const fs = require('fs');
const path = require('path');
const { getSdk } = require('../../api-util/sdk');

// Magic bytes (file signatures) for content validation
// This prevents attackers from renaming malicious files
const FILE_SIGNATURES = {
  // Images
  'image/png': [
    { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }, // PNG
  ],
  'image/jpeg': [
    { offset: 0, bytes: [0xff, 0xd8, 0xff] }, // JPEG/JPG
  ],
  'image/jpg': [
    { offset: 0, bytes: [0xff, 0xd8, 0xff] }, // JPG
  ],
  'image/gif': [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
  ],
  'image/svg+xml': [], // SVG is text-based, validated differently
  // Favicons
  'image/x-icon': [
    { offset: 0, bytes: [0x00, 0x00, 0x01, 0x00] }, // ICO
  ],
  'image/vnd.microsoft.icon': [
    { offset: 0, bytes: [0x00, 0x00, 0x01, 0x00] }, // ICO
  ],
  // Videos
  'video/mp4': [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp
  ],
  'video/webm': [
    { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }, // WebM
  ],
  'video/ogg': [
    { offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }, // OggS
  ],
};

/**
 * Verify file content matches its claimed MIME type using magic bytes
 * Returns true if valid, false if suspicious
 */
function verifyFileContent(buffer, mimeType) {
  const signatures = FILE_SIGNATURES[mimeType];

  // SVG files are XML-based, check for XML/SVG content
  if (mimeType === 'image/svg+xml') {
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 1000));
    // Check for SVG tag and ensure no script tags (XSS prevention)
    const hasSvg = /<svg[\s>]/i.test(content);
    const hasScript = /<script[\s>]/i.test(content);
    const hasOnEvent = /\son\w+\s*=/i.test(content);
    return hasSvg && !hasScript && !hasOnEvent;
  }

  // If no signatures defined for this type, skip magic byte check
  if (!signatures || signatures.length === 0) {
    return true;
  }

  // Check if any signature matches
  return signatures.some(sig => {
    if (buffer.length < sig.offset + sig.bytes.length) {
      return false;
    }
    return sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte);
  });
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
function sanitizeOriginalFilename(filename) {
  if (!filename) return 'upload';
  // Remove path components
  let sanitized = path.basename(filename);
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  // Replace dangerous characters, keep only alphanumeric, dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Prevent hidden files
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized.substring(1);
  }
  // Limit length
  return sanitized.substring(0, 100);
}

// Upload directory - in dev mode, use server/uploads; in production, use build/static/uploads
const isDev = process.env.NODE_ENV === 'development';
const UPLOAD_DIR = isDev
  ? path.join(__dirname, '../../uploads')
  : path.join(__dirname, '../../../build/static/uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Get the public URL for an uploaded file
 * In development, we need to include the full API server URL
 */
function getPublicUrl(filename) {
  const relativePath = `/static/uploads/${filename}`;
  if (isDev) {
    const port = process.env.REACT_APP_DEV_API_SERVER_PORT || 3500;
    return `http://localhost:${port}${relativePath}`;
  }
  return relativePath;
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const ALLOWED_FAVICON_TYPES = ['image/x-icon', 'image/vnd.microsoft.icon', 'image/png'];

// Max file sizes (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Verify the current user is a system admin
 */
async function verifySystemAdmin(req, res) {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse.data.data;
    const publicData = currentUser.attributes.profile.publicData || {};

    if (publicData.userType !== 'system-admin') {
      return null;
    }

    return currentUser;
  } catch (error) {
    console.error('Error verifying admin:', error);
    return null;
  }
}

/**
 * Generate a unique filename
 */
function generateFilename(originalName, prefix = 'upload') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName).toLowerCase();
  return `${prefix}-${timestamp}-${random}${ext}`;
}

/**
 * POST /api/admin/upload/logo
 * Upload a logo image
 */
async function uploadLogo(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed types: PNG, JPG, GIF, SVG, WebP',
      });
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Security: Verify file content matches MIME type (magic byte validation)
    if (!verifyFileContent(file.data, file.mimetype)) {
      console.error('File content verification failed for logo upload:', file.name, file.mimetype);
      return res.status(400).json({
        error: 'File content does not match file type. Please upload a valid image file.',
      });
    }

    // Generate unique filename with sanitized original name
    const safeName = sanitizeOriginalFilename(file.name);
    const filename = generateFilename(safeName, 'logo');
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    await file.mv(filepath);

    // Return the public URL
    const publicUrl = getPublicUrl(filename);

    res.status(200).json({
      success: true,
      url: publicUrl,
      filename: filename,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
}

/**
 * POST /api/admin/upload/favicon
 * Upload a favicon
 */
async function uploadFavicon(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;

    // Validate file type
    const allowedTypes = [...ALLOWED_FAVICON_TYPES, ...ALLOWED_IMAGE_TYPES];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed types: ICO, PNG',
      });
    }

    // Validate file size (favicon should be small)
    const maxFaviconSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxFaviconSize) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${maxFaviconSize / 1024 / 1024}MB`,
      });
    }

    // Security: Verify file content matches MIME type (magic byte validation)
    if (!verifyFileContent(file.data, file.mimetype)) {
      console.error('File content verification failed for favicon upload:', file.name, file.mimetype);
      return res.status(400).json({
        error: 'File content does not match file type. Please upload a valid favicon file.',
      });
    }

    // Generate unique filename with sanitized original name
    const safeName = sanitizeOriginalFilename(file.name);
    const filename = generateFilename(safeName, 'favicon');
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    await file.mv(filepath);

    // Return the public URL
    const publicUrl = getPublicUrl(filename);

    res.status(200).json({
      success: true,
      url: publicUrl,
      filename: filename,
      message: 'Favicon uploaded successfully',
    });
  } catch (error) {
    console.error('Favicon upload error:', error);
    res.status(500).json({ error: 'Failed to upload favicon' });
  }
}

/**
 * POST /api/admin/upload/hero-image
 * Upload a hero background image
 */
async function uploadHeroImage(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed types: PNG, JPG, GIF, SVG, WebP',
      });
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Security: Verify file content matches MIME type (magic byte validation)
    if (!verifyFileContent(file.data, file.mimetype)) {
      console.error('File content verification failed for hero image upload:', file.name, file.mimetype);
      return res.status(400).json({
        error: 'File content does not match file type. Please upload a valid image file.',
      });
    }

    // Generate unique filename with sanitized original name
    const safeName = sanitizeOriginalFilename(file.name);
    const filename = generateFilename(safeName, 'hero');
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    await file.mv(filepath);

    // Return the public URL
    const publicUrl = getPublicUrl(filename);

    res.status(200).json({
      success: true,
      url: publicUrl,
      filename: filename,
      message: 'Hero image uploaded successfully',
    });
  } catch (error) {
    console.error('Hero image upload error:', error);
    res.status(500).json({ error: 'Failed to upload hero image' });
  }
}

/**
 * POST /api/admin/upload/hero-video
 * Upload a hero background video
 */
async function uploadHeroVideo(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed types: MP4, WebM, OGG',
      });
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
      });
    }

    // Security: Verify file content matches MIME type (magic byte validation)
    if (!verifyFileContent(file.data, file.mimetype)) {
      console.error('File content verification failed for hero video upload:', file.name, file.mimetype);
      return res.status(400).json({
        error: 'File content does not match file type. Please upload a valid video file.',
      });
    }

    // Generate unique filename with sanitized original name
    const safeName = sanitizeOriginalFilename(file.name);
    const filename = generateFilename(safeName, 'hero-video');
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    await file.mv(filepath);

    // Return the public URL
    const publicUrl = getPublicUrl(filename);

    res.status(200).json({
      success: true,
      url: publicUrl,
      filename: filename,
      message: 'Hero video uploaded successfully',
    });
  } catch (error) {
    console.error('Hero video upload error:', error);
    res.status(500).json({ error: 'Failed to upload hero video' });
  }
}

/**
 * DELETE /api/admin/upload/:filename
 * Delete an uploaded file
 */
async function deleteFile(req, res) {
  try {
    const admin = await verifySystemAdmin(req, res);
    if (!admin) {
      return res.status(403).json({ error: 'Access denied. System administrator privileges required.' });
    }

    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Security: Prevent directory traversal
    const safeName = path.basename(filename);
    const filepath = path.join(UPLOAD_DIR, safeName);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filepath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
}

module.exports = {
  uploadLogo,
  uploadFavicon,
  uploadHeroImage,
  uploadHeroVideo,
  deleteFile,
};
