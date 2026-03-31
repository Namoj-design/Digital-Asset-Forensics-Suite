import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Connect using the standard DATABASE_URL if provided, else default to localhost dafs_mvp
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/dafs_mvp',
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
