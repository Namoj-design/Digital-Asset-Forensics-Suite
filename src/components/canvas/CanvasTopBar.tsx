import { useCanvasStore } from "@/stores/useCanvasStore";
import { Button } from "@/components/ui/button";
import { Network, Save, ArrowLeft, RefreshCw, Box } from "lucide-react";
import { Link } from "react-router-dom";
import { canvasApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { SyncCanvasTools } from "@/components/canvas/SyncCanvasTools";

export const CanvasTopBar = () => {
    const { canvasId, caseId, canvasName, hasUnsavedChanges, nodes, edges, viewport, markSaved, aiLoading } = useCanvasStore();
    const { toast } = useToast();

    const handleSave = async () => {
        if (!canvasId) return;
        try {
            await canvasApi.save({
                id: canvasId,
                nodes,
                edges,
                viewport
            });
            markSaved();
            toast({ title: "Saved", description: "Canvas state synchronized to intelligence vault." });
        } catch (err: any) {
            toast({ title: "Save Failed", description: err.message, variant: "destructive" });
        }
    };

    return (
        <div className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-10 relative">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link to="/canvas"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="h-4 w-[1px] bg-border" />
                <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <h1 className="text-xs font-bold text-foreground font-mono uppercase tracking-widest">{canvasName}</h1>
                    
                    {caseId && (
                        <div className="ml-3 px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-[10px] text-primary font-mono tracking-widest hover:bg-primary/20 transition-colors">
                            <Link to={`/investigation/${caseId}`} className="flex items-center gap-1">
                                🔗 {caseId}
                            </Link>
                        </div>
                    )}

                    {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-hud-red animate-pulse ml-2" title="Unsaved changes" />}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {aiLoading && (
                    <div className="flex items-center gap-2 mr-4 px-3 py-1 bg-primary/10 border border-primary/20 rounded-md text-primary text-[10px] font-mono animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" /> Analyzing Connections...
                    </div>
                )}
                
                <Button 
                    variant={hasUnsavedChanges ? "default" : "outline"} 
                    size="sm" 
                    className={`h-7 text-[10px] font-mono tracking-widest ${hasUnsavedChanges ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                    onClick={handleSave}
                    disabled={!hasUnsavedChanges}
                >
                    <Save className="mr-2 h-3 w-3" />
                    SAVE CANVAS
                </Button>
                
                <SyncCanvasTools />
            </div>
        </div>
    );
};
