import pool from './db.js';
import { getTransactions } from './api.js';
import { EventEmitter } from 'events';
import { dispatchAlert } from './dispatchService.js';

// ─── Global Event Bus for SSE streaming ────────────────────────
export const graphEventBus = new EventEmitter();
graphEventBus.setMaxListeners(50);

const POLL_INTERVAL = 20000; // 20 seconds
const HIGH_VALUE_THRESHOLD = 1.0; // 1 ETH/native = high value

// Known suspicious addresses (expandable)
const KNOWN_MIXERS = new Set([
    "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc",
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2000",
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
]);
const KNOWN_FLAGGED = new Set([
    "0x098b716b8aaf21512996dc57eb0615e2383e2f96",
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
]);

// ─── Anomaly Score Calculator ──────────────────────────────────
function computeAnomalyScore(tx, wallet) {
    let score = 0;
    const val = parseFloat(tx.value || 0);

    // High value transfer
    if (val > HIGH_VALUE_THRESHOLD) score += 30;
    if (val > 10) score += 20;
    if (val > 100) score += 30;

    // Interaction with mixer
    const counterparty = tx.from?.toLowerCase() === wallet.toLowerCase() ? tx.to?.toLowerCase() : tx.from?.toLowerCase();
    if (KNOWN_MIXERS.has(counterparty)) score += 40;
    if (KNOWN_FLAGGED.has(counterparty)) score += 30;

    return Math.min(score, 100);
}

// ─── Alert Intelligence Engine ─────────────────────────────────
function evaluateTransaction(tx, walletAddr) {
    const alerts = [];
    const val = parseFloat(tx.value || 0);
    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();
    const counterparty = from === walletAddr.toLowerCase() ? to : from;

    // Rule 1: High value transaction
    if (val > HIGH_VALUE_THRESHOLD) {
        alerts.push({
            type: "HIGH_VALUE",
            severity: val > 10 ? "HIGH" : "MEDIUM",
            description: `High-value transfer: ${val.toFixed(4)} ${tx.asset || "ETH"} detected`,
        });
    }

    // Rule 2: Interaction with known mixer
    if (KNOWN_MIXERS.has(counterparty)) {
        alerts.push({
            type: "MIXER",
            severity: "HIGH",
            description: `Transaction with known mixer address ${counterparty?.substring(0, 10)}...`,
        });
    }

    // Rule 3: Interaction with flagged wallet
    if (KNOWN_FLAGGED.has(counterparty)) {
        alerts.push({
            type: "SUSPICIOUS",
            severity: "HIGH",
            description: `Interaction with flagged wallet ${counterparty?.substring(0, 10)}...`,
        });
    }

    // Rule 4: Anomaly score threshold
    const anomalyScore = computeAnomalyScore(tx, walletAddr);
    if (anomalyScore >= 50 && alerts.length === 0) {
        alerts.push({
            type: "SUSPICIOUS",
            severity: anomalyScore >= 70 ? "HIGH" : "MEDIUM",
            description: `Anomaly score ${anomalyScore}/100 — unusual activity pattern`,
        });
    }

    return { alerts, anomalyScore };
}

