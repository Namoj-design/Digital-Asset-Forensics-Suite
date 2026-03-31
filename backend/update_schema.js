import pool from './db.js';

async function updateSchema() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add columns to cases table explicitly
        await client.query(`
      ALTER TABLE cases 
      ADD COLUMN IF NOT EXISTS chain VARCHAR(50),
      ADD COLUMN IF NOT EXISTS target_wallet VARCHAR(255),
      ADD COLUMN IF NOT EXISTS graph_data JSONB;
    `);

        await client.query('COMMIT');
        console.log('Database schema updated successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating schema:', err);
    } finally {
        client.release();
        pool.end();
    }
}

updateSchema();
