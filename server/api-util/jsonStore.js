/**
 * JSON Store Utility
 *
 * Provides atomic JSON file operations with:
 * - FileMutex: In-memory async mutex per file path (prevents concurrent write corruption)
 * - atomicWriteJSON: Write to .tmp -> backup .bak -> atomic rename
 * - readJSON: Read with fallback to .bak on parse error
 * - validateJSONFile: Startup validation, logs warnings
 *
 * Stage 5 Production Hardening — no new features, just safe data persistence.
 */

const fs = require('fs');
const path = require('path');

// ================ FILE MUTEX ================ //

/**
 * In-memory async mutex per file path.
 * Prevents concurrent writes to the same file from corrupting data.
 *
 * Usage:
 *   const release = await fileMutex.acquire('/path/to/file.json');
 *   try {
 *     // ... do atomic write ...
 *   } finally {
 *     release();
 *   }
 */
class FileMutex {
  constructor() {
    this._locks = new Map();
  }

  /**
   * Acquire a lock for the given file path.
   * If the file is already locked, waits until the previous lock is released.
   *
   * @param {string} filepath - Absolute path to the file
   * @returns {Promise<Function>} A release function to call when done
   */
  acquire(filepath) {
    const key = path.resolve(filepath);

    if (!this._locks.has(key)) {
      this._locks.set(key, Promise.resolve());
    }

    let release;
    const newLock = new Promise(resolve => {
      release = resolve;
    });

    // Chain this lock after the current one
    const currentLock = this._locks.get(key);
    this._locks.set(key, currentLock.then(() => newLock));

    // Wait for the current lock to resolve, then return our release function
    return currentLock.then(() => release);
  }
}

// Singleton mutex instance shared across the server
const fileMutex = new FileMutex();

// ================ ATOMIC WRITE ================ //

/**
 * Write JSON data to a file atomically.
 *
 * Strategy:
 * 1. Write data to a .tmp file
 * 2. If the original file exists, copy it to .bak (backup)
 * 3. Rename .tmp to the target file (atomic on most filesystems)
 *
 * This prevents data loss from:
 * - Process crashes mid-write
 * - Concurrent writes (when used with FileMutex)
 * - Disk full errors (fails on .tmp, original is untouched)
 *
 * @param {string} filepath - Absolute path to the JSON file
 * @param {*} data - Data to serialize as JSON
 * @returns {Promise<boolean>} Whether the write was successful
 */
async function atomicWriteJSON(filepath, data) {
  const release = await fileMutex.acquire(filepath);

  try {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tmpFile = filepath + '.tmp';
    const bakFile = filepath + '.bak';
    const jsonStr = JSON.stringify(data, null, 2);

    // Step 1: Write to .tmp
    fs.writeFileSync(tmpFile, jsonStr, 'utf8');

    // Step 2: Backup existing file to .bak
    if (fs.existsSync(filepath)) {
      try {
        fs.copyFileSync(filepath, bakFile);
      } catch (bakErr) {
        // Non-fatal: backup failed, but we can still proceed
        console.warn(`[jsonStore] Warning: Could not create backup for ${filepath}:`, bakErr.message);
      }
    }

    // Step 3: Atomic rename .tmp -> target
    fs.renameSync(tmpFile, filepath);

    return true;
  } catch (error) {
    console.error(`[jsonStore] Error writing ${filepath}:`, error);

    // Clean up .tmp if it exists
    const tmpFile = filepath + '.tmp';
    try {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch {
      // Ignore cleanup errors
    }

    return false;
  } finally {
    release();
  }
}

// ================ READ JSON ================ //

/**
 * Read and parse a JSON file with automatic fallback to .bak on parse error.
 *
 * Recovery strategy:
 * 1. Try to read the primary file
 * 2. If parse fails, try the .bak file
 * 3. If both fail, return the defaultValue
 *
 * @param {string} filepath - Absolute path to the JSON file
 * @param {*} defaultValue - Value to return if file doesn't exist or can't be parsed (default: [])
 * @returns {*} Parsed JSON data, or defaultValue on failure
 */
function readJSON(filepath, defaultValue = []) {
  // Try primary file
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    }
  } catch (primaryErr) {
    console.error(`[jsonStore] Error reading ${filepath}:`, primaryErr.message);

    // Try backup file
    const bakFile = filepath + '.bak';
    try {
      if (fs.existsSync(bakFile)) {
        console.warn(`[jsonStore] Falling back to backup: ${bakFile}`);
        const bakData = fs.readFileSync(bakFile, 'utf8');
        const parsed = JSON.parse(bakData);

        // Restore the backup as the primary file
        try {
          fs.copyFileSync(bakFile, filepath);
          console.log(`[jsonStore] Restored ${filepath} from backup`);
        } catch {
          // Non-fatal: couldn't restore, but we have the data
        }

        return parsed;
      }
    } catch (bakErr) {
      console.error(`[jsonStore] Backup also failed for ${filepath}:`, bakErr.message);
    }
  }

  return defaultValue;
}

// ================ VALIDATION ================ //

/**
 * Validate a JSON file at startup. Logs warnings but doesn't crash.
 *
 * Checks:
 * - File exists
 * - File is valid JSON
 * - Parsed data matches expected type ('array' or 'object')
 *
 * @param {string} filepath - Absolute path to the JSON file
 * @param {'array'|'object'} expectedType - Expected top-level JSON type
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
function validateJSONFile(filepath, expectedType = 'array') {
  const filename = path.basename(filepath);

  try {
    if (!fs.existsSync(filepath)) {
      console.warn(`[jsonStore] Validation: ${filename} does not exist (will be created on first write)`);
      return { valid: true }; // Missing file is OK — will be created
    }

    const data = fs.readFileSync(filepath, 'utf8');

    if (!data.trim()) {
      console.warn(`[jsonStore] Validation: ${filename} is empty`);
      return { valid: false, error: 'File is empty' };
    }

    const parsed = JSON.parse(data);

    if (expectedType === 'array' && !Array.isArray(parsed)) {
      console.warn(`[jsonStore] Validation: ${filename} expected array, got ${typeof parsed}`);
      return { valid: false, error: `Expected array, got ${typeof parsed}` };
    }

    if (expectedType === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null)) {
      console.warn(`[jsonStore] Validation: ${filename} expected object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`);
      return { valid: false, error: `Expected object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}` };
    }

    return { valid: true };
  } catch (error) {
    console.warn(`[jsonStore] Validation: ${filename} is not valid JSON: ${error.message}`);

    // Try backup
    const bakFile = filepath + '.bak';
    if (fs.existsSync(bakFile)) {
      try {
        const bakData = fs.readFileSync(bakFile, 'utf8');
        JSON.parse(bakData);
        console.warn(`[jsonStore] Backup exists for ${filename} and is valid — will be used as fallback`);
      } catch {
        console.warn(`[jsonStore] Backup for ${filename} is also invalid`);
      }
    }

    return { valid: false, error: `Invalid JSON: ${error.message}` };
  }
}

module.exports = {
  FileMutex,
  fileMutex,
  atomicWriteJSON,
  readJSON,
  validateJSONFile,
};
