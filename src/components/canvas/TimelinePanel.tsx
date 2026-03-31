import { useCanvasStore } from "@/stores/useCanvasStore";
import { Clock, Activity, ArrowRight, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const TimelinePanel = () => {
    const { edges, nodes, setSelectedNodeId } = useCanvasStore();
    const [collapsed, setCollapsed] = useState(false);

    if (edges.length === 0) return null;

    // Fake chronological sort based on edge creation order or ID
    const chronologicalEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

    return (
        <div className={`absolute bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-md transition-all duration-300 z-10 ${collapsed ? 'h-8' : 'h-48'}`}>
            <div className="flex flex-col h-full">
                <div 
                    className="h-8 border-b border-border/50 flex items-center justify-between px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-bold tracking-widest uppercase font-mono text-primary">Chronological Event Timeline</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono ml-2">{edges.length} FLOWS</span>
                    </div>
                </div>

                {!collapsed && (
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {chronologicalEdges.map((edge, idx) => {
                            const sourceNode = nodes.find(n => n.id === edge.source);
                            const targetNode = nodes.find(n => n.id === edge.target);
                            const volume = edge.data?.volume ? parseFloat(edge.data.volume as string) : 0;
                            const isHighRisk = (edge.data?.riskScore as number) >= 75 || edge.data?.isSuspicious;

                            return (
                                <div key={edge.id} className={`flex items-center gap-4 p-2 rounded border text-xs font-mono transition-colors ${
                                    isHighRisk ? 'border-hud-red/30 bg-hud-red/5 hover:bg-hud-red/10' : 'border-border bg-background hover:bg-muted/50'
                                }`}>
                                    <div className="text-[10px] text-muted-foreground w-12 text-center">T+{idx}</div>
                                    
                                    <Button 
                                        variant="link" 
                                        className={`h-auto p-0 font-mono text-[11px] ${sourceNode?.data?.riskScore as number >= 75 ? 'text-hud-red' : 'text-foreground'}`}
                                        onClick={() => setSelectedNodeId(edge.source)}
                                    >
                                        {sourceNode?.data?.address ? `${(sourceNode.data.address as string).substring(0, 10)}...` : edge.source}
                                    </Button>

                                    <div className="flex items-center gap-2 text-muted-foreground flex-1 justify-center px-4">
                                        <div className="h-[1px] bg-border flex-1" />
                                        <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${isHighRisk ? 'bg-hud-red/20 text-hud-red' : 'bg-primary/10 text-primary'}`}>
                                            {isHighRisk && <ShieldAlert className="h-3 w-3" />}
                                            {volume.toFixed(2)} VAL
                                        </div>
                                        <ArrowRight className="h-3 w-3" />
                                        <div className="h-[1px] bg-border flex-1" />
                                    </div>

                                    <Button 
                                        variant="link" 
                                        className={`h-auto p-0 font-mono text-[11px] ${targetNode?.data?.riskScore as number >= 75 ? 'text-hud-red' : 'text-foreground'}`}
                                        onClick={() => setSelectedNodeId(edge.target)}
                                    >
                                        {targetNode?.data?.address ? `${(targetNode.data.address as string).substring(0, 10)}...` : edge.target}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
