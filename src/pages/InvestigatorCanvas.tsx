import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { canvasApi } from "@/lib/api";
import { CanvasTopBar } from "@/components/canvas/CanvasTopBar";
import { CanvasToolbox } from "@/components/canvas/CanvasToolbox";
import { NodePropertyPanel } from "@/components/canvas/NodePropertyPanel";
import { FlowArea } from "@/components/canvas/FlowArea";
import { AICopilotPanel } from "@/components/canvas/AICopilotPanel";
import { TimelinePanel } from "@/components/canvas/TimelinePanel";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const InvestigatorCanvas = () => {
  const { canvasId } = useParams();
  const { setCanvasId, setCaseId, setCanvasName, setNodes, setEdges, markSaved } = useCanvasStore();
  const [loading, setLoading] = useState(true);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  useEffect(() => {
    if (!canvasId) return;

    const loadCanvas = async () => {
      try {
        const res = await canvasApi.get(canvasId);
        if (res.data?.success) {
          const data = res.data.data;
          setCanvasId(data._id);
          setCaseId(data.case_id);
          setCanvasName(data.name);
          setNodes(data.nodes || []);
          setEdges(data.edges || []);
          
          // Small delay to allow react flow to register nodes before marking as un-dirty
          setTimeout(() => markSaved(), 100);
        }
      } catch (e) {
        console.error("Failed to load canvas:", e);
      } finally {
        setLoading(false);
      }
    };

    loadCanvas();
  }, [canvasId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-primary">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest">Initializing Intelligence Canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)] overflow-hidden">
      <CanvasTopBar />
      <div className="flex flex-1 min-h-0 relative">
        <CanvasToolbox />
        <div className="flex flex-col flex-1 relative">
            <FlowArea />

            {!isCopilotOpen && (
              <button
                onClick={() => setIsCopilotOpen(true)}
                className="absolute bottom-8 right-8 z-40 group flex items-center gap-3 px-5 py-3 rounded-full bg-card/80 backdrop-blur-xl border border-primary/30 shadow-[0_0_30px_rgba(0,198,255,0.2)] hover:shadow-[0_0_40px_rgba(0,198,255,0.4)] transition-all duration-500 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
                <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 bg-primary/40 rounded-full blur-md animate-pulse" />
                    <Sparkles className="h-5 w-5 text-primary relative z-10 group-hover:animate-spin-slow" />
                </div>
                <span className="text-[12px] font-bold text-foreground font-mono tracking-widest uppercase relative z-10 group-hover:text-primary transition-colors">
                    AI Copilot
                </span>
              </button>
            )}

            <TimelinePanel />
        </div>
        <NodePropertyPanel />
        
        {isCopilotOpen && (
          <div className="absolute right-8 bottom-8 z-50">
            <AICopilotPanel onClose={() => setIsCopilotOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
};
export default InvestigatorCanvas;
