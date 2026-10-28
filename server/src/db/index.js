import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:omkarb2004@localhost:5432/support_helpdesk',
});

// Helper for running single queries
export const query = (text, params) => pool.query(text, params);

// Helper for acquiring a client for multi-statement transactions
export const getClient = () => pool.connect();
