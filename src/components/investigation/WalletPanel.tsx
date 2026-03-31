import { WalletAddress } from "@/components/common/WalletAddress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletSummary, useWalletTxList } from "@/hooks/useEtherscan";
import { weiToEth, shortenAddress, CHAINS, ChainId } from "@/lib/etherscan";

interface WalletPanelProps {
  address?: string;
  chainId?: ChainId;
}

export const WalletPanel = ({ address = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", chainId = 137 }: WalletPanelProps) => {
  const summary = useWalletSummary(address, chainId);
  const txList = useWalletTxList(address, chainId, 1, 20);

  const chain = CHAINS[chainId];
  const lowerAddr = address.toLowerCase();

  const incomingTxs = Array.isArray(txList.data) ? txList.data.filter(tx => tx.to.toLowerCase() === lowerAddr).slice(0, 5) : [];
  const outgoingTxs = Array.isArray(txList.data) ? txList.data.filter(tx => tx.from.toLowerCase() === lowerAddr).slice(0, 5) : [];

  return (
    <div className="w-72 border-r border-border bg-card/50 overflow-y-auto shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 border border-primary/30 flex items-center justify-center bg-primary/5">
            <Target className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-muted-foreground font-mono tracking-widest uppercase">Target Address</p>
            <WalletAddress address={address} />
          </div>
        </div>
        <span className="text-[9px] font-mono text-primary/70 tracking-widest uppercase border border-primary/20 px-1.5 py-0.5">{chain.name}</span>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-8 px-3">
          <TabsTrigger value="overview" className="text-[10px] font-mono tracking-wider uppercase data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Overview</TabsTrigger>
          <TabsTrigger value="transfers" className="text-[10px] font-mono tracking-wider uppercase data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="p-3 space-y-3 mt-0">
          {summary.isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />)}
            </div>
          ) : summary.data ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Volume" value={`${summary.data.totalVolume.toFixed(2)} ${chain.symbol}`} />
                <Stat label="Transfers" value={summary.data.totalTransfers.toString()} />
                <Stat label="Balance" value={`${summary.data.currentBalance.toFixed(4)} ${chain.symbol}`} />
                <Stat label="Counterparties" value={summary.data.uniqueCounterparties.toString()} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {summary.data.firstSeen && (
                  <div>
                    <p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">First Seen</p>
                    <p className="text-[11px] font-mono text-foreground">{new Date(summary.data.firstSeen).toLocaleDateString()}</p>
                  </div>
                )}
                {summary.data.lastSeen && (
                  <div>
                    <p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Last Seen</p>
                    <p className="text-[11px] font-mono text-foreground">{new Date(summary.data.lastSeen).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground font-mono">No data available</p>
          )}
        </TabsContent>

        <TabsContent value="transfers" className="p-3 space-y-3 mt-0">
          {txList.isLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-7 w-full bg-muted" />)}
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-[9px] font-mono tracking-wider uppercase flex items-center gap-1 text-status-closed"><ArrowDownLeft className="h-3 w-3" /> Incoming ({incomingTxs.length})</p>
                {incomingTxs.map(tx => (
                  <div key={tx.hash} className="text-[10px] p-2 bg-muted/30 border border-border flex justify-between font-mono">
                    <span className="text-muted-foreground">{shortenAddress(tx.from)}</span>
                    <span className="text-foreground">{weiToEth(tx.value).toFixed(4)} {chain.symbol}</span>
                  </div>
                ))}
                {incomingTxs.length === 0 && <p className="text-[10px] text-muted-foreground font-mono">No incoming transfers</p>}
              </div>
              <div className="space-y-1.5">
                <p className="text-[9px] font-mono tracking-wider uppercase flex items-center gap-1 text-hud-red"><ArrowUpRight className="h-3 w-3" /> Outgoing ({outgoingTxs.length})</p>
                {outgoingTxs.map(tx => (
                  <div key={tx.hash} className="text-[10px] p-2 bg-muted/30 border border-border flex justify-between font-mono">
                    <span className="text-muted-foreground">{shortenAddress(tx.to)}</span>
                    <span className="text-foreground">{weiToEth(tx.value).toFixed(4)} {chain.symbol}</span>
                  </div>
                ))}
                {outgoingTxs.length === 0 && <p className="text-[10px] text-muted-foreground font-mono">No outgoing transfers</p>}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">{label}</p>
    <p className="text-[11px] font-bold text-foreground font-mono">{value}</p>
  </div>
);
