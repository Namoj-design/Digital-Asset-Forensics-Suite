import pool from './db.js';

async function createMonitoringTables() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS monitored_wallets (
                monitor_id TEXT PRIMARY KEY,
                address TEXT NOT NULL,
                chain TEXT,
                created_by TEXT DEFAULT 'system',
                created_at TIMESTAMP DEFAULT NOW(),
                last_tx_hash TEXT,
                last_checked_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS alerts (
                alert_id SERIAL PRIMARY KEY,
                monitor_id TEXT REFERENCES monitored_wallets(monitor_id) ON DELETE CASCADE,
                address TEXT NOT NULL,
                chain TEXT,
                tx_hash TEXT,
                amount TEXT,
                from_addr TEXT,
                to_addr TEXT,
                message TEXT,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("✅ Monitoring tables created successfully.");
    } catch (err) {
        console.error("❌ Error creating monitoring tables:", err.message);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

createMonitoringTables();
