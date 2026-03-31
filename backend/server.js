import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';
import './mongo.js';
import { Canvas } from './models/Canvas.js';
import PDFDocument from 'pdfkit';
import { initializeInvestigation } from './investigationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/evidence');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

// Mount old API routes
import oldApiRoutes from './api.js';
app.use('/api', oldApiRoutes);

// Mount Canvas API routes
import canvasRoutes from './routes/canvas.js';
import syncRoutes from './routes/sync.js';
app.use('/api/canvas', canvasRoutes);
app.use('/api/sync', syncRoutes);
app.post('/api/cases', async (req, res) => {
    const { title, description, type, priority, created_by, chain, target_wallet, suspectedWallet, maxDepth, riskThreshold } = req.body;

    // Minimal validation
    if (!title) {
        return res.status(400).json({ error: "Title is required" });
    }
    if (!chain) {
        return res.status(400).json({ error: "Chain is required" });
    }

    const case_id = `CASE-${Date.now().toString().slice(-6)}`;

    try {
        // We no longer auto-initialize the graph here. The investigator must manually create the canvas later.
        const graphData = JSON.stringify(null);

        const result = await pool.query(
            'INSERT INTO cases (case_id, title, description, type, priority, created_by, chain, target_wallet, graph_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [case_id, title, description, type, priority, created_by || 'Unknown', chain, target_wallet, graphData]
        );
        
        // Ensure linking canvas logic simulates identical ID mapping for Postgres API bypass
        await pool.query(
            'UPDATE cases SET linked_canvas_ids = $1::jsonb WHERE case_id=$2',
            [JSON.stringify([case_id]), case_id]
        );

        res.status(201).json({ success: true, data: { ...result.rows[0], canvas_id: case_id }, investigationDetails: null });
    } catch (error) {
        console.error("Error creating case:", error);
        res.status(500).json({ success: false, error: error.message || "Database error" });
    }
});

