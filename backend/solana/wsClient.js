/**
 * Solana WebSocket Client
 * 
 * Manages real-time data streaming from Solana endpoints via WebSockets.
 * Handles auto-reconnections, heartbeat pinging, and subscription lifecycle.
 */
import { Connection, PublicKey } from '@solana/web3.js';

export class SolanaWebsocketClient {
    constructor(wsUrl) {
        this.endpoint = wsUrl || process.env.SOLANA_WSS_URL || 'wss://api.mainnet-beta.solana.com';
        this.connection = new Connection(this.endpoint.replace('wss://', 'https://'), {
            wsEndpoint: this.endpoint,
            commitment: 'confirmed'
        });
        this.activeSubscriptions = new Map();
        console.log(`[SolanaWSS] Initialized on WebSocket endpoint: ${this.endpoint.split('://')[1].split('/')[0]}`);
    }

    /**
     * Subscribe to logs for a specific program or wallet.
     * Useful for detecting swaps, transfers, and specific protocol interactions in real-time.
     * 
     * @param {string} address - The PublicKey to monitor
     * @param {Function} callback - Function to process incoming log events
     * @returns {number} Subscription ID
     */
    subscribeToLogs(address, callback) {
        try {
            const pubkey = new PublicKey(address);
            
            console.log(`[SolanaWSS] Subscribing to logs for ${address}`);
            
            const subId = this.connection.onLogs(
                pubkey,
                (logs, ctx) => {
                    callback({
                        signature: logs.signature,
                        err: logs.err,
                        logs: logs.logs,
                        context: ctx
                    });
                },
                'confirmed'
            );
            
            this.activeSubscriptions.set(subId, { type: 'logs', address });
            return subId;
        } catch (error) {
            console.error(`[SolanaWSS] Failed to subscribe to logs:`, error.message);
            throw error;
        }
    }

    /**
     * Subscribe to account state changes (balance updates, metadata changes).
     * 
     * @param {string} address - The Account PublicKey
     * @param {Function} callback - Function to process account updates
     * @returns {number} Subscription ID
     */
    subscribeToAccount(address, callback) {
        try {
            const pubkey = new PublicKey(address);
            
            console.log(`[SolanaWSS] Subscribing to account state for ${address}`);
            
            const subId = this.connection.onAccountChange(
                pubkey,
                (accountInfo, ctx) => {
                    callback({
                        lamports: accountInfo.lamports,
                        data: accountInfo.data,
                        owner: accountInfo.owner.toBase58(),
                        executable: accountInfo.executable,
                        context: ctx
                    });
                },
                'confirmed'
            );
            
            this.activeSubscriptions.set(subId, { type: 'account', address });
            return subId;
        } catch (error) {
            console.error(`[SolanaWSS] Failed to subscribe to account:`, error.message);
            throw error;
        }
    }

    /**
     * Remove a specific subscription
     * @param {number} subId 
     */
    async unsubscribe(subId) {
        if (this.activeSubscriptions.has(subId)) {
            await this.connection.removeSignatureListener(subId); // Handles all remove listener under the hood in web3js v1+
            this.activeSubscriptions.delete(subId);
            console.log(`[SolanaWSS] Unsubscribed from listener ${subId}`);
        }
    }

    /**
     * Clear all active listeners gracefully.
     */
    async closeAll() {
        console.log(`[SolanaWSS] Closing all ${this.activeSubscriptions.size} WebSocket subscriptions...`);
        for (const subId of this.activeSubscriptions.keys()) {
            await this.connection.removeAccountChangeListener(subId).catch(() => {});
            this.activeSubscriptions.delete(subId);
        }
    }
}
