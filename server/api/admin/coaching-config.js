/**
 * AI Coaching Platform Configuration API
 *
 * Manages global AI coaching platform settings that apply across all institutions.
 * Allows system admins to configure the external AI coaching platform connection.
 */

const fs = require('fs');
const path = require('path');
const { getSdk } = require('../../api-util/sdk');
const { verifySystemAdmin, auditLog, getClientIP } = require('../../api-util/security');

// Configuration file path
const CONFIG_FILE = path.join(__dirname, '../../data/coaching-config.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default configuration
const defaultConfig = {
  platformUrl: '',
  platformName: 'AI Career Coach',
  platformStatus: false, // Disabled by default
  welcomeMessage: 'Welcome to your AI Career Coach! Get personalized guidance on resumes, interviews, career paths, and professional development.',
  termsOfUseUrl: '',
  confidentialityWarning: 'Do not share proprietary, confidential, or trade secret information from any project or company engagement in AI coaching sessions. Violations may result in removal from the platform.',
  updatedAt: null,
  updatedBy: null,
};

/**
 * Load configuration from file
 */
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const saved = JSON.parse(data);
      return { ...defaultConfig, ...saved };
    }
  } catch (error) {
    console.error('Error loading coaching config:', error);
  }
  return { ...defaultConfig };
}

/**
 * Save configuration to file
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving coaching config:', error);
    return false;
  }
}

/**
 * GET /api/admin/coaching-config
 * Get the current AI coaching platform configuration
 */
async function getConfig(req, res) {
  try {
    const currentUser = await verifySystemAdmin(req, res);
    if (!currentUser) {
      auditLog('UNAUTHORIZED_COACHING_CONFIG_ACCESS', {
        ip: getClientIP(req),
        path: req.path,
        method: 'GET',
      });
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
        code: 'FORBIDDEN',
      });
    }

    const config = loadConfig();
    res.status(200).json({ data: config });
  } catch (error) {
    console.error('Error getting coaching config:', error);
    res.status(500).json({ error: 'Failed to load coaching configuration' });
  }
}

/**
 * PUT /api/admin/coaching-config
 * Update the AI coaching platform configuration
 */
async function updateConfig(req, res) {
  try {
    const currentUser = await verifySystemAdmin(req, res);
    if (!currentUser) {
      auditLog('UNAUTHORIZED_COACHING_CONFIG_MODIFICATION', {
        ip: getClientIP(req),
        path: req.path,
        method: 'PUT',
      });
      return res.status(403).json({
        error: 'Access denied. System administrator privileges required.',
        code: 'FORBIDDEN',
      });
    }

    const {
      platformUrl,
      platformName,
      platformStatus,
      welcomeMessage,
      termsOfUseUrl,
      confidentialityWarning,
    } = req.body;

    const config = loadConfig();
    const userId = currentUser.id?.uuid || 'system';

    // Update only provided fields
    if (platformUrl !== undefined) config.platformUrl = platformUrl;
    if (platformName !== undefined) config.platformName = platformName;
    if (platformStatus !== undefined) config.platformStatus = !!platformStatus;
    if (welcomeMessage !== undefined) config.welcomeMessage = welcomeMessage;
    if (termsOfUseUrl !== undefined) config.termsOfUseUrl = termsOfUseUrl;
    if (confidentialityWarning !== undefined) config.confidentialityWarning = confidentialityWarning;

    config.updatedAt = new Date().toISOString();
    config.updatedBy = userId;

    if (!saveConfig(config)) {
      return res.status(500).json({ error: 'Failed to save coaching configuration' });
    }

    auditLog('COACHING_CONFIG_UPDATED', {
      userId,
      changes: Object.keys(req.body),
      ip: getClientIP(req),
    });

    res.status(200).json({
      data: config,
      message: 'AI coaching configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating coaching config:', error);
    res.status(500).json({ error: 'Failed to update coaching configuration' });
  }
}

/**
 * GET /api/coaching-config/public
 * Get public coaching configuration (for students and landing page)
 * Returns public-facing configuration data including the platform URL
 */
async function getPublicConfig(req, res) {
  try {
    const config = loadConfig();

    // Return public-facing configuration including platform URL for "Get Started" buttons
    res.status(200).json({
      data: {
        platformName: config.platformName,
        platformStatus: config.platformStatus,
        platformUrl: config.platformUrl, // Include URL for landing page and dashboard links
        welcomeMessage: config.welcomeMessage,
        termsOfUseUrl: config.termsOfUseUrl,
        confidentialityWarning: config.confidentialityWarning,
      },
    });
  } catch (error) {
    console.error('Error getting public coaching config:', error);
    res.status(500).json({ error: 'Failed to load coaching configuration' });
  }
}

module.exports = {
  getConfig,
  updateConfig,
  getPublicConfig,
  loadConfig, // Export for use by other modules
};