// Initialize Investigation Canvas
app.post('/api/cases/:case_id/initialize', async (req, res) => {
    const { case_id } = req.params;
    try {
        const caseResult = await pool.query('SELECT * FROM cases WHERE case_id=$1', [case_id]);
        if (caseResult.rows.length === 0) return res.status(404).json({ error: "Case not found" });
        
        const currentCase = caseResult.rows[0];
        
        // Run investigation engine to build the initial graph
        const investigationResult = await initializeInvestigation(case_id, {
            targetWallet: currentCase.target_wallet,
            chain: currentCase.chain
        });

        const graphDataJSON = JSON.stringify(investigationResult);
        
        const result = await pool.query(
            'UPDATE cases SET graph_data=$1 WHERE case_id=$2 RETURNING *',
            [graphDataJSON, case_id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Init canvas error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get all cases
app.get('/api/cases', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM cases ORDER BY created_at DESC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching cases:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// Get single case
app.get('/api/cases/:case_id', async (req, res) => {
    const { case_id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM cases WHERE case_id = $1', [case_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Case not found" });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error fetching case:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// Update single case
app.put('/api/cases/:case_id', async (req, res) => {
    const { case_id } = req.params;
    const { title, description, case_type, priority, riskThreshold } = req.body;
    try {
        const currentCaseRes = await pool.query('SELECT chain, target_wallet, graph_data FROM cases WHERE case_id=$1', [case_id]);
        if (currentCaseRes.rows.length === 0) return res.status(404).json({ error: "Case not found" });

        const currentCase = currentCaseRes.rows[0];
        let graphDataJSON = currentCase.graph_data;

        // Re-run the investigation engine to update the intelligence layout based on new limits
        if (riskThreshold) {
            const updatedGraph = await initializeInvestigation(case_id, {
                targetWallet: currentCase.target_wallet,
                riskThreshold: riskThreshold,
                chain: currentCase.chain
            });
            graphDataJSON = JSON.stringify(updatedGraph);
        }

        const result = await pool.query(
            'UPDATE cases SET title=$1, description=$2, type=$3, priority=$4, graph_data=$5 WHERE case_id=$6 RETURNING *',
            [title, description, case_type, priority, graphDataJSON, case_id]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error("Update case error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete single case
app.delete('/api/cases/:case_id', async (req, res) => {
    const { case_id } = req.params;
    try {
        // Delete all related evidence files
        await pool.query('DELETE FROM evidence_files WHERE case_id=$1', [case_id]);

        // Delete the case
        const result = await pool.query('DELETE FROM cases WHERE case_id=$1 RETURNING *', [case_id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Case not found" });

        res.json({ success: true });
    } catch (err) {
        console.error("Delete case error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Export case
app.get('/api/cases/:case_id/export', async (req, res) => {
    // Reuse the exact same logic from Reports export
    res.redirect(`/api/reports/case/${req.params.case_id}/pdf`);
});

// ==========================================
// 2. EVIDENCE VAULT API
// ==========================================

// Upload evidence
app.post('/api/cases/:case_id/evidence/upload', upload.single('file'), async (req, res) => {
    const { case_id } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        // Verify case exists
        const caseCheck = await pool.query('SELECT case_id FROM cases WHERE case_id = $1', [case_id]);
        if (caseCheck.rows.length === 0) {
            fs.unlinkSync(file.path); // remove file
            return res.status(404).json({ error: "Case not found" });
        }

        // Generate SHA-256 hash
        const fileBuffer = fs.readFileSync(file.path);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        const sha256_hash = hashSum.digest('hex');

        // relative path for serving over HTTP
        const relativePath = `/evidence/${file.filename}`;

        const result = await pool.query(
            'INSERT INTO evidence_files (case_id, file_name, file_type, file_path, sha256_hash, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [case_id, file.originalname, file.mimetype, relativePath, sha256_hash, 'System User']
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error("Error uploading evidence:", error);
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// List evidence for a case
app.get('/api/cases/:case_id/evidence', async (req, res) => {
    const { case_id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM evidence_files WHERE case_id = $1 ORDER BY uploaded_at DESC', [case_id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching evidence:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// Serve evidence files statically
app.use('/evidence', express.static(uploadDir));


// ==========================================
// 3. REPORTS API
// ==========================================

// List reports (which are essentially cases with status)
app.get('/api/reports', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                case_id, 
                title, 
                created_by, 
                created_at,
                'Generated' as status
            FROM cases 
            ORDER BY created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error("Error fetching reports:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// Get case details for report previews
app.get('/api/reports/:case_id', async (req, res) => {
    const { case_id } = req.params;
    try {
        const caseResult = await pool.query('SELECT * FROM cases WHERE case_id = $1', [case_id]);
        if (caseResult.rows.length === 0) {
            return res.status(404).json({ error: "Case not found" });
        }

        const evidenceResult = await pool.query('SELECT * FROM evidence_files WHERE case_id = $1', [case_id]);

        res.json({
            success: true,
            data: {
                case_details: caseResult.rows[0],
                evidence: evidenceResult.rows,
                wallets: [],
                transactions: []
            }
        });
    } catch (error) {
        console.error("Error fetching report details:", error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});

// Export report as PDF
app.get('/api/reports/case/:case_id/pdf', async (req, res) => {
    const { case_id } = req.params;

    try {
        const caseResult = await pool.query('SELECT * FROM cases WHERE case_id = $1', [case_id]);
        if (caseResult.rows.length === 0) {
            return res.status(404).json({ error: "Case not found" });
        }
        const caseData = caseResult.rows[0];

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Report-${case_id}.pdf"`);

        doc.pipe(res);

        doc.fontSize(25).text('Digital Asset Forensics Suite', { align: 'center' });
        doc.moveDown();
        doc.fontSize(20).text(`Investigation Report: ${caseData.title}`);
        doc.fontSize(12).text(`Case ID: ${caseData.case_id}`);
        doc.text(`Created By: ${caseData.created_by}`);
        doc.text(`Date: ${new Date(caseData.created_at).toLocaleString()}`);
        doc.moveDown();
        doc.text(`Description:`);
        doc.text(caseData.description);

        doc.end();

    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// ─── MONITORING APIs ──────────────────────
import { startMonitoringWorker } from './monitorWorker.js';
import { getTransactions } from './api.js';

// POST /api/monitor — Add wallet to monitor
app.post('/api/monitor', async (req, res) => {
    const { address, chain } = req.body;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ error: "Invalid wallet address" });
    }
    try {
        const monitor_id = `MON-${Date.now().toString(36).toUpperCase()}`;
        await pool.query(
            `INSERT INTO monitored_wallets (monitor_id, address, chain) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
            [monitor_id, address.toLowerCase(), chain || null]
        );
        res.json({ success: true, monitor_id, address: address.toLowerCase(), chain: chain || "multi-chain" });
    } catch (err) {
        console.error("Monitor add error:", err);
        res.status(500).json({ error: "Failed to add wallet" });
    }
});

// GET /api/monitor — List monitored wallets with live stats
app.get('/api/monitor', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM monitored_wallets ORDER BY created_at DESC');
        // Fetch live stats for each wallet
        const walletsWithStats = await Promise.all(rows.map(async (w) => {
            const chain = w.chain || "ethereum";
            try {
                const txResult = await getTransactions(w.address, chain);
                const txs = txResult.data || [];
                let totalVolume = 0;
                const counterparties = new Set();
                let lastActive = null;
                txs.forEach(tx => {
                    totalVolume += parseFloat(tx.value || 0);
                    if (tx.from?.toLowerCase() !== w.address.toLowerCase()) counterparties.add(tx.from);
                    if (tx.to?.toLowerCase() !== w.address.toLowerCase()) counterparties.add(tx.to);
                });
                return {
                    ...w,
                    chain: chain,
                    transfers: txs.length,
                    volume: totalVolume,
                    counterparties: counterparties.size,
                    last_active: w.last_checked_at || w.created_at
                };
            } catch {
                return { ...w, chain, transfers: 0, volume: 0, counterparties: 0, last_active: w.created_at };
            }
        }));
        res.json(walletsWithStats);
    } catch (err) {
        console.error("Monitor list error:", err);
        res.status(500).json({ error: "Failed to list wallets" });
    }
});

// DELETE /api/monitor/:monitor_id
app.delete('/api/monitor/:monitor_id', async (req, res) => {
    try {
        await pool.query('DELETE FROM monitored_wallets WHERE monitor_id = $1', [req.params.monitor_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove wallet" });
    }
});

// GET /api/alerts — Get all alerts (sorted newest first)
app.get('/api/alerts', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT 50');
        const unreadCount = rows.filter(a => !a.is_read).length;
        res.json({ alerts: rows, unread_count: unreadCount });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch alerts" });
    }
});

// POST /api/alerts/read — Mark all alerts as read
app.post('/api/alerts/read', async (req, res) => {
    try {
        await pool.query('UPDATE alerts SET is_read = TRUE WHERE is_read = FALSE');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to mark alerts as read" });
    }
});

// ─── ADMIN ALERT RECIPIENTS ────────────────────────
app.get('/api/admin/recipients', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM alert_recipients ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch recipients" });
    }
});

app.post('/api/admin/recipients', async (req, res) => {
    const { name, email, telegram_chat_id } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and Email are required" });

    // Basic email validation
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: "Invalid email format" });

    try {
        // use uuid for id
        const { randomUUID } = await import('crypto');
        const id = randomUUID();
        const { rows } = await pool.query(
            'INSERT INTO alert_recipients (id, name, email, telegram_chat_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name, email, telegram_chat_id || null]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error("Failed to add recipient", err);
        res.status(500).json({ error: "Failed to add recipient" });
    }
});

app.put('/api/admin/recipients/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, telegram_chat_id, is_active } = req.body;

    try {
        const { rows } = await pool.query(
            'UPDATE alert_recipients SET name = COALESCE($1, name), email = COALESCE($2, email), telegram_chat_id = COALESCE($3, telegram_chat_id), is_active = COALESCE($4, is_active) WHERE id = $5 RETURNING *',
            [name, email, telegram_chat_id, is_active, id]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Recipient not found" });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to update recipient" });
    }
});

app.delete('/api/admin/recipients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM alert_recipients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete recipient" });
    }
});

// Start the background monitoring worker
startMonitoringWorker();

// ─── INTELLIGENCE FEED ──────────────────────────────
import { getIntelligenceFeed } from './intelligenceService.js';

app.post('/api/intelligence/copilot', async (req, res) => {
    try {
        const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://127.0.0.1:8000';
        const response = await fetch(`${ML_ENGINE_URL}/ai/copilot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Copilot Proxy Error:", err);
        res.status(500).json({ error: "ML Engine unreachable" });
    }
});

app.get('/api/intelligence/news', async (req, res) => {
    try {
        const news = await getIntelligenceFeed();
        res.json(news);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch intelligence feed" });
    }
});

// Periodically check for HIGH severity news and push to alerts system
async function runIntelligenceAlertScanner() {
    try {
        const news = await getIntelligenceFeed();
        const highSeverityEvents = news.filter(n => n.severity === "high");

        for (const event of highSeverityEvents) {
            // Check if alert already exists to prevent duplication
            const { rowCount } = await pool.query(
                'SELECT 1 FROM alerts WHERE tx_hash = $1', // Using article link/id as a unique marker in tx_hash field for news
                [event.id]
            );

            if (rowCount === 0) {
                const message = `🚨 [HIGH] ${event.category.toUpperCase()} // ${event.title}`;
                await pool.query(
                    'INSERT INTO alerts (monitor_id, address, chain, tx_hash, amount, from_addr, to_addr, message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
                    ['INTELLIGENCE', event.related_entities[0] || 'Unknown', event.related_chain || 'Multi', event.id, '0', 'N/A', 'N/A', message]
                );

                // Broadcast via SSE
                graphEventBus.emit('alert', {
                    type: "INTELLIGENCE",
                    severity: "HIGH",
                    wallet: event.related_entities[0] || "Global",
                    chain: event.related_chain || "Multi",
                    tx_hash: event.id,
                    description: event.title,
                    timestamp: new Date().toISOString()
                });
            }
        }
    } catch (err) {
        // console.error("[Intelligence Scanner] Error:", err.message);
    }
}

// Check for news alerts every 10 minutes
setInterval(runIntelligenceAlertScanner, 10 * 60 * 1000);

// ─── SSE GRAPH STREAM ─────────────────────────
import { graphEventBus } from './monitorWorker.js';

// ─── GEO-ENRICHED INTELLIGENCE STREAM ────────────────────
const GEO_REGIONS = {
    'US-East': { lat: 40.71, lng: -74.00, country: 'US', city: 'New York', riskBase: 10 },
    'US-West': { lat: 37.77, lng: -122.42, country: 'US', city: 'San Francisco', riskBase: 10 },
    'UK': { lat: 51.51, lng: -0.13, country: 'GB', city: 'London', riskBase: 15 },
    'Germany': { lat: 52.52, lng: 13.41, country: 'DE', city: 'Berlin', riskBase: 10 },
    'Singapore': { lat: 1.35, lng: 103.82, country: 'SG', city: 'Singapore', riskBase: 10 },
    'Japan': { lat: 35.69, lng: 139.69, country: 'JP', city: 'Tokyo', riskBase: 10 },
    'UAE': { lat: 25.20, lng: 55.27, country: 'AE', city: 'Dubai', riskBase: 40 }, // higher scam hotspot
    'Russia': { lat: 55.76, lng: 37.62, country: 'RU', city: 'Moscow', riskBase: 85 }, // high risk
    'India': { lat: 19.08, lng: 72.88, country: 'IN', city: 'Mumbai', riskBase: 20 },
    'Brazil': { lat: -23.55, lng: -46.63, country: 'BR', city: 'São Paulo', riskBase: 45 },
    'Nigeria': { lat: 6.52, lng: 3.38, country: 'NG', city: 'Lagos', riskBase: 70 }, // high risk
    'Australia': { lat: -33.87, lng: 151.21, country: 'AU', city: 'Sydney', riskBase: 10 },
    'S-Korea': { lat: 37.57, lng: 126.98, country: 'KR', city: 'Seoul', riskBase: 25 },
    'HK': { lat: 22.32, lng: 114.17, country: 'HK', city: 'Hong Kong', riskBase: 35 },
    'Cayman': { lat: 19.29, lng: -81.37, country: 'KY', city: 'George Town', riskBase: 65 }, // high risk
    'Switzerland': { lat: 47.37, lng: 8.54, country: 'CH', city: 'Zürich', riskBase: 15 },
    'Panama': { lat: 8.98, lng: -79.51, country: 'PA', city: 'Panama City', riskBase: 60 },
    'Cyprus': { lat: 35.12, lng: 33.36, country: 'CY', city: 'Nicosia', riskBase: 55 }
};
const GEO_KEYS = Object.keys(GEO_REGIONS);
const SIGNALS = ['VPN', 'TOR_EXIT', 'HOSTING_PROVIDER', 'EXCHANGE_NODE', 'MIXER_NODE', 'DARKNET_ROUTER'];
const CORRELATION_TYPES = ['CO_SPEND', 'IP_OVERLAP', 'COMMON_COUNTERPARTY', 'INTELLIGENCE_MATCH'];

function generateIntelligenceEvent() {
    const isCorrelation = Math.random() < 0.15; // 15% chance to emit a link between two nodes

    if (isCorrelation) {
        const srcRegion = GEO_KEYS[Math.floor(Math.random() * GEO_KEYS.length)];
        let dstRegion = GEO_KEYS[Math.floor(Math.random() * GEO_KEYS.length)];
        if (srcRegion === dstRegion) dstRegion = GEO_KEYS[(GEO_KEYS.indexOf(srcRegion) + 1) % GEO_KEYS.length];

        return {
            type: 'CORRELATION_LINK',
            id: `cl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            correlationType: CORRELATION_TYPES[Math.floor(Math.random() * CORRELATION_TYPES.length)],
            confidence: Math.floor(Math.random() * 50 + 50),
            source: {
                region: srcRegion,
                geo: GEO_REGIONS[srcRegion]
            },
            destination: {
                region: dstRegion,
                geo: GEO_REGIONS[dstRegion]
            }
        };
    }

    // Standard IP Node Activation
    const region = GEO_KEYS[Math.floor(Math.random() * GEO_KEYS.length)];
    const geo = GEO_REGIONS[region];
    const signal = SIGNALS[Math.floor(Math.random() * SIGNALS.length)];

    // Activity level 1-100 (weighted higher for risky regions)
    let activityLevel = Math.floor(Math.random() * 40) + 10;
    if (geo.riskBase > 50) activityLevel += Math.floor(Math.random() * 50);

    // Add jitter to coordinates so they don't stack perfectly
    const jitterGeo = {
        ...geo,
        lat: geo.lat + (Math.random() - 0.5) * 2,
        lng: geo.lng + (Math.random() - 0.5) * 2
    };

    return {
        type: 'IP_SIGNAL',
        id: `ip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        networkSignal: signal,
        activityLevel,
        isHotspot: activityLevel > 70,
        node: {
            ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            region: region,
            geo: jitterGeo
        }
    };
}


app.get('/api/stream/network', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: "CONNECTED", timestamp: new Date().toISOString() })}\n\n`);

    const emitEvent = () => {
        try {
            const event = generateIntelligenceEvent();
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch { }
    };

    // Emit events at random intervals (1.5-4s) for realistic feel
    let timeout;
    const scheduleNext = () => {
        const delay = 1500 + Math.random() * 2500;
        timeout = setTimeout(() => { emitEvent(); scheduleNext(); }, delay);
    };
    scheduleNext();

    const heartbeat = setInterval(() => {
        try { res.write(`data: ${JSON.stringify({ type: "HEARTBEAT", timestamp: new Date().toISOString() })}\n\n`); } catch { }
    }, 20000);

    req.on('close', () => { clearTimeout(timeout); clearInterval(heartbeat); });
});

// SSE endpoint for live graph updates
app.get('/api/stream/graph', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    // Send initial ping
    res.write(`data: ${JSON.stringify({ type: "CONNECTED", timestamp: new Date().toISOString() })}\n\n`);

    // Forward graph update events
    const onGraphUpdate = (data) => {
        try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { }
    };
    const onAlert = (data) => {
        try { res.write(`data: ${JSON.stringify({ ...data, type: "ALERT" })}\n\n`); } catch { }
    };

    graphEventBus.on('graph_update', onGraphUpdate);
    graphEventBus.on('alert', onAlert);

    // Heartbeat every 15s to keep connection alive
    const heartbeat = setInterval(() => {
        try { res.write(`data: ${JSON.stringify({ type: "HEARTBEAT", timestamp: new Date().toISOString() })}\n\n`); } catch { }
    }, 15000);

    req.on('close', () => {
        graphEventBus.off('graph_update', onGraphUpdate);
        graphEventBus.off('alert', onAlert);
        clearInterval(heartbeat);
    });
});

// ─── ENHANCED FORENSIC REPORT GENERATOR ───────
app.get('/api/reports/case/:case_id/generate', async (req, res) => {
    const { case_id } = req.params;
    try {
        const caseResult = await pool.query('SELECT * FROM cases WHERE case_id = $1', [case_id]);
        if (caseResult.rows.length === 0) return res.status(404).json({ error: "Case not found" });
        const caseData = caseResult.rows[0];

        // Parse graph data
        let graph = { nodes: [], edges: [] };
        try { graph = typeof caseData.graph_data === 'string' ? JSON.parse(caseData.graph_data) : caseData.graph_data || graph; } catch { }

        // Fetch alerts for this case
        const alertResult = await pool.query(
            'SELECT * FROM alerts WHERE address = $1 ORDER BY created_at DESC LIMIT 20',
            [caseData.target_wallet?.toLowerCase()]
        ).catch(() => ({ rows: [] }));

        // Generate PDF
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="DAFS-Report-${case_id}.pdf"`);
        doc.pipe(res);

        const drawLine = () => { doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#333'); doc.moveDown(0.3); };

        // ─── 1. COVER PAGE ───
        doc.moveDown(4);
        doc.fontSize(8).fillColor('#666').text('CONFIDENTIAL — LAW ENFORCEMENT USE ONLY', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(24).fillColor('#111').text('Digital Asset Forensics Suite', { align: 'center' });
        doc.fontSize(14).fillColor('#444').text('INVESTIGATION REPORT', { align: 'center' });
        doc.moveDown(2);
        drawLine();
        doc.fontSize(10).fillColor('#333');
        doc.text(`Case ID: ${caseData.case_id}`);
        doc.text(`Title: ${caseData.title}`);
        doc.text(`Chain: ${caseData.chain || 'Unknown'}`);
        doc.text(`Priority: ${caseData.priority || 'Medium'}`);
        doc.text(`Created: ${new Date(caseData.created_at).toLocaleString()}`);
        doc.text(`Report Generated: ${new Date().toLocaleString()}`);
        drawLine();

        // ─── 2. INVESTIGATION SUMMARY ───
        doc.addPage();
        doc.fontSize(16).fillColor('#111').text('2. Investigation Summary');
        doc.moveDown(0.5);
        drawLine();
        doc.fontSize(10).fillColor('#333');
        doc.text(`Description: ${caseData.description || 'N/A'}`);
        doc.moveDown(0.3);
        doc.text(`Target Wallet: ${caseData.target_wallet || 'N/A'}`);
        doc.text(`Blockchain: ${(caseData.chain || 'unknown').toUpperCase()}`);
        doc.text(`Total Nodes Analyzed: ${graph.nodes?.length || 0}`);
        doc.text(`Total Edges (Transaction Flows): ${graph.edges?.length || 0}`);
        doc.moveDown(0.5);

        // Node type breakdown
        const typeCount = {};
        (graph.nodes || []).forEach(n => { typeCount[n.type || 'normal'] = (typeCount[n.type || 'normal'] || 0) + 1; });
        doc.text('Node Classification:');
        Object.entries(typeCount).forEach(([type, count]) => {
            doc.text(`  • ${type}: ${count}`, { indent: 20 });
        });

        // ─── 3. TIMELINE OF TRANSACTIONS ───
        doc.addPage();
        doc.fontSize(16).fillColor('#111').text('3. Transaction Timeline');
        doc.moveDown(0.5);
        drawLine();
        doc.fontSize(9).fillColor('#333');
        const edges = graph.edges || [];
        if (edges.length === 0) {
            doc.text('No transaction flows recorded.');
        } else {
            edges.slice(0, 30).forEach((e, i) => {
                const vol = e.data?.volume ? parseFloat(e.data.volume) : 0;
                doc.text(`${i + 1}. ${(e.source || '?').substring(0, 12)}... → ${(e.target || '?').substring(0, 12)}... | Volume: ${vol.toFixed(4)}`);
            });
            if (edges.length > 30) doc.text(`... and ${edges.length - 30} more flows`);
        }

        // ─── 4. TRANSACTION FLOW ANALYSIS ───
        doc.addPage();
        doc.fontSize(16).fillColor('#111').text('4. Transaction Flow Analysis');
        doc.moveDown(0.5);
        drawLine();
        doc.fontSize(10).fillColor('#333');
        const totalVolume = edges.reduce((s, e) => s + parseFloat(e.volume || 0), 0);
        const totalTransfers = edges.reduce((s, e) => s + (e.transfers || 1), 0);
        doc.text(`Total Volume Observed: ${totalVolume.toFixed(4)} ${caseData.chain === 'ethereum' ? 'ETH' : 'native'}`);
        doc.text(`Total Transfer Events: ${totalTransfers}`);
        doc.text(`Unique Flows: ${edges.length}`);
        doc.moveDown(0.5);

        // Top counterparties by volume
        const cpVol = {};
        edges.forEach(e => { cpVol[e.target] = (cpVol[e.target] || 0) + parseFloat(e.volume || 0); });
        const topCps = Object.entries(cpVol).sort((a, b) => b[1] - a[1]).slice(0, 10);
        doc.text('Top Recipients by Volume:');
        topCps.forEach(([addr, vol], i) => {
            doc.text(`  ${i + 1}. ${addr.substring(0, 16)}... — ${vol.toFixed(4)} ${caseData.chain === 'ethereum' ? 'ETH' : 'native'}`, { indent: 10 });
        });

        // ─── 5. ENTITY ATTRIBUTION ───
        doc.addPage();
        doc.fontSize(16).fillColor('#111').text('5. Entity Attribution');
        doc.moveDown(0.5);
        drawLine();
        doc.fontSize(10).fillColor('#333');
        const suspects = (graph.nodes || []).filter(n => n.type === 'suspect' || (n.riskScore || 0) >= 60);
        const exchanges = (graph.nodes || []).filter(n => n.type === 'exchange');
        const hubs = (graph.nodes || []).filter(n => n.type === 'hub');
        doc.text(`Suspect Entities: ${suspects.length}`);
        suspects.forEach(n => doc.text(`  ⚠ ${n.address?.substring(0, 20)}... (Risk Score: ${n.riskScore || 0})`, { indent: 10 }));
        doc.moveDown(0.3);
        doc.text(`Exchange Entities: ${exchanges.length}`);
        exchanges.forEach(n => doc.text(`  📊 ${n.address?.substring(0, 20)}...`, { indent: 10 }));
        doc.moveDown(0.3);
        doc.text(`Hub Entities: ${hubs.length}`);
        hubs.forEach(n => doc.text(`  🔗 ${n.address?.substring(0, 20)}... (Tx Count: ${n.txCount || 0})`, { indent: 10 }));

        // ─── 6. EVIDENCE SUMMARY ───
        doc.addPage();
        doc.fontSize(16).fillColor('#111').text('6. Evidence Summary');
        doc.moveDown(0.5);
        drawLine();
        const evidenceResult = await pool.query('SELECT * FROM evidence WHERE case_id = $1', [case_id]).catch(() => ({ rows: [] }));
        if (evidenceResult.rows.length === 0) {
            doc.fontSize(10).fillColor('#333').text('No evidence files attached to this case.');
        } else {
            evidenceResult.rows.forEach((ev, i) => {
                doc.fontSize(10).fillColor('#333').text(`${i + 1}. ${ev.original_name || ev.file_name} — Hash: ${ev.file_hash || 'N/A'}`);
            });
        }

        // ─── 7. RISK ASSESSMENT ───
        doc.addPage();
        doc.fontSize(16).fillColor('#111').text('7. Risk Assessment');
        doc.moveDown(0.5);
        drawLine();
        doc.fontSize(10).fillColor('#333');
        const avgRisk = (graph.nodes || []).reduce((s, n) => s + (n.riskScore || 0), 0) / ((graph.nodes || []).length || 1);
        doc.text(`Average Risk Score: ${avgRisk.toFixed(1)}%`);
        doc.text(`Total Alerts Generated: ${alertResult.rows.length}`);
        const highAlerts = alertResult.rows.filter(a => a.message?.includes('[HIGH]'));
        doc.text(`High Severity Alerts: ${highAlerts.length}`);
        doc.moveDown(0.3);
        if (alertResult.rows.length > 0) {
            doc.text('Recent Alerts:');
            alertResult.rows.slice(0, 10).forEach((a, i) => {
                doc.text(`  ${i + 1}. ${a.message}`, { indent: 10 });
            });
        }

        // ─── 8. CONCLUSION ───
        doc.addPage();
        doc.fontSize(16).fillColor('#111').text('8. Conclusion');
        doc.moveDown(0.5);
        drawLine();
        doc.fontSize(10).fillColor('#333');
        const riskLevel = avgRisk > 60 ? 'HIGH' : avgRisk > 30 ? 'MEDIUM' : 'LOW';
        doc.text(`Overall Risk Level: ${riskLevel}`);
        doc.text(`This report contains ${graph.nodes?.length || 0} analyzed entities across ${edges.length} transaction flows on the ${(caseData.chain || 'unknown').toUpperCase()} blockchain.`);
        doc.moveDown(0.3);
        doc.text(`${suspects.length} suspect entities and ${highAlerts.length} high-severity alerts were identified during this investigation.`);
        doc.moveDown(1);
        drawLine();
        doc.fontSize(8).fillColor('#666').text('Generated by Namo Labs | Digital Asset Forensics Suite', { align: 'center' });
        doc.text('This report is intended for authorized personnel only.', { align: 'center' });

        doc.end();
    } catch (error) {
        console.error("Report generation error:", error);
        res.status(500).json({ error: "Failed to generate report" });
    }
});
