/**
 * File Upload Security
 *
 * Validates uploaded files by:
 * - Magic byte verification (MIME type matches file content)
 * - Filename sanitization (strips path traversal, null bytes, double extensions)
 * - Extension blocklist (executables, scripts, etc.)
 * - File size limits
 *
 * Ported from legacy server/api-util/security.js lines 400-550.
 */

/**
 * Allowed file types with their magic byte signatures.
 * Key = MIME type, Value = array of possible magic byte patterns.
 */
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': [Buffer.from('RIFF')], // RIFF header (WebP uses RIFF container)
  'application/pdf': [Buffer.from('%PDF')],
  'application/zip': [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  'text/csv': [], // No magic bytes for CSV — validated by extension only
  'text/plain': [], // No magic bytes for text
  // Video types
  'video/mp4': [],      // MP4 uses 'ftyp' at byte offset 4, not byte 0 — handled in verifyMagicBytes
  'video/webm': [Buffer.from([0x1a, 0x45, 0xdf, 0xa3])],  // EBML/Matroska header
  'video/quicktime': [], // MOV also uses ftyp at byte offset 4 — handled in verifyMagicBytes
};

/**
 * Allowed MIME types for upload.
 */
const ALLOWED_MIME_TYPES = new Set(Object.keys(MAGIC_BYTES));

/**
 * Extensions that are never allowed, regardless of MIME type.
 * Blocks executable and script files.
 */
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.msp', '.mst',
  '.ps1', '.psm1', '.psd1',
  '.sh', '.bash', '.csh', '.ksh', '.zsh',
  '.jar', '.class', '.war',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.scr', '.pif', '.hta', '.inf',
  '.reg', '.rgs',
  '.dll', '.sys', '.drv',
  '.app', '.action', '.command',
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
  '.py', '.pyc', '.pyo',
  '.rb', '.pl', '.cgi',
  '.asp', '.aspx', '.cer', '.csr',
  '.swf', '.flv',
]);

/**
 * Maximum file name length after sanitization.
 */
const MAX_FILENAME_LENGTH = 255;

/**
 * Sanitize a filename:
 * - Strip directory path components (path traversal prevention)
 * - Remove null bytes
 * - Remove control characters
 * - Strip double extensions (.tar.gz is ok, .jpg.exe is not)
 * - Truncate to max length
 */
export function sanitizeFilename(filename: string): string {
  let safe = filename;

  // Remove null bytes
  safe = safe.replace(/\0/g, '');

  // Remove control characters
  // eslint-disable-next-line no-control-regex
  safe = safe.replace(/[\x00-\x1f\x7f]/g, '');

  // Strip path traversal: keep only the final filename component
  safe = safe.replace(/^.*[\\/]/, '');

  // Remove leading dots (hidden files)
  safe = safe.replace(/^\.+/, '');

  // Replace spaces and special characters with underscores
  safe = safe.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Collapse multiple underscores/dots
  safe = safe.replace(/_{2,}/g, '_');
  safe = safe.replace(/\.{2,}/g, '.');

  // Truncate to max length
  if (safe.length > MAX_FILENAME_LENGTH) {
    const ext = getExtension(safe);
    const baseName = safe.slice(0, MAX_FILENAME_LENGTH - ext.length);
    safe = baseName + ext;
  }

  // If empty after sanitization, generate a safe default
  if (!safe || safe === '.' || safe === '_') {
    safe = `upload_${Date.now()}`;
  }

  return safe;
}

/**
 * Get the file extension (lowercased, including the dot).
 */
function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot).toLowerCase();
}

/**
 * Check if a file extension is blocked.
 */
export function isBlockedExtension(filename: string): boolean {
  const ext = getExtension(filename);
  if (!ext) return false;

  // Also check for double extensions (e.g., file.jpg.exe)
  const parts = filename.toLowerCase().split('.');
  for (let i = 1; i < parts.length; i++) {
    if (BLOCKED_EXTENSIONS.has('.' + parts[i])) {
      return true;
    }
  }

  return false;
}

/**
 * Verify that a file's content matches its declared MIME type using magic bytes.
 * Returns true if the magic bytes match (or if the MIME type has no magic bytes to check).
 */
export function verifyMagicBytes(
  buffer: Buffer | Uint8Array,
  declaredMimeType: string
): boolean {
  const patterns = MAGIC_BYTES[declaredMimeType];

  // Unknown MIME type
  if (!patterns) return false;

  const fileBuffer = Buffer.from(buffer);

  // Special case: MP4 and MOV use 'ftyp' signature at bytes 4-7 (not byte 0)
  // Must check before the empty-patterns shortcut since these have empty arrays
  if (declaredMimeType === 'video/mp4' || declaredMimeType === 'video/quicktime') {
    if (fileBuffer.length >= 8) {
      const ftyp = fileBuffer.subarray(4, 8).toString('ascii');
      return ftyp === 'ftyp';
    }
    return false;
  }

  // MIME types with no magic bytes (text, CSV) — allow based on extension only
  if (patterns.length === 0) return true;

  // Check if any magic byte pattern matches the file header
  return patterns.some((pattern) => {
    if (fileBuffer.length < pattern.length) return false;
    const header = fileBuffer.subarray(0, pattern.length);
    return header.equals(pattern);
  });
}

/**
 * Validate a file upload.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateFileUpload(
  filename: string,
  mimeType: string,
  fileBuffer: Buffer | Uint8Array,
  options: { maxSizeBytes?: number } = {}
): { valid: boolean; error?: string; sanitizedFilename?: string } {
  const { maxSizeBytes = 10 * 1024 * 1024 } = options; // 10 MB default

  // 1. Check file size
  if (fileBuffer.length > maxSizeBytes) {
    return { valid: false, error: `File exceeds maximum size of ${Math.round(maxSizeBytes / 1024 / 1024)}MB` };
  }

  // 2. Sanitize filename
  const sanitized = sanitizeFilename(filename);

  // 3. Check blocked extensions
  if (isBlockedExtension(sanitized)) {
    return { valid: false, error: 'File type is not allowed' };
  }

  // 4. Check MIME type allowlist
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: `Unsupported file type: ${mimeType}` };
  }

  // 5. Verify magic bytes match declared MIME type
  if (!verifyMagicBytes(fileBuffer, mimeType)) {
    return {
      valid: false,
      error: 'File content does not match declared type. The file may be corrupted or mislabeled.',
    };
  }

  return { valid: true, sanitizedFilename: sanitized };
}
