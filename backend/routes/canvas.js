import express from 'express';
import pool from '../db.js';

const router = express.Router();

// List all canvases (Derived from Cases)
router.get('/list', async (req, res) => {
    try {
        const cases = await pool.query('SELECT case_id, title, description, chain, updated_at FROM cases ORDER BY updated_at DESC');
        
        const mappedCanvases = cases.rows.map(c => ({
            _id: c.case_id, 
            name: c.title,
            description: c.description,
            chain: c.chain,
            case_id: c.case_id,
            updated_at: c.updated_at
        }));

        res.json({ success: true, data: mappedCanvases });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get single canvas state
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const caseRes = await pool.query('SELECT * FROM cases WHERE case_id=$1', [id]);
        if (caseRes.rows.length === 0) return res.status(404).json({ error: "Canvas/Case not found" });
        
        const c = caseRes.rows[0];
        let graph = { nodes: [], edges: [], viewport: { x:0, y:0, zoom:1 } };
        try { if (c.graph_data) graph = typeof c.graph_data === 'string' ? JSON.parse(c.graph_data) : c.graph_data; } catch {}
        
        // Ensure genesis node exists if graph is completely empty
        if (!graph.nodes || graph.nodes.length === 0) {
            graph.nodes = [{
                id: c.target_wallet,
                type: 'walletNode',
                position: { x: 250, y: 250 },
                data: { address: c.target_wallet, riskScore: 0, type: 'wallet' }
            }];
        }

        res.json({
            success: true,
            data: {
                _id: c.case_id,
                name: c.title,
                description: c.description,
                chain: c.chain,
                case_id: c.case_id,
                nodes: graph.nodes || [],
                edges: graph.edges || [],
                viewport: graph.viewport || { x:0, y:0, zoom:1 }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Save canvas state
router.post('/save', async (req, res) => {
    try {
        const { id, nodes, edges, viewport } = req.body;
        
        // Push directly to Postgres
        const graphDataJSON = JSON.stringify({ nodes, edges, viewport });
        await pool.query(
            'UPDATE cases SET graph_data=$1, updated_at=CURRENT_TIMESTAMP WHERE case_id=$2 returning *',
            [graphDataJSON, id]
        );
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete canvas (Deletes the case)
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM evidence_files WHERE case_id=$1', [req.params.id]);
        await pool.query('DELETE FROM cases WHERE case_id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
