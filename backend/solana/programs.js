/**
 * Solana Programs Directory
 * Maps well-known program addresses to semantic labels.
 */
export const SOLANA_PROGRAMS = {
    // Standard Programs
    '11111111111111111111111111111111': 'SYSTEM_PROGRAM',
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'SPL_TOKEN_PROGRAM',
    'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'SPL_TOKEN_2022_PROGRAM',
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'ASSOCIATED_TOKEN_PROGRAM',
    
    // Core DeFi / DEX Programs & Aggregators
    'JUP6LkbZbjS1jKKwapdH67fpx5mN173ccY8N5L6FqZq': 'JUPITER_AGGREGATOR_V6',
    'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2dicPQpX22G7t2pC': 'JUPITER_AGGREGATOR_V4',
    'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': 'RAYDIUM_CPMM',
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'RAYDIUM_AMM_V4',
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'ORCA_WHIRLPOOLS',
    'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89k1KexbZ1a': 'PHOENIX_V1',
    'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebzfac': 'MANGO_MARKETS_V3',
    
    // Cross-Chain Bridges
    'wormDTUJ6AWPNvk59vGQbDvGJmqbDTm9y46WD2xGz': 'WORMHOLE_BRIDGE',
    
    // Token Meta
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'METAPLEX_TOKEN_METADATA',
};

/**
 * Known hot wallets, centralized exchange wallets, and OFAC entities.
 */
export const KNOWN_ENTITIES = {
    '5Q544fKrFoe6tsEbD7S5R9E5A8W4DDEd4BEdzYrdP3cE': { name: 'Binance Cold Wallet', riskScore: 10, type: 'Exchange' },
    '9WzDXwBbmc2G2X5d5K5G7H6B5YQf5R6c5J8E9YcC': { name: 'FTX Drainer', riskScore: 100, type: 'Hacker' },
    // Add additional entities dynamically or from DB
};
