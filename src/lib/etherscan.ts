import axios from "axios";

const ETHERSCAN_API_KEY = "M2NDTWURCC9V6DY6MJKEYPDUPARBGA36BT";
const BASE_URL = "https://api.etherscan.io/v2/api";

export type ChainId = 1 | 137 | 56 | 42161 | 10 | 8453 | 43114;

export const CHAINS: Record<ChainId, { name: string; symbol: string; decimals: number }> = {
  1: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  137: { name: "Polygon", symbol: "POL", decimals: 18 },
  56: { name: "BNB Chain", symbol: "BNB", decimals: 18 },
  42161: { name: "Arbitrum", symbol: "ETH", decimals: 18 },
  10: { name: "Optimism", symbol: "ETH", decimals: 18 },
  8453: { name: "Base", symbol: "ETH", decimals: 18 },
  43114: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
};

const etherscanApi = axios.create({ baseURL: BASE_URL });

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

async function query<T>(params: Record<string, string | number>): Promise<T> {
  const { data } = await etherscanApi.get<EtherscanResponse<T>>("", {
    params: { ...params, apikey: ETHERSCAN_API_KEY },
  });
  if (data.status === "0" && data.message === "NOTOK") {
    throw new Error(typeof data.result === "string" ? data.result : "Etherscan API error");
  }
  return data.result;
}

// ──── Account APIs ────

export interface EthTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  isError: string;
  functionName: string;
  contractAddress: string;
  confirmations: string;
  methodId: string;
  input: string;
}

export interface TokenTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  contractAddress: string;
  gasUsed: string;
  gasPrice: string;
  confirmations: string;
}

export const etherscan = {
  // Get native balance
  getBalance: (address: string, chainId: ChainId = 1) =>
    query<string>({ chainid: chainId, module: "account", action: "balance", address, tag: "latest" }),

  // Get multiple balances
  getBalanceMulti: (addresses: string[], chainId: ChainId = 1) =>
    query<Array<{ account: string; balance: string }>>({
      chainid: chainId, module: "account", action: "balancemulti",
      address: addresses.join(","), tag: "latest",
    }),

  // Get normal transactions
  getTxList: (address: string, chainId: ChainId = 1, page = 1, offset = 50, sort: "asc" | "desc" = "desc") =>
    query<EthTx[]>({ chainid: chainId, module: "account", action: "txlist", address, startblock: 0, endblock: 99999999, page, offset, sort }),

  // Get ERC-20 token transfers
  getTokenTx: (address: string, chainId: ChainId = 1, page = 1, offset = 50, sort: "asc" | "desc" = "desc") =>
    query<TokenTx[]>({ chainid: chainId, module: "account", action: "tokentx", address, startblock: 0, endblock: 99999999, page, offset, sort }),

  // Get internal transactions
  getInternalTx: (address: string, chainId: ChainId = 1, page = 1, offset = 50) =>
    query<EthTx[]>({ chainid: chainId, module: "account", action: "txlistinternal", address, startblock: 0, endblock: 99999999, page, offset, sort: "desc" }),

  // Get transaction by hash (proxy)
  getTxByHash: (txHash: string, chainId: ChainId = 1) =>
    query<{
      hash: string;
      blockNumber: string;
      from: string;
      to: string;
      value: string;
      gas: string;
      gasPrice: string;
      input: string;
      nonce: string;
      transactionIndex: string;
    }>({ chainid: chainId, module: "proxy", action: "eth_getTransactionByHash", txhash: txHash }),

  // Get transaction receipt
  getTxReceipt: (txHash: string, chainId: ChainId = 1) =>
    query<{
      status: string;
      gasUsed: string;
      logs: Array<{ address: string; topics: string[]; data: string }>;
      blockNumber: string;
      transactionHash: string;
    }>({ chainid: chainId, module: "proxy", action: "eth_getTransactionReceipt", txhash: txHash }),

  // Get block number
  getBlockNumber: (chainId: ChainId = 1) =>
    query<string>({ chainid: chainId, module: "proxy", action: "eth_blockNumber" }),

  // Get contract ABI (useful for contract detection)
  getContractABI: (address: string, chainId: ChainId = 1) =>
    query<string>({ chainid: chainId, module: "contract", action: "getabi", address }),

  // Check if contract
  getSourceCode: (address: string, chainId: ChainId = 1) =>
    query<Array<{ ContractName: string; CompilerVersion: string; ABI: string }>>({
      chainid: chainId, module: "contract", action: "getsourcecode", address,
    }),
};

// ──── Helpers ────

export function weiToEth(wei: string, decimals = 18): number {
  return Number(wei) / Math.pow(10, decimals);
}

export function shortenAddress(addr: string, chars = 6): string {
  if (!addr) return "";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function hexToNumber(hex: string): number {
  return parseInt(hex, 16);
}

export function formatTimestamp(ts: string): string {
  const date = new Date(Number(ts) * 1000);
  return date.toLocaleString();
}
