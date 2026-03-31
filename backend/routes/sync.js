import express from 'express';
import { Canvas } from '../models/Canvas.js';
import pool from '../db.js';

const router = express.Router();

// Pull nodes/edges FROM an existing Postgres Case into a Canvas
router.post('/from-case', async (req, res) => {
    try {
        const { case_id, canvas_id } = req.body;
        
        // 1. Fetch case from Postgres
        const caseRes = await pool.query('SELECT graph_data FROM cases WHERE case_id=$1', [case_id]);
        if (caseRes.rows.length === 0) return res.status(404).json({ error: "Case not found" });
        
        let graphData = caseRes.rows[0].graph_data;
        if (typeof graphData === 'string') graphData = JSON.parse(graphData);
        if (!graphData || !graphData.nodes) return res.status(400).json({ error: "Case has no graph data to sync" });

        // 2. Map generic graph nodes to React Flow format
        const rfNodes = graphData.nodes.map((n, i) => ({
            id: n.id,
            type: 'walletNode',
            position: { x: Math.random() * 500, y: Math.random() * 500 }, // scatter them initially
            data: { address: n.address || n.id, riskScore: n.riskScore, type: n.type, ...n }
        }));

        const rfEdges = (graphData.edges || []).map((e, i) => ({
            id: `e-${e.source}-${e.target}-${i}`,
            source: e.source,
            target: e.target,
            animated: true,
            data: { volume: e.volume, transfers: e.transfers }
        }));

        // 3. Save to Mongo Canvas
        const canvas = await Canvas.findByIdAndUpdate(canvas_id, {
            $push: {
                nodes: { $each: rfNodes },
                edges: { $each: rfEdges }
            },
            case_id: case_id
        }, { new: true });

        // 4. Update Postgres to track the link
        await pool.query(
            `UPDATE cases SET linked_canvas_ids = linked_canvas_ids || $1::jsonb WHERE case_id=$2 AND NOT linked_canvas_ids @> $1::jsonb`,
            [JSON.stringify([canvas_id]), case_id]
        );

        res.json({ success: true, data: canvas });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Check Sync Status
router.get('/status/:case_id', async (req, res) => {
    try {
        const { case_id } = req.params;
        const caseRes = await pool.query('SELECT updated_at FROM cases WHERE case_id=$1', [case_id]);
        if (caseRes.rows.length === 0) return res.status(404).json({ error: "Case not found" });
        
        const canvas = await Canvas.findOne({ case_id: case_id }).sort({ updated_at: -1 });
        if (!canvas) return res.json({ success: true, status: 'no_canvas' });

        const caseUpdated = new Date(caseRes.rows[0].updated_at || Date.now()).getTime();
        const canvasUpdated = new Date(canvas.updated_at || Date.now()).getTime();

        const drift = Math.abs(caseUpdated - canvasUpdated);
        const inSync = drift < 10000; // 10s grace period

        res.json({
            success: true,
            status: inSync ? 'synced' : 'desynced',
            last_case_update: caseUpdated,
            last_canvas_update: canvasUpdated,
            canvas_id: canvas._id
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Push findings FROM a Canvas back to a Postgres Case
router.post('/to-case', async (req, res) => {
    try {
        const { case_id, canvas_id } = req.body;
        
        const canvas = await Canvas.findById(canvas_id);
        if (!canvas) return res.status(404).json({ error: "Canvas not found" });

        // Convert React flow format back to analytics format
        const caseNodes = canvas.nodes.map(n => ({
            id: n.id,
            address: n.data.address || n.id,
            type: n.data.type || 'wallet',
            riskScore: n.data.riskScore || 0,
            ...n.data
        }));

        const caseEdges = canvas.edges.map(e => ({
            source: e.source,
            target: e.target,
            volume: e.data?.volume || 0,
            transfers: e.data?.transfers || 1
        }));

        const graphDataJSON = JSON.stringify({ nodes: caseNodes, edges: caseEdges });

        // Overwrite the graph_data in Postgres and set updated_at
        await pool.query(
            'UPDATE cases SET graph_data=$1, updated_at=CURRENT_TIMESTAMP WHERE case_id=$2',
            [graphDataJSON, case_id]
        );

        res.json({ success: true, message: "Successfully synced intelligence back to case record." });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
