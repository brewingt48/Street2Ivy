#!/usr/bin/env node
/**
 * Street2Ivy — Database Migration Runner
 * Executes SQL files against Heroku Postgres
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;
const sqlFile = process.argv[2];

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

if (!sqlFile) {
  console.error('Usage: DATABASE_URL=... node run-migration.js <file.sql>');
  process.exit(1);
}

const filePath = path.resolve(sqlFile);
if (!fs.existsSync(filePath)) {
  console.error(`ERROR: File not found: ${filePath}`);
  process.exit(1);
}

async function run() {
  const sql = fs.readFileSync(filePath, 'utf8');

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log(`Connecting to database...`);
    await client.connect();
    console.log(`Connected. Running: ${path.basename(filePath)}`);
    console.log(`SQL file size: ${(sql.length / 1024).toFixed(1)} KB`);
    console.log('---');

    await client.query(sql);

    console.log('---');
    console.log(`✅ Migration completed successfully: ${path.basename(filePath)}`);
  } catch (err) {
    console.error('---');
    console.error(`❌ Migration FAILED: ${path.basename(filePath)}`);
    console.error(`Error: ${err.message}`);
    if (err.position) {
      const lines = sql.substring(0, parseInt(err.position)).split('\n');
      console.error(`Near line ${lines.length}: ${lines[lines.length - 1].trim()}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
