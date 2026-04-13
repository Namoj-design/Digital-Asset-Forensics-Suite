/**
 * Solana Instruction Decoder Engine
 * 
 * Takes raw parsed transactions from QuickNode (with or without versioned tx formats)
 * and normalizes them into chain-agnostic JSON events. Extracts SPL transfers, native 
 * SOL movements, and higher-level semantics like Swaps and Program Invocations.
 */

import { SOLANA_PROGRAMS, KNOWN_ENTITIES } from './programs.js';

export class DecoderEngine {
    
    /**
     * Normalizes a full parsed transaction object.
     * @param {Object} txResponse - The parsed transaction from getParsedTransaction
     * @returns {Object} Normalized Forensic Action Schema
     */
    parseTransaction(txResponse) {
        if (!txResponse || !txResponse.transaction || !txResponse.meta) {
            return null;
        }

        const sig = txResponse.transaction.signatures[0];
        const meta = txResponse.meta;
        const message = txResponse.transaction.message;
        const timestamp = txResponse.blockTime ? new Date(txResponse.blockTime * 1000).toISOString() : new Date().toISOString();
        
        const isFailed = meta.err !== null;
        
        // Resolve all involved accounts
        const accountKeys = message.accountKeys.map(k => k.pubkey);
        const feePayer = accountKeys[0];

        const normalizedEvent = {
            chain: 'solana',
            tx_hash: sig,
            timestamp: timestamp,
            status: isFailed ? 'failed' : 'success',
            fee_payer: feePayer,
            fee_lamports: meta.fee,
            actions: [],
            entities_involved: new Set(),
            programs_invoked: new Set()
        };

        // If the transaction failed, we still track fee burn, but ignore inner state shifts.
        if (isFailed) return this._finalizeEvent(normalizedEvent);

        // Map pre and post balances for tracking absolute SOL value changes
        const balanceChanges = this._calculateNativeBalanceChanges(accountKeys, meta.preBalances, meta.postBalances);
        
        // Iterate through all top-level instructions
        message.instructions.forEach((ix, index) => {
            const programId = ix.programId;
            normalizedEvent.programs_invoked.add(programId);
            
            // Check if it's a known DEX router to flag as swap
            const programLabel = SOLANA_PROGRAMS[programId] || 'UNKNOWN_PROGRAM';
            if (programLabel.includes('AGGREGATOR') || programLabel.includes('AMM') || programLabel.includes('CPMM')) {
                normalizedEvent.actions.push({
                    type: 'swap',
                    program: programId,
                    details: {
                        dex: programLabel,
                        instruction_index: index
                    }
                });
            }

            // Decode Top Level Instruction
            this._decodeInstruction(ix, normalizedEvent);
            
            // Decode associated Inner Instructions for this top-level instruction
            const innerIxs = meta.innerInstructions?.find(i => i.index === index)?.instructions || [];
            innerIxs.forEach(innerIx => {
                normalizedEvent.programs_invoked.add(innerIx.programId);
                this._decodeInstruction(innerIx, normalizedEvent);
            });
        });

        // Add implicit SOL movements that weren't captured by explicit 'transfer' instructions (e.g. rent exemption sweeping)
        balanceChanges.forEach(change => {
            if (Math.abs(change.change) > 500000) { // arbitrary dust filter
                normalizedEvent.entities_involved.add(change.account);
            }
        });

        return this._finalizeEvent(normalizedEvent);
    }

    /**
     * Decodes individual parsed instructions (applies to both top-level and inner instructions)
     */
    _decodeInstruction(ix, event) {
        if (!ix.parsed) return; // Ignore opaque binary data for basic decoding

        const type = ix.parsed.type;
        const info = ix.parsed.info;
        const program = ix.programId;

        if (program === '11111111111111111111111111111111' && type === 'transfer') {
            // NATIVE SOL TRANSFER
            const amountSOL = info.lamports / 1e9;
            event.actions.push({
                type: 'transfer',
                from: info.source,
                to: info.destination,
                amount: amountSOL,
                token_address: '11111111111111111111111111111111',
                token_symbol: 'SOL'
            });
            event.entities_involved.add(info.source);
            event.entities_involved.add(info.destination);
        }
        else if (program === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || program === 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb') {
            // SPL TOKEN TRANSFER
            if (type === 'transfer' || type === 'transferChecked') {
                const amount = type === 'transferChecked' ? info.tokenAmount.uiAmount : info.amount; // Transfer without checked needs decimal resolution later
                
                // For SPL, source and destination are often Token Accounts, not Wallets.
                // We resolve the actual owners in the Normalization Graph Layer, but track raw accounts here.
                event.actions.push({
                    type: 'transfer',
                    from_account: info.source,
                    to_account: info.destination,
                    authority: info.authority,
                    amount: amount,
                    token_address: info.mint || 'UNKNOWN_MINT', // Usually in transferChecked only
                    token_symbol: 'SPL'
                });
                event.entities_involved.add(info.authority);
                if (info.source) event.entities_involved.add(info.source);
                if (info.destination) event.entities_involved.add(info.destination);
            }
        }
    }

    _calculateNativeBalanceChanges(accounts, preBalances, postBalances) {
        const changes = [];
        for (let i = 0; i < accounts.length; i++) {
            const pre = preBalances[i];
            const post = postBalances[i];
            const diff = post - pre;
            if (diff !== 0) {
                changes.push({ account: accounts[i], change: diff, change_sol: diff / 1e9 });
            }
        }
        return changes;
    }

    _finalizeEvent(event) {
        // Convert Sets to Arrays for JSON serialization
        event.entities_involved = Array.from(event.entities_involved);
        event.programs_invoked = Array.from(event.programs_invoked);
        
        // Enrich mapped entities
        event.flagged_entities = event.entities_involved.filter(addr => KNOWN_ENTITIES[addr]).map(addr => ({
            address: addr,
            ...KNOWN_ENTITIES[addr]
        }));

        return event;
    }
}
