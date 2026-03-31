import pg from 'pg';
import dotenv from 'dotenv';
import { initializeInvestigation } from './investigationEngine.js';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost:5432/dafs_mvp'
});

async function rebuild() {
    try {
        const { rows } = await pool.query('SELECT case_id, chain, target_wallet FROM cases');
        console.log(`Found ${rows.length} cases to rebuild in the database.`);

        for (const c of rows) {
            console.log(`\nRebuilding Intelligence Graph for Case: ${c.case_id} (${c.target_wallet} on ${c.chain})`);

            try {
                const updatedGraph = await initializeInvestigation(c.case_id, {
                    targetWallet: c.target_wallet,
                    chain: c.chain,
                    riskThreshold: 75,
                    maxDepth: 2
                });

                await pool.query(
                    'UPDATE cases SET graph_data=$1 WHERE case_id=$2',
                    [JSON.stringify(updatedGraph), c.case_id]
                );
                console.log(`✅ Successfully stored depth-2 graph data for ${c.case_id}. Nodes: ${updatedGraph.graph.nodes.length}, Edges: ${updatedGraph.graph.edges.length}`);
            } catch (err) {
                console.error(`❌ Failed to process case graph ${c.case_id}:`, err.message);
            }
        }
    } catch (e) {
        console.error("Database connection error:", e);
    } finally {
        await pool.end();
        console.log("\nRebuild complete.");
        process.exit(0);
    }
}

rebuild();
