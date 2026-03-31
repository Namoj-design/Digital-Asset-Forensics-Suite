import { useState } from "react";
import { Search, TrendingUp, AlertTriangle, ArrowRightLeft, Bell, Wallet, Activity, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletSummary, useWalletTxList } from "@/hooks/useEtherscan";
import { shortenAddress, weiToEth, formatTimestamp } from "@/lib/etherscan";
import { CopyButton } from "@/components/common/CopyButton";
import { useNavigate } from "react-router-dom";
import { useChain, CHAIN_CONFIG, ChainId } from "@/contexts/ChainContext";

// Well-known high-activity addresses per chain for the dashboard demo feed
const DEMO_WALLETS: Record<ChainId, string> = {
  ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",   // USDT contract
  polygon: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",   // WMATIC contract
  bnb: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",   // WBNB contract
  arbitrum: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",   // USDT on Arbitrum
  optimism: "0x4200000000000000000000000000000000000006",     // WETH on Optimism
  base: "0x4200000000000000000000000000000000000006",     // WETH on Base
  avalanche: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",   // WAVAX contract
};

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { selectedChain, chainConfig } = useChain();
  const demoWallet = DEMO_WALLETS[selectedChain] || DEMO_WALLETS.ethereum;

  const summary = useWalletSummary(demoWallet, chainConfig.scanId as any);
  const txList = useWalletTxList(demoWallet, chainConfig.scanId as any, 1, 5);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (q.length === 42 && q.startsWith("0x")) {
      navigate(`/wallet-intelligence?address=${q}`);
    } else if (q.length === 66 && q.startsWith("0x")) {
      navigate(`/transaction-explorer?hash=${q}`);
    }
  };

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Command Dashboard</h2>
            <p className="text-[10px] text-muted-foreground font-mono">{chainConfig.name} Network // Live Intelligence Feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-80">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search wallet / tx hash..."
              className="pl-8 font-mono text-[11px] h-8 bg-background border-border"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="btn-tactical h-8 text-[10px] px-3">Trace</button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 bg-card" />)
        ) : summary.data ? (
          <>
            <StatCard label="Total Transfers" value={summary.data.totalTransfers.toLocaleString()} icon={ArrowRightLeft} accentClass="text-primary" />
            <StatCard label="Total Volume" value={`${summary.data.totalVolume.toFixed(2)} ${chainConfig.symbol}`} icon={TrendingUp} accentClass="text-hud-amber" />
            <StatCard label="Counterparties" value={summary.data.uniqueCounterparties.toLocaleString()} icon={AlertTriangle} accentClass="text-hud-red" />
            <StatCard label="Balance" value={`${summary.data.currentBalance.toFixed(4)} ${chainConfig.symbol}`} icon={Wallet} accentClass="text-primary" />
          </>
        ) : (
          <div className="col-span-4 text-center text-muted-foreground py-8 text-xs font-mono">Unable to load intel</div>
        )}
      </div>

      {/* Recent activity */}
      <div className="forensic-panel">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary animate-pulse-glow" />
          <h3 className="text-[10px] font-bold text-foreground tracking-[0.15em] uppercase">Live Activity Feed — {chainConfig.name}</h3>
        </div>
        <div className="p-3 space-y-1.5">
          {txList.isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 bg-muted" />)
          ) : Array.isArray(txList.data) ? (
            txList.data.map(tx => (
              <div key={tx.hash} className="flex items-start gap-3 text-xs p-2.5 border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-primary">{shortenAddress(tx.hash, 10)}</span>
                    <CopyButton text={tx.hash} size="xs" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                    {shortenAddress(tx.from)} → {shortenAddress(tx.to)} · {weiToEth(tx.value).toFixed(4)} {chainConfig.symbol}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">{formatTimestamp(tx.timeStamp)}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4 text-xs font-mono">No activity detected</p>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, accentClass }: { label: string; value: string; icon: any; accentClass: string }) => (
  <div className="stat-card corner-brackets">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase">{label}</span>
      <Icon className={`h-3.5 w-3.5 ${accentClass}`} />
    </div>
    <p className="text-lg font-bold text-foreground font-mono">{value}</p>
  </div>
);

export default Dashboard;
