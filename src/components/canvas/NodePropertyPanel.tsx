import { useCanvasStore } from "@/stores/useCanvasStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderSymlink, Trash2, Wand2, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { intelligenceApi } from "@/lib/api";
import { Node } from "@xyflow/react";

export const NodePropertyPanel = () => {
    const { nodes, selectedNodeId, setNodes, setAiLoading } = useCanvasStore();
    const [localData, setLocalData] = useState<any>({});
    
    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    useEffect(() => {
        if (selectedNode) setLocalData(selectedNode.data || {});
    }, [selectedNode]);

    if (!selectedNode) {
        return (
            <div className="w-72 border-l border-border/40 bg-card/40 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center shrink-0 transition-opacity duration-500">
                <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mb-4 border border-border/50">
                    <FolderSymlink className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono leading-relaxed uppercase tracking-widest">Select an entity to inspect</p>
            </div>
        );
    }

    const updateNodeData = (key: string, val: any) => {
        const newData = { ...localData, [key]: val };
        setLocalData(newData);
        setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, data: newData } : n));
    };

    const handleDelete = () => {
        setNodes(nodes.filter(n => n.id !== selectedNodeId));
    };

    const runAiAnalysis = async () => {
        if (!selectedNode.data.address) return;
        setAiLoading(true);
        try {
            const res = await intelligenceApi.analyze({ wallet: String(selectedNode.data.address), chain: "ethereum", depth: 1 });
            if (res.data?.success) {
                // In a full implementation, we would inject the suggested nodes from the AI response here
                // For MVP, we just attach the risk score back
                updateNodeData('riskScore', res.data.risk_score || 85);
            }
        } catch (e: any) {
            console.error(e);
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="w-72 border-l border-border/40 bg-card/60 backdrop-blur-xl flex flex-col shrink-0 shadow-[-20px_0_40px_rgba(0,0,0,0.3)] z-30 transition-all duration-300">
            <div className="p-4 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-transparent to-primary/5">
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-[0.2em] font-mono flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Entity Inspector
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-hud-red hover:bg-hud-red/10 transition-colors rounded-full" onClick={handleDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto flex-1 hover-scrollbar">
                <div className="space-y-2 group">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono group-hover:text-primary transition-colors">Entity Address / ID</label>
                    <Input 
                        className="h-9 text-[11px] font-mono bg-background/50 border-border/50 focus:border-primary/50 focus:bg-primary/5 transition-all text-foreground" 
                        value={localData.address || ""} 
                        onChange={e => updateNodeData("address", e.target.value)}
                        placeholder="0x..."
                    />
                </div>

                <div className="space-y-2 group">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono group-hover:text-primary transition-colors">Classification</label>
                    <Select value={selectedNode.type} onValueChange={(val) => {
                        setNodes(nodes.map(n => n.id === selectedNodeId ? { ...n, type: val } : n));
                    }}>
                        <SelectTrigger className="h-9 text-[11px] font-mono bg-background/50 border-border/50 focus:ring-1 focus:ring-primary/40 text-foreground transition-all">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                            <SelectItem value="walletNode" className="text-[11px] font-mono focus:bg-primary/20 cursor-pointer">Wallet</SelectItem>
                            <SelectItem value="exchangeNode" className="text-[11px] font-mono focus:bg-hud-yellow/20 cursor-pointer">Exchange</SelectItem>
                            <SelectItem value="mixerNode" className="text-[11px] font-mono focus:bg-hud-red/20 cursor-pointer">Mixer</SelectItem>
                            <SelectItem value="bridgeNode" className="text-[11px] font-mono focus:bg-hud-blue/20 cursor-pointer">Bridge</SelectItem>
                            <SelectItem value="defiNode" className="text-[11px] font-mono focus:bg-purple-400/20 cursor-pointer">DeFi Protocol</SelectItem>
                            <SelectItem value="contractNode" className="text-[11px] font-mono focus:bg-slate-400/20 cursor-pointer">Contract</SelectItem>
                            <SelectItem value="suspectNode" className="text-[11px] font-mono focus:bg-hud-red/20 text-hud-red cursor-pointer">Suspect Entity</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 group">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono group-hover:text-primary transition-colors">Risk Score</label>
                    <div className="flex items-center gap-3 bg-background/30 p-2 rounded-md border border-border/30">
                        <Input 
                            type="number"
                            className="h-8 text-[12px] font-mono bg-transparent border-0 focus-visible:ring-0 p-0 text-foreground w-12 text-center" 
                            value={localData.riskScore || 0} 
                            onChange={e => updateNodeData("riskScore", parseInt(e.target.value))}
                        />
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-500 rounded-full ${localData.riskScore >= 75 ? 'bg-hud-red shadow-[0_0_10px_#ef4444]' : localData.riskScore >= 40 ? 'bg-hud-yellow' : 'bg-hud-blue'}`}
                                style={{ width: `${Math.min(100, Math.max(0, localData.riskScore || 0))}%` }}
                            />
                        </div>
                        {localData.riskScore > 70 && <ShieldAlert className="h-4 w-4 text-hud-red animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />}
                    </div>
                </div>

                <div className="pt-6 mt-4 border-t border-border/30">
                    <Button 
                        onClick={runAiAnalysis}
                        className="w-full h-10 text-[10px] tracking-[0.2em] bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all duration-300 group"
                    >
                        <Wand2 className="h-4 w-4 mr-2 group-hover:animate-spin-once" />
                        AI DEEP SCAN
                    </Button>
                    <p className="text-[9px] text-muted-foreground/60 mt-3 font-mono leading-relaxed text-center px-2">
                        Execute ML pattern detection on surrounding subnetworks.
                    </p>
                </div>
            </div>
        </div>
    );
};
