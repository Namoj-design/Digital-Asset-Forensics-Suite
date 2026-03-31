import express from 'express';
import axios from 'axios';

const router = express.Router();

// Step 2 - NODE EXPRESS BRIDGE
router.post("/analyze", async (req, res) => {
    try {
        const { wallet, chain, depth } = req.body;
        
        if (!wallet || !chain) {
            return res.status(400).json({ error: "wallet and chain are required for AI analysis" });
        }
        
        // Forward to Python ML Microservice
        const response = await axios.post("http://localhost:8000/analyze", {
            wallet,
            chain,
            depth: depth || 2
        }, {
            timeout: 10000 // 10s timeout
        });
        
        res.json(response.data);
    } catch (err) {
        console.error("ML service bridge error:", err.message);
        res.status(500).json({ error: "ML service unavailable" });
    }
});

export default router;
