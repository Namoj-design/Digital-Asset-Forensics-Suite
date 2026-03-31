import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function createDatabase() {
    // Try connecting to the default 'postgres' database or the username default DB
    const client = new Client({
        connectionString: process.env.DEFAULT_DATABASE_URL || 'postgres://localhost:5432/postgres'
    });

    try {
        await client.connect();
        await client.query('CREATE DATABASE dafs_mvp');
        console.log('Database dafs_mvp created successfully!');
    } catch (err) {
        if (err.code === '42P04') {
            console.log('Database dafs_mvp already exists.');
        } else {
            // Fallback: try connecting without specifying a database name (uses username)
            try {
                const fallbackClient = new Client({ connectionString: 'postgres://localhost:5432' });
                await fallbackClient.connect();
                await fallbackClient.query('CREATE DATABASE dafs_mvp');
                console.log('Database dafs_mvp created successfully via fallback!');
                await fallbackClient.end();
            } catch (fallbackErr) {
                if (fallbackErr.code === '42P04') {
                    console.log('Database dafs_mvp already exists.');
                } else {
                    console.error('Failed to create database:', err.message, fallbackErr.message);
                }
            }
        }
    } finally {
        await client.end().catch(() => { });
    }
}

createDatabase();
