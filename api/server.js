// Vercel serverless function wrapper
// Imports the Express app from server/index.js and exports it for Vercel
const app = require('../server/index');
module.exports = app;
