import { useState } from "react";
import { Button } from "@/components/ui/button";
import { casesApi, evidenceApi } from "@/lib/api";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { useToast } from "@/components/ui/use-toast";
import { Network, HardDriveDownload } from "lucide-react";

export const SyncCanvasTools = () => {
    const { caseId, setNodes, setEdges, markSaved, nodes, edges, viewport } = useCanvasStore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    if (!caseId) return null;

    const handlePullFromInvestigation = async () => {
        setLoading(true);
        try {
            const res = await casesApi.initializeCanvas(caseId);
            if (res.data?.success && res.data.data) {
                let parsed = res.data.data.graph_data;
                if (typeof parsed === 'string') parsed = JSON.parse(parsed);

                let rawNodes = parsed?.nodes || [];
                let rawEdges = parsed?.edges || [];

                // Centralized Flow Layout Algorithm (Concentric Circular Pattern)
                const rfNodes = rawNodes.map((n: any, i: number) => {
                    let rx = 0, ry = 0;
                    if (rawNodes.length > 1 && i > 0) {
                        const angle = (i - 1) * (Math.PI * 2) / (rawNodes.length - 1);
                        const radius = 280; // Distance from center
                        rx = Math.cos(angle) * radius;
                        ry = Math.sin(angle) * radius;
                    }

                    // Map backend types explicitly to our React Flow toolkit types
                    let finalType = 'walletNode';
                    if (['suspectNode', 'target', 'Suspect'].includes(n.type)) finalType = 'suspectNode';
                    else if (['mixerNode', 'mixer', 'Mixer'].includes(n.type)) finalType = 'mixerNode';
                    else if (['exchangeNode', 'exchange', 'CEX'].includes(n.type)) finalType = 'exchangeNode';
                    else if (['bridgeNode', 'bridge', 'Bridge'].includes(n.type)) finalType = 'bridgeNode';
                    else if (['defiNode', 'defi', 'DeFi'].includes(n.type)) finalType = 'defiNode';
                    else if (['contractNode', 'contract', 'Smart Contract'].includes(n.type)) finalType = 'contractNode';
                    else if (n.type) finalType = n.type; // Fallback to raw if already matched

                    return {
                        id: n.id || `node_${i}`,
                        type: finalType,
                        position: n.position || { x: rx, y: ry },
                        data: { 
                            address: n.label || n.address || n.id, 
                            riskScore: n.riskScore || 0, 
                            type: finalType, 
                            ...(n.data || {}) 
                        }
                    };
                });

                const rfEdges = rawEdges.map((e: any, i: number) => {
                    const rScore = e.riskScore || 0;
                    return {
                        id: e.id || `e-${e.source}-${e.target}-${i}`,
                        source: e.source,
                        target: e.target,
                        animated: true,
                        type: 'threat',
                        data: { 
                            volume: e.volume || 0, 
                            transfers: e.transfers || 1, 
                            riskScore: rScore,
                            isSuspicious: rScore >= 75 
                        }
                    };
                });

                setNodes(rfNodes);
                setEdges(rfEdges);
                markSaved();
                toast({ title: "Intelligence Extracted", description: "Playground pattern generated successfully with risk scoring." });
            }
        } catch (err: any) {
            toast({ title: "Pull Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handlePushToVault = async () => {
        setLoading(true);
        try {
            const snapshot = JSON.stringify({ nodes, edges, viewport }, null, 2);
            const blob = new Blob([snapshot], { type: "application/json" });
            const file = new File([blob], `canvas_snapshot_${Date.now()}.json`, { type: "application/json" });
            
            const formData = new FormData();
            formData.append("file", file);

            await evidenceApi.upload(caseId, formData);
            toast({ title: "Archived to Vault", description: "Canvas intelligence snapshot secured in Evidence Vault." });
        } catch (err: any) {
            toast({ title: "Push Failed", description: err.response?.data?.error || err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2 border-l border-border pl-4 ml-2">
            <Button variant="ghost" size="sm" onClick={handlePullFromInvestigation} disabled={loading} className="h-7 text-[10px] tracking-widest text-muted-foreground hover:text-primary">
                <Network className="mr-1.5 h-3 w-3" /> PULL FROM CASE
            </Button>
            <Button variant="ghost" size="sm" onClick={handlePushToVault} disabled={loading} className="h-7 text-[10px] tracking-widest text-muted-foreground hover:text-primary">
                <HardDriveDownload className="mr-1.5 h-3 w-3" /> PUSH TO VAULT
            </Button>
        </div>
    );
};
