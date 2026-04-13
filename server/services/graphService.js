import { query } from '../config/db.js';
import { HttpError } from '../middlewares/errorHandler.js';

/**
 * Build graph for an address: unique wallet nodes with risk_score from DB;
 * edges from transactions involving the seed address.
 */
export async function buildGraphForAddress(address, chain = null) {
  const a = address?.trim();
  if (!a) throw new HttpError(400, 'address is required');

  const params = [a];
  let txFilter = `WHERE (from_address = $1 OR to_address = $1)`;
  if (chain) {
    txFilter += ` AND chain = $2`;
    params.push(chain.trim());
  }

  const txs = await query(`SELECT * FROM transactions ${txFilter} ORDER BY timestamp ASC`, params);

  if (txs.rows.length === 0) {
    const addrRes = await query(
      chain
        ? `SELECT * FROM addresses WHERE address = $1 AND chain = $2`
        : `SELECT * FROM addresses WHERE address = $1 ORDER BY id LIMIT 1`,
      chain ? [a, chain.trim()] : [a]
    );
    const r = addrRes.rows[0];
    const nodes = [
      {
        id: a,
        label: 'wallet',
        risk_score: r ? r.risk_score : 0,
      },
    ];
    return { nodes, edges: [] };
  }

  const chainsInTx = [...new Set(txs.rows.map((t) => t.chain))];
  let effectiveChain = chain?.trim() || null;
  if (!effectiveChain) {
    if (chainsInTx.length > 1) {
      throw new HttpError(
        400,
        'Transactions span multiple chains; pass ?chain= to narrow the graph'
      );
    }
    effectiveChain = chainsInTx[0];
  }

  const addressSet = new Set();
  for (const t of txs.rows) {
    if (t.chain !== effectiveChain) continue;
    addressSet.add(t.from_address);
    addressSet.add(t.to_address);
  }

  const list = [...addressSet];
  const placeholders = list.map((_, i) => `$${i + 1}`).join(', ');
  const addrRes = await query(
    `SELECT address, chain, risk_score FROM addresses
     WHERE chain = $${list.length + 1} AND address IN (${placeholders})`,
    [...list, effectiveChain]
  );
  const riskByAddr = new Map(addrRes.rows.map((r) => [r.address, r.risk_score]));

  const nodes = list.map((addr) => ({
    id: addr,
    label: 'wallet',
    risk_score: riskByAddr.get(addr) ?? 0,
  }));

  const edges = txs.rows
    .filter((t) => t.chain === effectiveChain)
    .map((t) => ({
      from: t.from_address,
      to: t.to_address,
      value: t.value,
      tx_hash: t.tx_hash,
    }));

  return { nodes, edges };
}
