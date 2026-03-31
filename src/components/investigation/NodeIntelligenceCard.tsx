import { useState, useEffect } from "react";
import { X, ShieldAlert, ShieldCheck, Activity, Link2, GitBranch, AlertTriangle, Layers, Info, Navigation, MapPin, Clock, Eye, Network, SearchCode } from "lucide-react";
import { intelligenceApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface NodeIntelligenceCardProps {
    address: string;
    chain: string;
    onClose: () => void;
    onFocusNode?: (address: string) => void;
    onTrace?: () => void;
    onExpand?: () => void;
    onWatch?: () => void;
}

const intelCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const NodeIntelligenceCard = ({ address, chain, onClose, onFocusNode, onTrace, onExpand, onWatch }: NodeIntelligenceCardProps) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        const cached = intelCache.get(address);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            setData(cached.data);
            setLoading(false);
            return;
        }

        setLoading(true);
        setData(null);
        intelligenceApi.getNodeIntelligence(address, chain)
            .then(res => {
                if (active && res.data?.success) {
                    setData(res.data.data);
                    intelCache.set(address, { data: res.data.data, timestamp: Date.now() });
                }
            })
            .catch(err => {
                console.error("Intelligence error:", err);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [address, chain]);

    const riskColor = data?.riskScore > 70 ? "text-red-500" : data?.riskScore > 30 ? "text-yellow-500" : "text-teal-500";
    const gradientBorder = data?.riskScore > 70
        ? "from-red-500/40 via-red-500/5 to-transparent shadow-[0_0_30px_-5px_rgba(239,68,68,0.2)]"
        : "from-teal-500/40 via-teal-500/5 to-transparent shadow-[0_0_30px_-5px_rgba(20,184,166,0.15)]";

    return (
        <div className="absolute top-2 right-2 bottom-2 w-96 z-40 animate-in slide-in-from-right-16 fade-in duration-300">
            <div className={`p-[1px] rounded-xl h-full bg-gradient-to-b ${gradientBorder}`}>
                <Card className={`h-full flex flex-col bg-[#0b1014]/95 backdrop-blur-2xl border-0 shadow-2xl relative overflow-hidden rounded-xl`}>

                    {/* Header: LIVE INTEL STREAM */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-teal-900/30 bg-[#0b1014] shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-teal-500 uppercase">Live Intel Stream</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-teal-400 hover:bg-teal-950/50" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/5 hover:[&::-webkit-scrollbar-thumb]:bg-teal-500/30 p-0">
                        <CardHeader className="pb-3 pt-5 px-5">
                            <div className="flex items-center gap-2 mb-1">
                                <SearchCode className="h-4 w-4 text-teal-500" />
                                <CardTitle className="text-sm uppercase tracking-widest text-white font-mono">Entity Identity</CardTitle>
                            </div>
                            <CardDescription className="text-xs font-mono break-all text-muted-foreground mt-2 bg-[#0b1014]/60 p-2 border border-teal-900/30 rounded">
                                {address}
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-5 px-5 pb-6">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <Loader2 className="h-8 w-8 text-teal-500 animate-spin" />
                                    <p className="text-[10px] text-teal-500/80 font-mono uppercase tracking-widest text-center animate-pulse">
                                        Establishing Secure Link...<br />
                                        Synchronizing Node Data
                                    </p>
                                </div>
                            ) : data ? (
                                <div className="animate-in fade-in duration-500 block space-y-5">

                                    {/* Identity Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-[#0b1014]/60 border border-teal-900/30 rounded p-2.5 flex flex-col items-start backdrop-blur-sm">
                                            <span className="text-[9px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-1.5">
                                                <Layers className="h-3 w-3" /> Chain Link
                                            </span>
                                            <span className="text-xs text-white font-mono capitalize">{data.chain}</span>
                                        </div>
                                        <div className="bg-[#0b1014]/60 border border-teal-900/30 rounded p-2.5 flex flex-col items-start backdrop-blur-sm">
                                            <span className="text-[9px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-1.5">
                                                <Info className="h-3 w-3" /> Entity Type
                                            </span>
                                            <span className="text-xs text-white font-mono capitalize">{data.type}</span>
                                        </div>
                                    </div>

                                    {/* Risk Intelligence */}
                                    <div className="bg-[#0b1014]/60 border border-teal-900/30 rounded p-3.5 backdrop-blur-sm">
                                        <h4 className="text-[10px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-3">
                                            {data.riskScore > 70 ? <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> : <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />}
                                            Risk Intelligence
                                        </h4>
                                        <div className="flex items-end justify-between mb-3 border-b border-teal-900/30 pb-3">
                                            <span className="text-xs text-muted-foreground font-mono">Threat Score</span>
                                            <span className={`text-2xl font-mono font-bold leading-none ${riskColor}`}>
                                                {data.riskScore}<span className="text-sm text-muted-foreground">/100</span>
                                            </span>
                                        </div>

                                        {data.riskFactors && data.riskFactors.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {data.riskFactors.map((factor: string, i: number) => (
                                                    <div key={i} className="flex items-start gap-1.5 text-[10px] font-mono text-red-400 bg-red-950/30 border border-red-900/50 p-1.5 rounded">
                                                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                                        <span>{factor}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-mono text-teal-600 bg-teal-950/20 p-1.5 rounded border border-teal-900/30 flex items-center gap-1.5">
                                                <ShieldCheck className="h-3 w-3" /> No severe risk markers detected.
                                            </div>
                                        )}
                                    </div>

                                    {/* Behavioral Pattern */}
                                    {data.behaviorPattern && (
                                        <div>
                                            <h4 className="text-[10px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-2">
                                                <Activity className="h-3 w-3" /> Behavioral Pattern
                                            </h4>
                                            <div className="bg-[#0b1014]/60 border border-teal-900/30 rounded p-2.5 text-xs text-white font-mono">
                                                {data.behaviorPattern}
                                            </div>
                                        </div>
                                    )}

                                    {/* Geographical Intel */}
                                    {data.geoIntel && (
                                        <div className="bg-[#0b1014]/60 border border-teal-900/30 rounded p-3 backdrop-blur-sm">
                                            <h4 className="text-[10px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-3 border-b border-teal-900/30 pb-2">
                                                <MapPin className="h-3 w-3" /> Geographical Intel
                                            </h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <span className="block text-[8px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Region</span>
                                                    <span className="text-[11px] text-white font-mono">{data.geoIntel.region}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-[8px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Timezone</span>
                                                    <span className="text-[11px] text-white font-mono flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {data.geoIntel.timezone}</span>
                                                </div>
                                                <div className="col-span-2 mt-1">
                                                    <span className="block text-[8px] text-muted-foreground uppercase font-mono tracking-widest mb-1">Known Location</span>
                                                    <span className="text-[11px] text-white font-mono">{data.geoIntel.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cross Chain Activity */}
                                    {data.crossChainActivity && data.crossChainActivity.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-2">
                                                <Link2 className="h-3 w-3" /> Cross-Chain Footprint
                                            </h4>
                                            <div className="flex flex-wrap gap-1.5">
                                                {data.crossChainActivity.map((c: string) => (
                                                    <span key={c} className="px-2 py-1 text-[9px] font-mono border border-teal-800/50 rounded bg-teal-950/30 text-teal-300 capitalize">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Counterparties */}
                                    {data.relatedWallets && data.relatedWallets.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-2">
                                                <GitBranch className="h-3 w-3" /> Top Counterparties
                                            </h4>
                                            <div className="space-y-1.5">
                                                {data.relatedWallets.map((wallet: any, i: number) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => onFocusNode?.(wallet.address)}
                                                        className="w-full text-left flex items-center justify-between text-[10px] font-mono bg-[#0b1014]/60 border border-teal-900/30 rounded px-2.5 py-2 hover:bg-teal-950/40 hover:border-teal-500/50 transition-colors group">
                                                        <span className="text-muted-foreground group-hover:text-teal-400 transition-colors truncate mr-2" title={wallet.address}>
                                                            {wallet.address.substring(0, 16)}...
                                                        </span>
                                                        <span className="text-teal-500 shrink-0 flex items-center gap-1">
                                                            <Navigation className="h-2.5 w-2.5" /> {wallet.interactionCount}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Transactions */}
                                    {data.recentTransactions && data.recentTransactions.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] text-teal-500 uppercase font-mono tracking-wider flex items-center gap-1 mb-2">
                                                <Activity className="h-3 w-3" /> Recent Transactions
                                            </h4>
                                            <div className="space-y-1.5">
                                                {data.recentTransactions.map((tx: any, i: number) => (
                                                    <div key={i} className="flex flex-col gap-1 text-[9px] font-mono bg-[#0b1014]/60 border border-teal-900/30 rounded px-2.5 py-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-muted-foreground hover:text-white cursor-help" title={tx.hash}>{tx.hash.substring(0, 10)}...</span>
                                                            <span className="text-teal-400 font-bold">{parseFloat(tx.value).toFixed(4)}</span>
                                                        </div>
                                                        <div className="text-white/60 flex items-center gap-1.5 bg-[#0b1014]/80 p-1 rounded border border-white/5">
                                                            <span title={tx.from}>{tx.from.substring(0, 6)}...</span> <span className="text-teal-500/50">→</span> <span title={tx.to}>{tx.to.substring(0, 6)}...</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            ) : (
                                <div className="text-center py-8 text-xs font-mono tracking-wide text-red-400">
                                    SIGNAL LOST. Intelligence data unavailable.
                                </div>
                            )}
                        </CardContent>
                    </div>

                    {/* HUD Footer Actions */}
                    {!loading && data && (
                        <CardFooter className="bg-[#0b1014]/90 border-t border-teal-900/30 p-3 shrink-0 grid grid-cols-3 gap-2">
                            <Button variant="outline" onClick={onTrace} className="h-8 text-[9px] font-mono border-teal-900/50 text-teal-400 hover:bg-teal-950/50 hover:text-teal-300">
                                <GitBranch className="h-3 w-3 mr-1" /> Trace
                            </Button>
                            <Button variant="outline" onClick={onExpand} className="h-8 text-[9px] font-mono border-teal-900/50 text-teal-400 hover:bg-teal-950/50 hover:text-teal-300">
                                <Network className="h-3 w-3 mr-1" /> Expand
                            </Button>
                            <Button variant="outline" onClick={onWatch} className="h-8 text-[9px] font-mono border-teal-900/50 text-teal-400 hover:bg-teal-950/50 hover:text-teal-300">
                                <Eye className="h-3 w-3 mr-1" /> Watch
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
};
