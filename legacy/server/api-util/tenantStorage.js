/**
 * Tenant-Scoped File Storage Utility
 *
 * Provides file path resolution and JSON read/write helpers
 * that scope data files per tenant.
 *
 * Directory structure:
 *   server/data/                          # default tenant
 *   server/data/tenants/harvard/          # harvard tenant
 *   server/data/tenants/stanford/         # stanford tenant
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

/**
 * Get the file path for a data file, scoped to a tenant.
 * Default tenant files live directly in server/data/.
 * Other tenants get a subdirectory under server/data/tenants/<tenantId>/.
 */
function getDataFilePath(tenantId, filename) {
  if (!tenantId || tenantId === 'default') {
    return path.join(DATA_DIR, filename);
  }
  return path.join(DATA_DIR, 'tenants', tenantId, filename);
}

/**
 * Load and parse a JSON file for a given tenant.
 * Returns defaultValue if the file does not exist or cannot be parsed.
 */
function loadJsonFile(tenantId, filename, defaultValue = []) {
  const filePath = getDataFilePath(tenantId, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
  }
  return defaultValue;
}

/**
 * Save data as JSON to a tenant-scoped file.
 * Creates directories as needed.
 */
function saveJsonFile(tenantId, filename, data) {
  const filePath = getDataFilePath(tenantId, filename);
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
    return false;
  }
}

module.exports = { getDataFilePath, loadJsonFile, saveJsonFile };
