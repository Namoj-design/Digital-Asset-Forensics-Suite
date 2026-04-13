/**
 * Solana RPC Client
 * 
 * Provides robust historical data fetching capabilities with automatic retry, 
 * backoff, and pagination for fetching transaction signatures and full transaction payloads.
 * Utilizes @solana/web3.js and handles Versioned Transactions natively.
 */
import { Connection, PublicKey } from '@solana/web3.js';
import pRetry from 'p-retry';

const MAX_RETRIES = 5;

export class SolanaRPCClient {
    constructor(rpcUrl) {
        // QuickNode URL or fallback to public mainnet (not recommended for prod)
        this.endpoint = rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
        this.connection = new Connection(this.endpoint, {
            commitment: 'confirmed',
            disableRetryOnRateLimit: false,
        });
        console.log(`[SolanaRPC] Initialized on endpoint: ${this.endpoint.split('://')[1].split('/')[0]}`);
    }

    /**
     * Fetch all available transaction signatures for a given address with automatic pagination.
     * @param {string} address - Base58 encoded Solana address
     * @param {number} limit - Total number of signatures to fetch
     * @param {string} before - Optional signature to fetch backwards from
     * @param {string} until - Optional signature to stop fetching at
     * @returns {Promise<Array>} List of signature objects
     */
    async getSignaturesForAddress(address, limit = 1000, before = null, until = null) {
        let allSignatures = [];
        let lastSignature = before;
        const pubkey = new PublicKey(address);

        console.log(`[SolanaRPC] Scraping signatures for ${address}...`);

        while (allSignatures.length < limit) {
            const batchSize = Math.min(1000, limit - allSignatures.length);
            const options = { limit: batchSize };
            if (lastSignature) options.before = lastSignature;
            if (until) options.until = until;

            const signatures = await pRetry(
                async () => {
                    return await this.connection.getSignaturesForAddress(pubkey, options);
                },
                {
                    retries: MAX_RETRIES,
                    onFailedAttempt: error => {
                        console.warn(`[SolanaRPC] getSignatures failed (Attempt ${error.attemptNumber}/${MAX_RETRIES}): ${error.message}`);
                    }
                }
            );

            if (signatures.length === 0) break;

            allSignatures = allSignatures.concat(signatures);
            lastSignature = signatures[signatures.length - 1].signature;

            if (signatures.length < batchSize) break; // Exhausted available history
        }

        console.log(`[SolanaRPC] Retrieved ${allSignatures.length} signatures for ${address}.`);
        return allSignatures;
    }

    /**
     * Fetch the fully parsed transaction object, including inner instructions and versioned tx support.
     * @param {string} signature - The transaction signature base58 string
     * @returns {Promise<Object>} The parsed transaction payload
     */
    async getParsedTransaction(signature) {
        return await pRetry(
            async () => {
                const tx = await this.connection.getParsedTransaction(signature, {
                    maxSupportedTransactionVersion: 0, 
                    commitment: 'confirmed'
                });
                
                if (!tx) {
                    throw new Error(`Transaction ${signature} not found or not confirmed yet.`);
                }
                
                return tx;
            },
            {
                retries: MAX_RETRIES,
                minTimeout: 1000,
                maxTimeout: 10000,
                onFailedAttempt: error => {
                    console.warn(`[SolanaRPC] getParsedTransaction failed for ${signature.substring(0,10)}... (Attempt ${error.attemptNumber}/${MAX_RETRIES}): ${error.message}`);
                }
            }
        );
    }
    
    /**
     * Bulk fetch parsed transactions (Useful for batch ingestion)
     * @param {Array<string>} signatures - Array of transaction signatures
     * @returns {Promise<Array<Object>>}
     */
    async getParsedTransactionsBulk(signatures) {
        console.log(`[SolanaRPC] Bulk fetching ${signatures.length} transactions...`);
        // We do not use the raw bulk RPC method due to rate limits, we execute concurrently with concurrency limit via standard Promises
        
        const chunks = [];
        const chunkSize = 25; // Strict chunking to avoid 429 Too Many Requests
        
        for (let i = 0; i < signatures.length; i += chunkSize) {
            chunks.push(signatures.slice(i, i + chunkSize));
        }

        let results = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const promises = chunk.map(sig => 
                this.connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: 'confirmed' })
            );
            
            // Allow individual txs to mock fail if truly missing
            const settled = await Promise.allSettled(promises);
            const successful = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
            results = results.concat(successful);
            
            // Artificial delay to respect Tier limits
            await new Promise(res => setTimeout(res, 500));
        }

        return results;
    }
}
