import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';

async function createAlertRecipientsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS alert_recipients (
                id UUID PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                telegram_chat_id TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Alert recipients table created successfully.");
    } catch (err) {
        console.error("❌ Error creating alert_recipients table:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createAlertRecipientsTable();
