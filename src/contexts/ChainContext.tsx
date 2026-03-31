import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ChainId = "ethereum" | "polygon" | "bnb" | "arbitrum" | "optimism" | "base" | "avalanche";

export const CHAIN_CONFIG: Record<ChainId, { name: string; symbol: string; icon: string; scanId: number }> = {
  ethereum: { name: "Ethereum", symbol: "ETH", icon: "ethereum", scanId: 1 },
  polygon: { name: "Polygon", symbol: "POL", icon: "polygon", scanId: 137 },
  bnb: { name: "BNB Chain", symbol: "BNB", icon: "bnb", scanId: 56 },
  arbitrum: { name: "Arbitrum", symbol: "ETH", icon: "arbitrum", scanId: 42161 },
  optimism: { name: "Optimism", symbol: "ETH", icon: "optimism", scanId: 10 },
  base: { name: "Base", symbol: "ETH", icon: "base", scanId: 8453 },
  avalanche: { name: "Avalanche", symbol: "AVAX", icon: "avalanche", scanId: 43114 },
};

interface ChainContextType {
  selectedChain: ChainId;
  setSelectedChain: (chain: ChainId) => void;
  chainConfig: typeof CHAIN_CONFIG[ChainId];
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export function ChainProvider({ children }: { children: ReactNode }) {
  const [selectedChain, setSelectedChainState] = useState<ChainId>(() => {
    const saved = localStorage.getItem("dafs_chain") as ChainId;
    return saved && CHAIN_CONFIG[saved] ? saved : "ethereum";
  });

  const setSelectedChain = (chain: ChainId) => {
    setSelectedChainState(chain);
    localStorage.setItem("dafs_chain", chain);
  };

  return (
    <ChainContext.Provider value={{ selectedChain, setSelectedChain, chainConfig: CHAIN_CONFIG[selectedChain] }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error("useChain must be used within a ChainProvider");
  }
  return context;
}
