import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  try {
    console.log('Setting up database tables from schema.sql...');
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(sql);
    console.log('Database schema successfully applied!');
  } catch (err) {
    console.error('Error applying database schema:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
