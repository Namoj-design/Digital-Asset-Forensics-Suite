import pool from './db.js';

async function initializeDB() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Create cases table
        await client.query(`
      CREATE TABLE IF NOT EXISTS cases (
        case_id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50),
        priority VARCHAR(20),
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Create evidence_files table
        await client.query(`
      CREATE TABLE IF NOT EXISTS evidence_files (
        evidence_id SERIAL PRIMARY KEY,
        case_id VARCHAR(50) REFERENCES cases(case_id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        file_path VARCHAR(500) NOT NULL,
        sha256_hash VARCHAR(64) NOT NULL,
        uploaded_by VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        await client.query('COMMIT');
        console.log('Database tables initialized successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing database:', err);
    } finally {
        client.release();
        pool.end();
    }
}

initializeDB();
