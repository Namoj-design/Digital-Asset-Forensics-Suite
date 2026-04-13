import { useState } from "react";
import { Search, Shield, Activity, Hexagon, Zap, TrendingUp, AlertTriangle, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { solanaApi } from "@/lib/api";
import { CopyButton } from "@/components/common/CopyButton";

interface RiskData {
  address: string;
  score: number;
  flags: string[];
  confidence: number;
  model: string;
}

interface ProfileData {
  address: string;
  transactions_analyzed: number;
  total_sol_fees_paid: number;
  total_swaps_detected: number;
  associated_entities: number;
  programs_used: string[];
}

interface TxAction {
  type: string;
  from?: string;
  to?: string;
  amount?: number;
  token_symbol?: string;
  program?: string;
  details?: any;
}

interface TxAnalysis {
  chain: string;
  tx_hash: string;
  timestamp: string;
  status: string;
  fee_payer: string;
  fee_lamports: number;
  actions: TxAction[];
  entities_involved: string[];
  programs_invoked: string[];
  flagged_entities: any[];
}

const SolanaForensics = () => {
  const [walletAddress, setWalletAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [txAnalysis, setTxAnalysis] = useState<TxAnalysis | null>(null);
  const [error, setError] = useState("");

  const analyzeWallet = async () => {
    if (!walletAddress || walletAddress.length < 32) return;
    setLoading(true);
    setError("");
    setTxAnalysis(null);
    try {
      const [profileRes, riskRes] = await Promise.all([
        solanaApi.walletProfile(walletAddress),
        solanaApi.risk(walletAddress),
      ]);
      setProfileData(profileRes.data?.data || null);
      setRiskData(riskRes.data?.data || null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTransaction = async () => {
    if (!txHash || txHash.length < 64) return;
    setLoading(true);
    setError("");
    setProfileData(null);
    setRiskData(null);
    try {
      const res = await solanaApi.transactionAnalysis(txHash);
      setTxAnalysis(res.data?.data || null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (score: number) => {
    if (score >= 75) return "text-hud-red";
    if (score >= 40) return "text-hud-yellow";
    return "text-hud-blue";
  };

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Hexagon className="h-5 w-5 text-violet-400" />
        <div>
          <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Solana Forensics Engine</h2>
          <p className="text-[10px] text-muted-foreground font-mono">Instruction-Level Intelligence Pipeline // QuickNode RPC</p>
        </div>
      </div>

      {/* Dual Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Wallet Analyzer */}
        <div className="forensic-panel p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground">Wallet Profile & Risk</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Solana wallet address (base58)..."
              className="font-mono text-[11px] h-8 bg-background border-border flex-1"
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyzeWallet()}
            />
            <button onClick={analyzeWallet} className="btn-tactical h-8 text-[10px] px-3 shrink-0">Analyze</button>
          </div>
        </div>

        {/* Transaction Decoder */}
        <div className="forensic-panel p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground">Transaction Decoder</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Solana tx signature..."
              className="font-mono text-[11px] h-8 bg-background border-border flex-1"
              value={txHash}
              onChange={e => setTxHash(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyzeTransaction()}
            />
            <button onClick={analyzeTransaction} className="btn-tactical h-8 text-[10px] px-3 shrink-0">Decode</button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="forensic-panel p-3 border-hud-red/50">
          <p className="text-[11px] text-hud-red font-mono">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-card" />)}
        </div>
      )}

      {/* Wallet Profile + Risk Results */}
      {profileData && riskData && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Transactions Scanned" value={String(profileData.transactions_analyzed)} icon={Activity} accent="text-primary" />
            <StatCard label="SOL Fees Burned" value={`${profileData.total_sol_fees_paid.toFixed(6)} SOL`} icon={Zap} accent="text-hud-amber" />
            <StatCard label="Swaps Detected" value={String(profileData.total_swaps_detected)} icon={TrendingUp} accent="text-violet-400" />
            <StatCard label="Associated Entities" value={String(profileData.associated_entities)} icon={AlertTriangle} accent="text-hud-red" />
          </div>

          {/* Risk Panel */}
          <div className="forensic-panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground">Risk Assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground font-mono">{riskData.model}</span>
                <span className="text-[9px] text-muted-foreground font-mono">Confidence: {(riskData.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-3">
              <div className={`text-4xl font-black font-mono ${riskColor(riskData.score)}`}>
                {riskData.score}
              </div>
              <div className="flex-1">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${riskData.score >= 75 ? 'bg-hud-red' : riskData.score >= 40 ? 'bg-hud-yellow' : 'bg-hud-blue'}`}
                    style={{ width: `${riskData.score}%` }}
                  />
                </div>
              </div>
            </div>

            {riskData.flags.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground">Behavioral Flags</span>
                {riskData.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-hud-red/5 border border-hud-red/20 rounded text-[10px] text-hud-red font-mono">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{flag}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Programs Used */}
          {profileData.programs_used.length > 0 && (
            <div className="forensic-panel p-4">
              <div className="flex items-center gap-2 mb-3">
                <Hexagon className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground">Programs Invoked</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profileData.programs_used.map((p, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 bg-muted/50 border border-border rounded text-[9px] font-mono text-muted-foreground">
                    <span>{p.substring(0, 12)}...</span>
                    <CopyButton text={p} size="xs" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Transaction Decoder Results */}
      {txAnalysis && (
        <div className="space-y-3">
          {/* Tx Header */}
          <div className="forensic-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground">Decoded Transaction</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${txAnalysis.status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-hud-red/10 text-hud-red border border-hud-red/30'}`}>
                {txAnalysis.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-muted-foreground">
              <div>
                <span className="text-[9px] text-muted-foreground/60 uppercase">Tx Hash</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-foreground">{txAnalysis.tx_hash.substring(0, 24)}...</span>
                  <CopyButton text={txAnalysis.tx_hash} size="xs" />
                </div>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground/60 uppercase">Fee Payer</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-foreground">{txAnalysis.fee_payer.substring(0, 16)}...</span>
                  <CopyButton text={txAnalysis.fee_payer} size="xs" />
                </div>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground/60 uppercase">Timestamp</span>
                <span className="text-foreground block mt-0.5">{new Date(txAnalysis.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground/60 uppercase">Fee</span>
                <span className="text-foreground block mt-0.5">{(txAnalysis.fee_lamports / 1e9).toFixed(9)} SOL</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="forensic-panel p-4">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-foreground mb-3 block">
              Decoded Actions ({txAnalysis.actions.length})
            </span>
            <div className="space-y-2">
              {txAnalysis.actions.map((action, i) => (
                <div key={i} className="p-3 bg-muted/30 border border-border rounded space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${action.type === 'swap' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                      {action.type}
                    </span>
                    {action.token_symbol && (
                      <span className="text-[9px] font-mono text-muted-foreground">{action.token_symbol}</span>
                    )}
                  </div>
                  {action.from && (
                    <div className="text-[10px] font-mono text-muted-foreground">
                      <span className="text-muted-foreground/60">From:</span> {action.from.substring(0, 20)}...
                      <span className="mx-2 text-primary">→</span>
                      <span className="text-muted-foreground/60">To:</span> {action.to?.substring(0, 20)}...
                      {action.amount !== undefined && (
                        <span className="ml-2 text-foreground font-semibold">{action.amount} {action.token_symbol}</span>
                      )}
                    </div>
                  )}
                  {action.details && (
                    <div className="text-[9px] font-mono text-violet-400">
                      DEX: {action.details.dex}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Entities & Programs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="forensic-panel p-3">
              <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground block mb-2">Entities Involved</span>
              <div className="space-y-1">
                {txAnalysis.entities_involved.slice(0, 10).map((e, i) => (
                  <div key={i} className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
                    <span>{e.substring(0, 16)}...</span>
                    <CopyButton text={e} size="xs" />
                  </div>
                ))}
              </div>
            </div>
            <div className="forensic-panel p-3">
              <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground block mb-2">Programs Invoked</span>
              <div className="space-y-1">
                {txAnalysis.programs_invoked.map((p, i) => (
                  <div key={i} className="flex items-center gap-1 text-[9px] font-mono text-violet-400">
                    <span>{p.substring(0, 16)}...</span>
                    <CopyButton text={p} size="xs" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flagged Entities */}
          {txAnalysis.flagged_entities.length > 0 && (
            <div className="forensic-panel p-4 border-hud-red/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-hud-red" />
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-hud-red">Flagged Entities Detected</span>
              </div>
              {txAnalysis.flagged_entities.map((fe, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-hud-red/5 border border-hud-red/20 rounded mb-1 text-[10px] font-mono">
                  <span className="text-foreground">{fe.name}</span>
                  <span className={`font-bold ${riskColor(fe.riskScore)}`}>Risk: {fe.riskScore}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) => (
  <div className="stat-card corner-brackets">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase">{label}</span>
      <Icon className={`h-3.5 w-3.5 ${accent}`} />
    </div>
    <p className="text-lg font-bold text-foreground font-mono">{value}</p>
  </div>
);

export default SolanaForensics;
