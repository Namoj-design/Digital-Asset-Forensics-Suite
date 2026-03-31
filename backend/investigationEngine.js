import crypto from 'crypto';
import { getTransactions } from './api.js';

// ------------------------------------------
// 5. INVESTIGATION ENGINE (CORE LOGIC)
// ------------------------------------------
export async function initializeInvestigation(caseId, config) {
    const { targetWallet, suspectedWallet, maxDepth = 2, riskThreshold = 75, chain } = config;

    if (!chain) {
        throw new Error("Chain must be explicitly provided! No default chain is allowed.");
    }

    const nodesMap = new Map();
    const edgesMap = new Map();
    const suspiciousWallets = [];
    const transactionPaths = [];
    const insights = [];

    const targetLower = targetWallet.toLowerCase();

    // 1. Initialize Target
    nodesMap.set(targetLower, {
        id: targetLower,
        x: 400, y: 300,
        volume: 0,
        riskScore: 0,
        label: targetLower.substring(0, 8) + "...",
        address: targetLower,
        chain: chain,
        type: "target",
        isTarget: true,
        txCount: 0
    });

    if (suspectedWallet) {
        const suspectLower = suspectedWallet.toLowerCase();
        suspiciousWallets.push(suspectLower);
    }

    // 2. Depth 1 Expansion (Fetch Target Transactions)
    const txResult1 = await getTransactions(targetLower, chain);
    const depth1Txs = txResult1.data || [];

    // Process Depth 1 Tree
    const interactorCounts = new Map();
    for (const tx of depth1Txs) {
        const from = tx.from?.toLowerCase();
        const to = tx.to?.toLowerCase();
        if (!from || !to) continue;

        const val = parseFloat(tx.value || 0);

        // Edge Construction (A -> B)
        const edgeId = `${from}_${to}`;
        if (!edgesMap.has(edgeId)) {
            edgesMap.set(edgeId, { source: from, target: to, transfers: 0, volume: 0 });
        }
        const edge = edgesMap.get(edgeId);
        edge.transfers += 1;
        edge.volume += val;

        // Tally interactions for Depth 2 picking
        const otherWallet = from === targetLower ? to : from;
        interactorCounts.set(otherWallet, (interactorCounts.get(otherWallet) || 0) + 1);

        // Register Nodes
        if (!nodesMap.has(from)) {
            nodesMap.set(from, { id: from, address: from, label: from.substring(0, 8) + "...", x: 400 + (Math.random() * 200 - 100), y: 300 + (Math.random() * 200 - 100), txCount: 0, chain });
        }
        if (!nodesMap.has(to)) {
            nodesMap.set(to, { id: to, address: to, label: to.substring(0, 8) + "...", x: 400 + (Math.random() * 200 - 100), y: 300 + (Math.random() * 200 - 100), txCount: 0, chain });
        }

        nodesMap.get(from).txCount += 1;
        nodesMap.get(to).txCount += 1;
    }

    if (depth1Txs.length === 0) {
        insights.push("No transactions found for the target wallet on this chain.");
    } else {
        insights.push(`Analyzed ${depth1Txs.length} direct transfers for target.`);

        // 3. Depth 2 Expansion (Spidering outward from top active counterparties)
        if (maxDepth >= 2) {
            // Lazy load - restrict to Top 5 most active nodes to prevent Alchemy overload
            const topInteractors = Array.from(interactorCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(e => e[0]);

            const depth2Promises = topInteractors.filter(w => w !== suspectedWallet?.toLowerCase()).map(w => getTransactions(w, chain));
            const depth2Results = await Promise.all(depth2Promises);

            for (const d2Res of depth2Results) {
                const d2Txs = d2Res.data || [];
                for (const tx of d2Txs) {
                    const from = tx.from?.toLowerCase();
                    const to = tx.to?.toLowerCase();
                    if (!from || !to) continue;

                    const val = parseFloat(tx.value || 0);
                    const edgeId = `${from}_${to}`;

                    if (!edgesMap.has(edgeId)) {
                        edgesMap.set(edgeId, { source: from, target: to, transfers: 0, volume: 0 });
                    }
                    const edge = edgesMap.get(edgeId);
                    edge.transfers += 1;
                    edge.volume += val;

                    if (!nodesMap.has(from)) {
                        nodesMap.set(from, { id: from, address: from, label: from.substring(0, 8) + "...", x: Math.random() * 800, y: Math.random() * 600, txCount: 0, chain });
                    }
                    if (!nodesMap.has(to)) {
                        nodesMap.set(to, { id: to, address: to, label: to.substring(0, 8) + "...", x: Math.random() * 800, y: Math.random() * 600, txCount: 0, chain });
                    }

                    nodesMap.get(from).txCount += 1;
                    nodesMap.get(to).txCount += 1;
                }
            }
        }
    }

    // 4. Node Classification (Heuristic Intelligence Tagging)
    const KNOWN_EXCHANGES = ["0x28c6c06298d514db089934071355e22000000000", "0x5a52e96bacdabb82fd05763e25335261b270efcb"];
    const KNOWN_MIXERS = ["0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc", "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2000"];
    const KNOWN_DARKNET = ["0xd3ad000000000000000000000000000000000000", "0xdeadc0de00000000000000000000000000000000"];

    for (const [addr, node] of nodesMap.entries()) {
        node.anonymity_score = 0; // Default baseline

        // Ascertain local graph relationships
        let connectedToMixer = false;
        let connectedToDarknet = false;
        for (const edge of edgesMap.values()) {
            if (edge.source === addr || edge.target === addr) {
                const other = edge.source === addr ? edge.target : edge.source;
                if (KNOWN_MIXERS.includes(other)) connectedToMixer = true;
                if (KNOWN_DARKNET.includes(other)) connectedToDarknet = true;
            }
        }

        if (addr === targetLower) {
            node.type = "target";
            node.riskScore = 50;
            if (connectedToMixer) node.anonymity_score += 50;
            if (connectedToDarknet) node.anonymity_score += 50;
        } else if (KNOWN_EXCHANGES.includes(addr)) {
            node.type = "exchange"; // maps to blue
            node.riskScore = 10;
        } else if (KNOWN_DARKNET.includes(addr)) {
            node.type = "darknet_associated";
            node.riskScore = 100;
            node.anonymity_score = 100;
            if (!transactionPaths.some(p => p.risk === "CRITICAL" && p.path.includes(addr))) {
                transactionPaths.push({ path: [targetLower, addr], risk: "CRITICAL", reason: "Direct trace to high-risk darknet cluster" });
            }
            if (!suspiciousWallets.includes(addr)) suspiciousWallets.push(addr);
        } else if (KNOWN_MIXERS.includes(addr) || suspiciousWallets.includes(addr)) {
            node.type = "suspect"; // maps to red
            node.riskScore = 95;
            node.anonymity_score = 90;
            if (!transactionPaths.some(p => p.risk === "CRITICAL")) {
                transactionPaths.push({ path: [targetLower, addr], risk: "CRITICAL", reason: "Direct trace to high-risk mixer or attacker" });
            }
            if (!suspiciousWallets.includes(addr)) suspiciousWallets.push(addr);
        } else {
            // Anonymity heuristics calculation
            if (connectedToMixer) node.anonymity_score += 40;
            if (connectedToDarknet) node.anonymity_score += 50;
            if (node.txCount >= 10) node.anonymity_score += 20; // High frequency routing penalty

            if (node.txCount >= 10) {
                node.type = "hub"; // maps to grey but acts as high volume center
                node.riskScore = Math.max(40, node.anonymity_score);
                node.label = "Hub: " + node.label;
            } else if (interactorCounts.get(addr) > 5) {
                // Many incoming small tx logic loosely modeled 
                node.type = "suspect";
                node.riskScore = Math.max(80, node.anonymity_score);
                if (!suspiciousWallets.includes(addr)) suspiciousWallets.push(addr);
            } else {
                node.type = "normal"; // maps to grey
                node.riskScore = Math.max(20, Math.min(node.anonymity_score, 100));
            }
        }

        // Configuration threshold trigger
        if (node.riskScore >= riskThreshold && node.type !== "target") {
            node.type = "suspect";
            if (!suspiciousWallets.includes(addr)) suspiciousWallets.push(addr);
        }

        // IP Intelligence (Backend simulation only, no real identities tracked)
        if (node.anonymity_score >= 80) {
            node.ip_signals = ["TOR_EXIT_NODE", "VPN_CLUSTER"];
            if (!insights.includes(`High anonymity activity detected on node ${addr}`)) {
                insights.push(`High anonymity activity detected on node ${addr}`);
            }
        } else if (node.anonymity_score >= 40) {
            node.ip_signals = ["HOSTING_PROVIDER"];
        } else {
            node.ip_signals = [];
        }
    }

    const finalNodes = Array.from(nodesMap.values());
    const finalEdges = Array.from(edgesMap.values());

    return {
        case_id: caseId,
        graph: {
            nodes: finalNodes,
            edges: finalEdges
        },
        insights: {
            suspicious_wallets: suspiciousWallets,
            transaction_paths: transactionPaths,
            messages: insights,
            risk_summary: {
                total_nodes_analyzed: finalNodes.length,
                total_flows_mapped: finalEdges.length,
                critical_entities: suspiciousWallets.length,
                max_depth_reached: depth1Txs.length > 0 ? maxDepth : 1
            }
        }
    };
}

// Removed module.exports to use ES modules natively
