/**
 * Vercel Serverless Function — Express App Wrapper
 *
 * This wraps the full Sharetribe Express server for use as a Vercel
 * serverless function. It handles the API routes (/api/*) and SSR
 * rendering for all page requests.
 *
 * Key adaptations for Vercel:
 * - Sets NODE_ENV if not already set
 * - Prevents process.exit() from killing the function
 * - Handles path resolution for the serverless environment
 */

// Ensure NODE_ENV is set (Vercel may not always set it)
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Prevent process.exit() from crashing the serverless function
// The server calls process.exit(9) on missing env vars — in serverless
// we want to log the error and return a 500 instead.
const originalExit = process.exit;
process.exit = function (code) {
  if (code === 9) {
    console.error('Serverless: process.exit(9) intercepted — missing env vars. Check Vercel environment variables.');
    // Don't actually exit — throw so the request gets a 500
    throw new Error('Missing required environment variables. Check Vercel dashboard.');
  }
  return originalExit.call(process, code);
};

let app;
try {
  app = require('../server/index');
} catch (e) {
  // If server fails to initialize, serve a helpful error page
  const express = require('express');
  app = express();
  app.use((req, res) => {
    console.error('Server initialization failed:', e.message);
    res.status(500).json({
      error: 'Server initialization failed',
      message: e.message,
      hint: 'Check that all required environment variables are set in Vercel dashboard: REACT_APP_SHARETRIBE_SDK_CLIENT_ID, SHARETRIBE_SDK_CLIENT_SECRET, REACT_APP_MARKETPLACE_NAME, REACT_APP_MARKETPLACE_ROOT_URL',
    });
  });
}

module.exports = app;
