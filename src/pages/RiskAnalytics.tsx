import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/common/CopyButton";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { AlertTriangle, TrendingUp, Link2, Search, Plus, BarChart3, Trash2, Loader2, Radio } from "lucide-react";
import { monitorApi } from "@/lib/api";
import { useChain } from "@/contexts/ChainContext";

interface MonitoredWallet {
  monitor_id: string;
  address: string;
  chain: string;
  transfers: number;
  volume: number;
  counterparties: number;
  last_active: string;
  created_at: string;
}

const RiskAnalytics = () => {
  const [wallets, setWallets] = useState<MonitoredWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newAddr, setNewAddr] = useState("");
  const { selectedChain } = useChain();

  const fetchWallets = useCallback(async () => {
    try {
      const res = await monitorApi.list();
      setWallets(res.data || []);
    } catch (err) {
      console.error("Failed to fetch monitored wallets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
    // Auto-refresh every 30s
    const interval = setInterval(fetchWallets, 30000);
    return () => clearInterval(interval);
  }, [fetchWallets]);

  const addWallet = async () => {
    const trimmed = newAddr.trim();
    if (!trimmed || !/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return;
    setAdding(true);
    try {
      await monitorApi.add(trimmed, selectedChain);
      setNewAddr("");
      await fetchWallets();
    } catch (err) {
      console.error("Failed to add wallet:", err);
    } finally {
      setAdding(false);
    }
  };

  const removeWallet = async (monitorId: string) => {
    try {
      await monitorApi.remove(monitorId);
      setWallets(prev => prev.filter(w => w.monitor_id !== monitorId));
    } catch (err) {
      console.error("Failed to remove wallet:", err);
    }
  };

  const shortenAddr = (addr: string) => addr ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}` : "—";

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Risk Analytics</h2>
          <p className="text-[10px] text-muted-foreground font-mono">Real-time wallet monitoring · Live alerts</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-primary animate-pulse" />
          <span className="text-[9px] text-primary font-mono tracking-widest uppercase">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="stat-card corner-brackets flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-hud-red" />
          <div><p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Monitored Wallets</p><p className="text-lg font-bold font-mono">{wallets.length}</p></div>
        </div>
        <div className="stat-card corner-brackets flex items-center gap-3">
          <TrendingUp className="h-4 w-4 text-hud-amber" />
          <div><p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Total Transfers</p><p className="text-lg font-bold font-mono">{wallets.reduce((s, w) => s + (w.transfers || 0), 0)}</p></div>
        </div>
        <div className="stat-card corner-brackets flex items-center gap-3">
          <Link2 className="h-4 w-4 text-primary" />
          <div><p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Source</p><p className="text-lg font-bold font-mono">10+ Explorers</p></div>
        </div>
      </div>

      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Enter wallet address (0x...)" className="pl-8 font-mono text-[10px] h-8 bg-background border-border" value={newAddr} onChange={e => setNewAddr(e.target.value)} onKeyDown={e => e.key === "Enter" && addWallet()} />
        </div>
        <button type="button" onClick={addWallet} disabled={adding} className="h-8 text-[10px] px-4 font-mono uppercase tracking-wider bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition-colors rounded flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          <span>Add</span>
        </button>
      </div>

      <div className="forensic-panel">
        <div className="p-2.5 border-b border-border">
          <h3 className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-foreground">Monitored Wallets — Live Intelligence</h3>
        </div>

        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-[10px] font-mono text-muted-foreground">Loading monitored wallets...</span>
          </div>
        ) : wallets.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-[10px] font-mono text-muted-foreground">No wallets being monitored</p>
            <p className="text-[9px] font-mono text-muted-foreground/60 mt-1">Add a wallet address above to start real-time monitoring</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[9px] font-mono tracking-widest uppercase">Address</TableHead>
                <TableHead className="text-[9px] font-mono tracking-widest uppercase">Chain</TableHead>
                <TableHead className="text-[9px] font-mono tracking-widest uppercase">Transfers</TableHead>
                <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right">Volume</TableHead>
                <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right">Counterparties</TableHead>
                <TableHead className="text-[9px] font-mono tracking-widest uppercase">Last Active</TableHead>
                <TableHead className="text-[9px] font-mono tracking-widest uppercase w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wallets.map(w => (
                <TableRow key={w.monitor_id} className="border-border hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <span className="font-mono text-[10px] text-primary">{shortenAddr(w.address)}</span>
                      <CopyButton text={w.address} size="xs" />
                    </span>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono capitalize">{w.chain || "multi"}</TableCell>
                  <TableCell className="text-[11px] font-mono">{w.transfers}</TableCell>
                  <TableCell className="text-right text-[11px] font-mono">{(w.volume || 0).toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono text-[11px]">{w.counterparties}</TableCell>
                  <TableCell className="text-[10px] text-muted-foreground font-mono">
                    {w.last_active ? new Date(w.last_active).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <button onClick={() => removeWallet(w.monitor_id)} className="text-muted-foreground hover:text-hud-red transition-colors" title="Remove">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default RiskAnalytics;
