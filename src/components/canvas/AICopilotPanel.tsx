import { useState } from "react";
import { useCanvasStore } from "@/stores/useCanvasStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Activity, Network, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { intelligenceApi } from "@/lib/api";

type Props = { onClose: () => void };

export const AICopilotPanel = ({ onClose }: Props) => {
  const { nodes, edges, setNodes, setEdges, selectedNodeId, setAiLoading, aiLoading, copilotMessages, addCopilotMessage, caseId, canvasId } = useCanvasStore();
  const [input, setInput] = useState("");
  const { toast } = useToast();

  const handleSend = async (overrideText?: string) => {
    const userText = overrideText || input.trim();
    if (!userText || aiLoading) return;
    
    addCopilotMessage({ role: "user", content: userText });
    if (!overrideText) setInput("");
    setAiLoading(true);

    try {
      const res = await intelligenceApi.copilot({
         message: userText,
         case_id: caseId || undefined,
         canvas_id: canvasId || undefined
      });
      
      const data = res.data;
      if (data.error) throw new Error(data.error);

      // Extract new node patching
      if (data.graph_updates && data.graph_updates.length > 0) {
         const newNodes = data.graph_updates.filter((u: any) => !u.source);
         const newEdges = data.graph_updates.filter((u: any) => u.source && u.target);
         
         if (newNodes.length > 0) {
             const formattedNodes = newNodes.map((n: any, i: number) => ({
                 id: n.id || `ai_node_${Date.now()}_${i}`,
                 type: n.type || 'walletNode',
                 position: { x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 },
                 data: { address: n.id || n.address || '', riskScore: n.riskScore || 50, ...n }
             }));
             // Make sure we don't insert duplicates
             const uniqueNodes = formattedNodes.filter((fn: any) => !nodes.some(n => n.id === fn.id || (n.data?.address && n.data.address === fn.data.address)));
             setNodes([...nodes, ...uniqueNodes]);
         }
         if (newEdges.length > 0) {
             const formattedEdges = newEdges.map((e: any, i: number) => ({
                 id: e.id || `ai_edge_${Date.now()}_${i}`,
                 source: e.source,
                 target: e.target,
                 animated: true,
                 type: 'threat',
                 data: { volume: e.volume || 0, riskScore: 80 }
             }));
             setEdges([...edges, ...formattedEdges]);
         }
      }

      let finalContent = data.summary || "Analysis complete.";
      if (data.actions_taken && data.actions_taken.length > 0) {
          finalContent = `[Actions Log]\n${data.actions_taken.map((a:string) => `> ${a}`).join('\n')}\n\n${finalContent}`;
      }
      
      addCopilotMessage({ role: "ai", content: finalContent });

    } catch (e: any) {
      toast({ title: "Copilot Error", description: e.message || "Failed to contact AI Agent", variant: "destructive" });
      addCopilotMessage({ role: "ai", content: "Agent connection failed. Ensure Ollama is running at localhost:11434 and ML backend is up." });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAutoExpand = () => {
    if (!selectedNodeId) {
      toast({ title: "No Target", description: "Select a node to trace first.", variant: "destructive" });
      return;
    }
    const targetNode = nodes.find(n => n.id === selectedNodeId);
    handleSend(`Expand wallet ${targetNode?.data?.address || selectedNodeId}`);
  };

  const handleConnectDots = () => {
    handleSend("Analyze the current graph and find connections between isolated entities.");
  };

  return (
    <div className="w-[400px] h-[450px] rounded-2xl border border-border/40 bg-card/80 backdrop-blur-2xl flex flex-col shrink-0 shadow-[0_10px_50px_rgba(0,0,0,0.5)] z-50 relative transition-all duration-300 overflow-hidden">
      <div className="p-4 border-b border-border/40 flex items-center justify-between bg-gradient-to-r from-transparent to-primary/10">
        <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/40 rounded-full blur-md animate-pulse" />
              <Sparkles className="h-4 w-4 text-primary relative z-10" />
            </div>
            <h3 className="text-[11px] font-bold text-foreground uppercase tracking-[0.2em] font-mono">Agent Copilot</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 hover:bg-muted/50 rounded-full transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 hover-scrollbar">
        {copilotMessages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'ai' ? 'items-start' : 'items-end'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-xl text-[11px] font-mono leading-relaxed whitespace-pre-wrap shadow-sm ${
              msg.role === 'ai' 
                ? 'bg-muted/60 text-foreground border border-border/50 rounded-tl-sm' 
                : 'bg-primary/10 text-primary border border-primary/20 rounded-tr-sm backdrop-blur-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {aiLoading && (
          <div className="flex flex-col items-start animate-in fade-in duration-300">
            <div className="px-4 py-3 rounded-xl rounded-tl-sm text-[11px] font-mono leading-relaxed bg-muted/30 text-muted-foreground border border-border/50 gap-3 flex flex-col w-[85%]">
              <div className="flex items-center gap-2">
                 <Loader2 className="h-3 w-3 animate-spin text-primary"/> 
                 <span className="text-primary font-bold">Reasoning Engine Active</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden w-full">
                <div className="h-full bg-primary/50 rounded-full animate-progress-indeterminate" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/40 bg-background/30 backdrop-blur-md space-y-3 relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-2 gap-3 mb-2">
            <Button variant="outline" size="sm" onClick={handleAutoExpand} className="h-8 text-[9px] font-mono tracking-widest bg-background/50 border-border/50 hover:bg-card hover:border-hud-blue/50 hover:text-hud-blue transition-all group">
                <Activity className="h-3.5 w-3.5 mr-2 text-hud-blue/70 group-hover:text-hud-blue" />
                EXPAND NODE
            </Button>
            <Button variant="outline" size="sm" onClick={handleConnectDots} className="h-8 text-[9px] font-mono tracking-widest bg-background/50 border-border/50 hover:bg-card hover:border-hud-yellow/50 hover:text-hud-yellow transition-all group">
                <Network className="h-3.5 w-3.5 mr-2 text-hud-yellow/70 group-hover:text-hud-yellow" />
                CONNECT DOTS
            </Button>
        </div>
        <div className="relative group/input">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={aiLoading}
            placeholder="Instruct the Copilot..."
            className="h-10 text-[11px] font-mono pr-12 bg-card border-border/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all rounded-lg placeholder:text-muted-foreground/50 shadow-inner"
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 text-primary hover:text-primary-foreground hover:bg-primary transition-all rounded-md"
            disabled={aiLoading}
            onClick={() => handleSend()}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
