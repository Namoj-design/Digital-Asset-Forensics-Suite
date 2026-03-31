import { useQuery } from "@tanstack/react-query";
import { etherscan, ChainId, weiToEth, EthTx, TokenTx } from "@/lib/etherscan";

export function useWalletBalance(address: string | undefined, chainId: ChainId = 137) {
  return useQuery({
    queryKey: ["wallet-balance", address, chainId],
    queryFn: () => etherscan.getBalance(address!, chainId),
    enabled: !!address && address.length === 42,
    staleTime: 30_000,
  });
}

export function useWalletTxList(address: string | undefined, chainId: ChainId = 137, page = 1, offset = 50) {
  return useQuery({
    queryKey: ["wallet-txlist", address, chainId, page, offset],
    queryFn: () => etherscan.getTxList(address!, chainId, page, offset),
    enabled: !!address && address.length === 42,
    staleTime: 30_000,
  });
}

export function useWalletTokenTx(address: string | undefined, chainId: ChainId = 137, page = 1, offset = 50) {
  return useQuery({
    queryKey: ["wallet-tokentx", address, chainId, page, offset],
    queryFn: () => etherscan.getTokenTx(address!, chainId, page, offset),
    enabled: !!address && address.length === 42,
    staleTime: 30_000,
  });
}

export function useTransactionByHash(txHash: string | undefined, chainId: ChainId = 137) {
  return useQuery({
    queryKey: ["tx-by-hash", txHash, chainId],
    queryFn: () => etherscan.getTxByHash(txHash!, chainId),
    enabled: !!txHash && txHash.length === 66,
    staleTime: 60_000,
  });
}

export function useTransactionReceipt(txHash: string | undefined, chainId: ChainId = 137) {
  return useQuery({
    queryKey: ["tx-receipt", txHash, chainId],
    queryFn: () => etherscan.getTxReceipt(txHash!, chainId),
    enabled: !!txHash && txHash.length === 66,
    staleTime: 60_000,
  });
}

// Compute wallet summary from transactions
export function useWalletSummary(address: string | undefined, chainId: ChainId = 137) {
  const balance = useWalletBalance(address, chainId);
  const txList = useWalletTxList(address, chainId, 1, 100);
  const tokenTxList = useWalletTokenTx(address, chainId, 1, 100);

  const summary = (() => {
    if (!address || !txList.data) return null;

    const txs = Array.isArray(txList.data) ? txList.data : [];
    const tokenTxs = Array.isArray(tokenTxList.data) ? tokenTxList.data : [];

    let totalVolumeWei = BigInt(0);
    let incomingCount = 0;
    let outgoingCount = 0;
    const counterparties = new Set<string>();
    let firstSeen = Infinity;
    let lastSeen = 0;

    const lowerAddr = address.toLowerCase();

    txs.forEach((tx: EthTx) => {
      totalVolumeWei += BigInt(tx.value || "0");
      const ts = Number(tx.timeStamp);
      if (ts < firstSeen) firstSeen = ts;
      if (ts > lastSeen) lastSeen = ts;
      if (tx.from.toLowerCase() === lowerAddr) {
        outgoingCount++;
        if (tx.to) counterparties.add(tx.to.toLowerCase());
      } else {
        incomingCount++;
        counterparties.add(tx.from.toLowerCase());
      }
    });

    tokenTxs.forEach((tx: TokenTx) => {
      const ts = Number(tx.timeStamp);
      if (ts < firstSeen) firstSeen = ts;
      if (ts > lastSeen) lastSeen = ts;
    });

    const balanceEth = balance.data ? weiToEth(balance.data) : 0;

    return {
      address,
      totalVolume: weiToEth(totalVolumeWei.toString()),
      totalTransfers: txs.length + tokenTxs.length,
      incomingCount,
      outgoingCount,
      currentBalance: balanceEth,
      uniqueCounterparties: counterparties.size,
      firstSeen: firstSeen === Infinity ? null : new Date(firstSeen * 1000).toISOString(),
      lastSeen: lastSeen === 0 ? null : new Date(lastSeen * 1000).toISOString(),
    };
  })();

  return {
    data: summary,
    isLoading: balance.isLoading || txList.isLoading,
    isError: balance.isError || txList.isError,
    error: balance.error || txList.error,
  };
}

// Build graph data from transactions
export interface LiveGraphNode {
  id: string;
  address: string;
  label: string;
  volume: number;
  txCount: number;
  type: "center" | "counterparty";
}

export interface LiveGraphEdge {
  source: string;
  target: string;
  transfers: number;
  volume: number;
}

export function useWalletGraph(address: string | undefined, chainId: ChainId = 137) {
  const txList = useWalletTxList(address, chainId, 1, 100);

  const graph = (() => {
    if (!address || !txList.data || !Array.isArray(txList.data)) return null;

    const lowerAddr = address.toLowerCase();
    const counterpartyMap = new Map<string, { volume: number; txCount: number; direction: "in" | "out" | "both" }>();

    txList.data.forEach((tx: EthTx) => {
      const isOutgoing = tx.from.toLowerCase() === lowerAddr;
      const cp = isOutgoing ? (tx.to || "").toLowerCase() : tx.from.toLowerCase();
      if (!cp) return;

      const existing = counterpartyMap.get(cp) || { volume: 0, txCount: 0, direction: isOutgoing ? "out" : "in" as "in" | "out" | "both" };
      existing.volume += weiToEth(tx.value);
      existing.txCount++;
      if ((isOutgoing && existing.direction === "in") || (!isOutgoing && existing.direction === "out")) {
        existing.direction = "both";
      }
      counterpartyMap.set(cp, existing);
    });

    // Top 15 counterparties by volume
    const sorted = [...counterpartyMap.entries()]
      .sort((a, b) => b[1].volume - a[1].volume)
      .slice(0, 15);

    const nodes: LiveGraphNode[] = [
      { id: "center", address, label: `${address.slice(0, 6)}...${address.slice(-4)}`, volume: 0, txCount: txList.data.length, type: "center" },
    ];
    const edges: LiveGraphEdge[] = [];

    sorted.forEach(([cpAddr, data], i) => {
      const nodeId = `cp_${i}`;
      nodes.push({
        id: nodeId,
        address: cpAddr,
        label: `${cpAddr.slice(0, 6)}...${cpAddr.slice(-4)}`,
        volume: data.volume,
        txCount: data.txCount,
        type: "counterparty",
      });
      edges.push({
        source: "center",
        target: nodeId,
        transfers: data.txCount,
        volume: data.volume,
      });
    });

    return { nodes, edges };
  })();

  return {
    data: graph,
    isLoading: txList.isLoading,
    isError: txList.isError,
  };
}
