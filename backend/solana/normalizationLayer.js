/**
 * Normalization & Graph Construction Layer
 * 
 * Takes the extracted schemas from the DecoderEngine and converts them into
 * unified representations suitable for Neo4j and the ML Engine.
 */

export class NormalizationLayer {
    constructor(rpcClient) {
        this.rpcClient = rpcClient;
        // In reality, this map would be persisted in Redis to avoid redundant RPC calls
        this.tokenAccountToOwnerCache = new Map();
    }

    /**
     * Accepts a decoded transaction event and normalizes it to uniform Nodes and Edges.
     */
    async normalizeToGraph(decodedEvent) {
        if (!decodedEvent || decodedEvent.status === 'failed') return null;

        const nodes = new Map();
        const edges = [];

        // Track standard entities
        decodedEvent.entities_involved.forEach(address => {
            nodes.set(address, {
                id: address,
                labels: ['Wallet'],
                properties: { address }
            });
        });

        // Track invoked programs
        decodedEvent.programs_invoked.forEach(program => {
            nodes.set(program, {
                id: program,
                labels: ['Program'],
                properties: { address: program, type: 'SmartContract' }
            });

            // If the fee payer interacted with this program
            edges.push({
                source: decodedEvent.fee_payer,
                target: program,
                type: 'INTERACTS_WITH',
                properties: {
                    tx_hash: decodedEvent.tx_hash,
                    timestamp: decodedEvent.timestamp
                }
            });
        });

        // Track Semantic Actions (Transfers, Swaps)
        for (const action of decodedEvent.actions) {
            if (action.type === 'transfer') {
                 // Convert SPL Token Accounts to actual absolute Wallet Owners for cleaner graphing
                let sourceWallet = action.from || action.from_account;
                let destWallet = action.to || action.to_account;

                // Async resolution mapping Token Accounts back to underlying Wallet Owners
                if (action.token_symbol === 'SPL') {
                    if (action.from_account) sourceWallet = await this.resolveTokenAccountOwner(action.from_account) || action.authority;
                    if (action.to_account) destWallet = await this.resolveTokenAccountOwner(action.to_account) || destWallet;
                }

                if (sourceWallet && destWallet) {
                    nodes.set(sourceWallet, { id: sourceWallet, labels: ['Wallet'], properties: { address: sourceWallet } });
                    nodes.set(destWallet, { id: destWallet, labels: ['Wallet'], properties: { address: destWallet } });
                    
                    edges.push({
                        source: sourceWallet,
                        target: destWallet,
                        type: 'TRANSFER',
                        properties: {
                            amount: action.amount,
                            asset: action.token_symbol,
                            asset_address: action.token_address,
                            tx_hash: decodedEvent.tx_hash,
                            timestamp: decodedEvent.timestamp
                        }
                    });
                }
            } else if (action.type === 'swap') {
                const programId = action.program;
                nodes.set(programId, { id: programId, labels: ['Program', 'DEX'], properties: { address: programId, dex: action.details.dex } });
                
                edges.push({
                    source: decodedEvent.fee_payer,
                    target: programId,
                    type: 'SWAP',
                    properties: {
                        tx_hash: decodedEvent.tx_hash,
                        timestamp: decodedEvent.timestamp
                    }
                });
            }
        }

        // Apply Entity specific labels from Decoder mappings
        decodedEvent.flagged_entities.forEach(entity => {
            if (nodes.has(entity.address)) {
                nodes.get(entity.address).labels.push('Entity');
                nodes.get(entity.address).properties.entity_name = entity.name;
                nodes.get(entity.address).properties.risk_score = entity.riskScore;
                nodes.get(entity.address).labels.push(entity.type); // e.g., 'Exchange' or 'Hacker'
            }
        });

        return {
            nodes: Array.from(nodes.values()),
            edges
        };
    }

    /**
     * Looks up the raw owner wallet address of a Token Account using getAccountInfo.
     */
    async resolveTokenAccountOwner(tokenAccountAddress) {
        if (!tokenAccountAddress) return null;
        if (this.tokenAccountToOwnerCache.has(tokenAccountAddress)) {
            return this.tokenAccountToOwnerCache.get(tokenAccountAddress);
        }

        try {
            // Using raw RPC call, parsing out the owner logic locally based on SPL structure
            // NOTE: A production system caches this heavily in Redis
            const pubkey = require('@solana/web3.js').PublicKey;
            const accountInfo = await this.rpcClient.connection.getAccountInfo(new pubkey(tokenAccountAddress));
            
            if (accountInfo && accountInfo.data.length === 165) {
                // SPL Token Account Layout: Owner starts at byte 32, length 32
                const ownerBuffer = accountInfo.data.slice(32, 64);
                const ownerPubkey = new pubkey(ownerBuffer).toBase58();
                
                this.tokenAccountToOwnerCache.set(tokenAccountAddress, ownerPubkey);
                return ownerPubkey;
            }
        } catch (err) {
            console.warn(`[Normalization] Failed to resolve associated owner for Token Account ${tokenAccountAddress}`);
        }
        
        // Return original if unsellable
        return tokenAccountAddress;
    }
}