// ─── Main Poll Loop ────────────────────────────────────────────
export async function pollWallets() {
    try {
        const { rows: wallets } = await pool.query('SELECT * FROM monitored_wallets');
        if (wallets.length === 0) return;

        // Also check all active investigation cases
        const { rows: cases } = await pool.query('SELECT case_id, chain, target_wallet FROM cases').catch(() => ({ rows: [] }));

        // Merge all tracked addresses
        const trackList = [
            ...wallets.map(w => ({ address: w.address, chain: w.chain || "ethereum", monitor_id: w.monitor_id, last_tx_hash: w.last_tx_hash, source: "monitor" })),
            ...cases.map(c => ({ address: c.target_wallet?.toLowerCase(), chain: c.chain || "ethereum", monitor_id: null, last_tx_hash: null, source: "case", case_id: c.case_id })),
        ];

        for (const item of trackList) {
            if (!item.address) continue;
            try {
                const result = await getTransactions(item.address, item.chain);
                const txs = result.data || [];
                if (txs.length === 0) continue;

                const latestTx = txs[0];

                // For monitored wallets: check for new transactions
                if (item.source === "monitor" && item.last_tx_hash && item.last_tx_hash === latestTx.hash) continue;

                const newTxs = [];
                if (item.source === "monitor") {
                    for (const tx of txs) {
                        if (tx.hash === item.last_tx_hash) break;
                        newTxs.push(tx);
                    }
                }

                // Process new transactions
                for (const tx of newTxs.slice(0, 5)) {
                    const val = parseFloat(tx.value || 0);
                    const direction = tx.from?.toLowerCase() === item.address.toLowerCase() ? "sent" : "received";
                    const { alerts: txAlerts, anomalyScore } = evaluateTransaction(tx, item.address);

                    // Emit SSE event for live graph update
                    graphEventBus.emit('graph_update', {
                        type: "NEW_TRANSACTION",
                        chain: item.chain,
                        tx_hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        value: tx.value,
                        timestamp: new Date().toISOString(),
                        anomaly_score: anomalyScore,
                        case_id: item.case_id || null,
                    });

                    // Create basic transaction alert
                    const baseMessage = `${item.address.substring(0, 10)}... ${direction} ${val.toFixed(4)} ${tx.asset || "ETH"} on ${item.chain}`;

                    if (item.monitor_id) {
                        await pool.query(
                            `INSERT INTO alerts (monitor_id, address, chain, tx_hash, amount, from_addr, to_addr, message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                            [item.monitor_id, item.address, item.chain, tx.hash, tx.value?.toString() || "0", tx.from, tx.to, baseMessage]
                        );
                    }

                    // Create intelligence-level alerts
                    for (const alert of txAlerts) {
                        const alertMsg = `⚠ [${alert.severity}] ${alert.type}: ${alert.description}`;
                        await pool.query(
                            `INSERT INTO alerts (monitor_id, address, chain, tx_hash, amount, from_addr, to_addr, message) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                            [item.monitor_id || 'SYSTEM', item.address, item.chain, tx.hash, tx.value?.toString() || "0", tx.from, tx.to, alertMsg]
                        ).catch(() => { }); // Don't crash on duplicate

                        // Emit alert event for bell icon
                        graphEventBus.emit('alert', {
                            type: alert.type,
                            severity: alert.severity,
                            wallet: item.address,
                            chain: item.chain,
                            tx_hash: tx.hash,
                            description: alert.description,
                            timestamp: new Date().toISOString(),
                        });

                        // Dispatch to configured admin recipients (Email/Telegram)
                        dispatchAlert({
                            monitor_id: item.monitor_id || 'SYSTEM',
                            address: item.address,
                            chain: item.chain,
                            amount: tx.value?.toString() || "0",
                            message: alertMsg,
                            tx_hash: tx.hash
                        });
                    }
                }

                // Update last known tx for monitored wallets
                if (item.source === "monitor" && item.monitor_id) {
                    await pool.query(
                        'UPDATE monitored_wallets SET last_tx_hash=$1, last_checked_at=NOW() WHERE monitor_id=$2',
                        [latestTx.hash, item.monitor_id]
                    );
                }

                if (newTxs.length > 0) {
                    console.log(`[Monitor] ${item.address.substring(0, 10)}... on ${item.chain}: ${newTxs.length} new tx(s)`);
                }
            } catch (err) {
                console.warn(`[Monitor] Error polling ${item.address?.substring(0, 10)}:`, err.message);
            }
        }
    } catch (err) {
        console.error("[Monitor] Poll error:", err.message);
    }
}

export function startMonitoringWorker() {
    console.log(`[Monitor] Intelligence worker started (poll: ${POLL_INTERVAL / 1000}s)`);
    pollWallets();
    setInterval(pollWallets, POLL_INTERVAL);
}
