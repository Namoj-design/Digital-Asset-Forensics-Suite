import pool from '../config/db.js';
import { log } from '../utils/logger.js';
import { createTransaction } from '../services/transactionService.js';

const CHAIN = 'ethereum';

const ADDR = {
  a: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  b: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  c: '0xcccccccccccccccccccccccccccccccccccccccc',
  d: '0xdddddddddddddddddddddddddddddddddddddddd',
  e: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
};

const TXS = [
  ['0xtx0000000000000000000000000000000000000000000000000000000000000001', ADDR.a, ADDR.b, '1.5'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000002', ADDR.b, ADDR.c, '0.25'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000003', ADDR.c, ADDR.d, '3'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000004', ADDR.d, ADDR.e, '0.1'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000005', ADDR.e, ADDR.a, '2'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000006', ADDR.a, ADDR.c, '0.75'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000007', ADDR.b, ADDR.d, '1.1'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000008', ADDR.c, ADDR.e, '4.2'],
  ['0xtx0000000000000000000000000000000000000000000000000000000000000009', ADDR.d, ADDR.a, '0.05'],
  ['0xtx000000000000000000000000000000000000000000000000000000000000000a', ADDR.e, ADDR.b, '8'],
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `TRUNCATE evidence, transactions, addresses, cases, users RESTART IDENTITY CASCADE`
    );

    const u1 = await client.query(
      `INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING id`,
      ['Alice Chen', 'investigator@dafs.local', 'investigator']
    );
    const u2 = await client.query(
      `INSERT INTO users (name, email, role) VALUES ($1, $2, $3) RETURNING id`,
      ['Bob Okonkwo', 'lead@dafs.local', 'lead_investigator']
    );
    const id1 = u1.rows[0].id;
    const id2 = u2.rows[0].id;

    await client.query(
      `INSERT INTO cases (title, description, chain, status, created_by) VALUES
       ($1, $2, $3, $4, $5),
       ($6, $7, $8, $9, $10)`,
      [
        'Exchange drain follow-up',
        'Trace outbound flows from hot wallet cluster.',
        CHAIN,
        'open',
        id1,
        'Stablecoin mixer pattern',
        'Cross-venue hops and peel chains.',
        CHAIN,
        'in_review',
        id2,
      ]
    );

    await client.query('COMMIT');
    log.info('Seed: users and cases inserted');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  const base = new Date('2024-01-15T12:00:00Z').getTime();
  for (let i = 0; i < TXS.length; i++) {
    const [hash, from, to, value] = TXS[i];
    await createTransaction({
      tx_hash: hash,
      from_address: from,
      to_address: to,
      value,
      timestamp: new Date(base + i * 60_000).toISOString(),
      chain: CHAIN,
    });
  }

  log.info('Seed: 10 transactions inserted (5 addresses auto-created, risk scores updated)');
  await pool.end();
}

seed().catch((e) => {
  log.error('Seed failed', { message: e.message, stack: e.stack });
  process.exit(1);
});
