// ==========================================
// DAFS BACKEND IMPLEMENTATION - MULTI-CHAIN 
// ==========================================
// This represents the Express/Node.js backend routing 
// and blockchain provider abstraction layer.

import express from 'express';

export function getProvider(chain) {
    if (!chain) throw new Error("Chain must be explicitly provided. No default chain allowed.");

    switch (chain.toLowerCase()) {
        case "ethereum": return process.env.ETH_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/DEMO_KEY";
        case "polygon": return process.env.POLYGON_RPC_URL || "https://polygon-mainnet.g.alchemy.com/v2/DEMO_KEY";
        case "bnb": return process.env.BNB_RPC_URL || "https://bsc-dataseed.binance.org/";
        case "arbitrum": return process.env.ARB_RPC_URL || "https://arb-mainnet.g.alchemy.com/v2/DEMO_KEY";
        case "optimism": return process.env.OPT_RPC_URL || "https://opt-mainnet.g.alchemy.com/v2/DEMO_KEY";
        case "base": return process.env.BASE_RPC_URL || "https://mainnet.base.org";
        case "avalanche": return process.env.AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";
        default: throw new Error(`Unsupported chain: ${chain}`);
    }
}

// JSON-RPC Helper
export async function rpcFetch(chain, method, params = []) {
    // 7. ENFORCE EXPLICIT CHAIN
    const selectedChain = chain;

    // 8. ERROR HANDLING
    if (!selectedChain) {
        throw new Error("Chain must be explicitly provided. No default chain allowed.");
    }
    const rpcUrl = getProvider(selectedChain);

    const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params
        })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
}
// ------------------------------------------
// 5. DATA FETCHING LOGIC
// ------------------------------------------
export async function fetchWalletData(address, chain) {
    if (!chain) return { success: false, message: "Chain is required" };
    try {
        // Fetch wallet balance
        const balanceHex = await rpcFetch(chain, "eth_getBalance", [address, "latest"]);
        const balance = parseInt(balanceHex, 16) / 1e18; // Normalize response format (wei to eth)

        return {
            success: true,
            data: {
                address,
                chain: chain,
                balance,
            }
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
}
export async function getTransactions(address, chain) {
    if (!chain) throw new Error("Chain is required");
    console.log(`Fetching transactions for ${address} on chain: ${chain}`);

    try {
        const chainMap = { "ethereum": 1, "polygon": 137, "bnb": 56, "arbitrum": 42161, "optimism": 10, "base": 8453, "avalanche": 43114 };
        const chainId = chainMap[chain.toLowerCase()] || 1;

        const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=M2NDTWURCC9V6DY6MJKEYPDUPARBGA36BT`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.status === "1" && Array.isArray(data.result)) {
            return {
                success: true,
                data: data.result.map(tx => ({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    value: (Number(tx.value) / 1e18).toString(),
                    asset: "NATIVE",
                    chain: chain
                }))
            };
        }
        return { success: true, data: [] };
    } catch (error) {
        console.warn(`Provider error fetching txs:`, error.message);
        return { success: true, data: [] };
    }
}

// ------------------------------------------
// 3. BACKEND IMPLEMENTATION (EXPRESS ROUTES)
// ------------------------------------------
const oldApiRoutes = express.Router();

oldApiRoutes.get('/wallet/:address', async (req, res) => {
    const { address } = req.params;
    const { chain } = req.query; // read chain param

    const result = await fetchWalletData(address, chain); // route request to correct provider
    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }

    res.json(result.data); // Normalize response format
});

oldApiRoutes.get('/transactions', async (req, res) => {
    const { address, chain } = req.query; // read chain param

    const result = await getTransactions(address, chain); // fetch data dynamically
    if (!result.success) {
        return res.status(400).json({ error: result.message });
    }

    res.json(result.data);
});

oldApiRoutes.get('/graph', async (req, res) => {
    const { address, chain } = req.query;
    if (!chain) {
        return res.status(400).json({ error: "Chain is strictly required" });
    }
    if (!address) {
        return res.status(400).json({ error: "Address is required" });
    }

    // Attempt to build graph for a dynamic call without a case
    import('./investigationEngine.js').then(async ({ initializeInvestigation }) => {
        try {
            const tempCaseId = `GRAPH-${Date.now()}`;
            const graphData = await initializeInvestigation(tempCaseId, {
                targetWallet: address,
                chain: chain
            });
            res.json(graphData.graph);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

});

import { getNodeIntelligence } from './nodeIntelligenceService.js';
import intelligenceRouter from './routes/intelligence.js';

oldApiRoutes.use('/intelligence', intelligenceRouter);

oldApiRoutes.get('/intelligence/node/:address', async (req, res) => {
    const { address } = req.params;
    const { chain } = req.query;
    try {
        const data = await getNodeIntelligence(address, chain || 'ethereum');
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

oldApiRoutes.post('/investigation/expand', async (req, res) => {
    const { address, chain, limit = 15 } = req.body;
    if (!address || !chain) return res.status(400).json({ error: "Address and chain required" });

    try {
        const txResult = await getTransactions(address, chain);
        const txs = (txResult.data || []).slice(0, limit * 2);

        const nodesMap = new Map();
        const edgesMap = new Map();

        for (const tx of txs) {
            const from = tx.from?.toLowerCase();
            const to = tx.to?.toLowerCase();
            if (!from || !to) continue;

            const val = parseFloat(tx.value || 0);
            const edgeId = `${from}_${to}`;

            if (!edgesMap.has(edgeId)) edgesMap.set(edgeId, { source: from, target: to, transfers: 0, volume: 0 });
            const edge = edgesMap.get(edgeId);
            edge.transfers += 1;
            edge.volume += val;

            if (!nodesMap.has(from)) nodesMap.set(from, { id: from, address: from, label: from.substring(0, 8) + "...", txCount: 1, type: from === address.toLowerCase() ? "target" : "normal", riskScore: 20 });
            else nodesMap.get(from).txCount++;

            if (!nodesMap.has(to)) nodesMap.set(to, { id: to, address: to, label: to.substring(0, 8) + "...", txCount: 1, type: to === address.toLowerCase() ? "target" : "normal", riskScore: 20 });
            else nodesMap.get(to).txCount++;
        }

        const nodes = Array.from(nodesMap.values()).slice(0, limit + 1);
        const allowedNodes = new Set(nodes.map(n => n.id));
        const edges = Array.from(edgesMap.values()).filter(e => allowedNodes.has(e.source) && allowedNodes.has(e.target));

        res.json({ success: true, data: { nodes, edges } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

oldApiRoutes.post('/investigation/trace', async (req, res) => {
    const { address, chain, depth = 2 } = req.body;
    if (!address || !chain) return res.status(400).json({ error: "Address and chain required" });

    try {
        import('./investigationEngine.js').then(async ({ initializeInvestigation }) => {
            const tempCaseId = `TRACE-${Date.now()}`;
            const graphData = await initializeInvestigation(tempCaseId, {
                targetWallet: address,
                chain: chain,
                maxDepth: depth
            });
            res.json({ success: true, data: graphData.graph });
        }).catch(err => {
            res.status(500).json({ error: err.message });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default oldApiRoutes;
