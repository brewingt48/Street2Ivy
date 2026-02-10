/**
 * Post-build script for Vercel static deployment.
 *
 * The Sharetribe build generates an index.html template with SSR placeholders
 * (<!--!body-->, <!--!ssrScripts-->, etc.). This script creates a proper
 * client-side-only index.html by injecting the JS/CSS entrypoints so the
 * React app can boot without server-side rendering.
 */
const fs = require('fs');
const path = require('path');

const buildPath = path.resolve(__dirname, '..', 'build');
const manifestPath = path.join(buildPath, 'asset-manifest.json');
const indexPath = path.join(buildPath, 'index.html');

// Read asset manifest to get entrypoints
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const entrypoints = manifest.entrypoints || [];

const cssFiles = entrypoints.filter(f => f.endsWith('.css'));
const jsFiles = entrypoints.filter(f => f.endsWith('.js'));

// Read the template
let html = fs.readFileSync(indexPath, 'utf-8');

// Replace HTML attributes placeholder
html = html.replace('data-htmlattr="htmlAttributes"', 'lang="en"');

// Replace title placeholder
html = html.replace('<!--!title-->', '<title>Street2Ivy | Where Talent Meets Opportunity</title>');

// Replace meta placeholder
html = html.replace('<!--!meta-->', [
  '<meta name="description" content="Street2Ivy connects students with companies for real-world project experience.">',
].join('\n'));

// Replace link placeholder with CSS links
html = html.replace('<!--!link-->', cssFiles.map(f =>
  `<link rel="stylesheet" href="/${f}">`
).join('\n'));

// Remove SSR style/link placeholders
html = html.replace('<!--!ssrStyles-->', '');
html = html.replace('<!--!ssrLinks-->', '');

// Replace body placeholder (empty div - React will hydrate)
html = html.replace('<!--!body-->', '');

// Replace script placeholders with JS bundles
html = html.replace('<!--!script-->', '');
html = html.replace('<!--!preloadedStateScript-->', '');
html = html.replace('<!--!ssrScripts-->', jsFiles.map(f =>
  `<script src="/${f}" defer></script>`
).join('\n'));

// Write the processed index.html
fs.writeFileSync(indexPath, html, 'utf-8');

console.log('✅ Generated static index.html for Vercel deployment');
console.log(`   CSS: ${cssFiles.join(', ')}`);
console.log(`   JS: ${jsFiles.join(', ')}`);
