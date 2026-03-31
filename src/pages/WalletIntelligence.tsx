import { useState } from "react";
import { Search, Wallet, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WalletAddress } from "@/components/common/WalletAddress";
import { CopyButton } from "@/components/common/CopyButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletSummary, useWalletTxList } from "@/hooks/useEtherscan";
import { weiToEth, shortenAddress, formatTimestamp } from "@/lib/etherscan";
import { useChain } from "@/contexts/ChainContext";

const WalletIntelligence = () => {
  const [input, setInput] = useState("");
  const [address, setAddress] = useState<string | undefined>();
  const { chainConfig } = useChain();

  const summary = useWalletSummary(address, chainConfig.scanId as any);
  const txList = useWalletTxList(address, chainConfig.scanId as any, 1, 20);

  const handleSearch = () => {
    const trimmed = input.trim();
    if (trimmed.length === 42 && trimmed.startsWith("0x")) {
      setAddress(trimmed);
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <Wallet className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Wallet Intelligence</h2>
          <p className="text-[10px] text-muted-foreground font-mono">Search and analyze any blockchain address</p>
        </div>
      </div>

      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Enter wallet address (0x...)"
            className="pl-8 font-mono text-[10px] h-8 bg-background border-border"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
        </div>
        <button onClick={handleSearch} className="btn-tactical h-8 text-[10px] px-4">Analyze</button>
      </div>

      {summary.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full bg-card" />
          <Skeleton className="h-60 w-full bg-card" />
        </div>
      )}

      {summary.isError && (
        <div className="forensic-panel p-4 text-center text-hud-red text-[11px] font-mono">
          Failed to fetch wallet data. Check address and retry.
        </div>
      )}

      {summary.data && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="forensic-panel corner-brackets">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <WalletAddress address={summary.data.address} />
              <span className="text-[9px] font-mono text-primary/70 tracking-widest uppercase border border-primary/20 px-1.5 py-0.5 ml-2">{chainConfig.name}</span>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <IntelStat label="Total Volume" value={`${summary.data.totalVolume.toFixed(4)} ${chainConfig.symbol}`} />
                <IntelStat label="Total Transfers" value={summary.data.totalTransfers.toString()} />
                <IntelStat label="Balance" value={`${summary.data.currentBalance.toFixed(4)} ${chainConfig.symbol}`} />
                <IntelStat label="Counterparties" value={summary.data.uniqueCounterparties.toString()} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <IntelStat label="Incoming" value={summary.data.incomingCount.toString()} />
                <IntelStat label="Outgoing" value={summary.data.outgoingCount.toString()} />
                {summary.data.firstSeen && <IntelStat label="First Seen" value={new Date(summary.data.firstSeen).toLocaleDateString()} />}
                {summary.data.lastSeen && <IntelStat label="Last Seen" value={new Date(summary.data.lastSeen).toLocaleDateString()} />}
              </div>
            </div>
          </div>

          {/* Tx table */}
          <div className="forensic-panel">
            <div className="p-2.5 border-b border-border">
              <h3 className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-foreground">Transaction History</h3>
            </div>
            {txList.isLoading ? (
              <div className="p-3 space-y-1.5">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[9px] font-mono tracking-widest uppercase">Hash</TableHead>
                    <TableHead className="text-[9px] font-mono tracking-widest uppercase">From</TableHead>
                    <TableHead className="text-[9px] font-mono tracking-widest uppercase">To</TableHead>
                    <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right">Value</TableHead>
                    <TableHead className="text-[9px] font-mono tracking-widest uppercase">Time</TableHead>
                    <TableHead className="text-[9px] font-mono tracking-widest uppercase">Block</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(txList.data) && txList.data.map(tx => (
                    <TableRow key={tx.hash} className="border-border hover:bg-muted/20">
                      <TableCell>
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono text-[10px] text-primary">{shortenAddress(tx.hash, 8)}</span>
                          <CopyButton text={tx.hash} size="xs" />
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{shortenAddress(tx.from)}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{shortenAddress(tx.to)}</TableCell>
                      <TableCell className="text-right font-mono text-[10px]">{weiToEth(tx.value).toFixed(4)} {chainConfig.symbol}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">{formatTimestamp(tx.timeStamp)}</TableCell>
                      <TableCell className="text-[10px] font-mono text-muted-foreground">{tx.blockNumber}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {!address && !summary.isLoading && (
        <div className="text-center py-16">
          <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Enter target address to begin analysis</p>
        </div>
      )}
    </div>
  );
};

const IntelStat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">{label}</p>
    <p className="text-sm font-bold text-foreground font-mono">{value}</p>
  </div>
);

export default WalletIntelligence;
