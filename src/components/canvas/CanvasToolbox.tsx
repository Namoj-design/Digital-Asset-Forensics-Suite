import { DragEvent } from 'react';
import { Wallet, Building, Eye, Link2, Ghost, RefreshCcw, Activity, FileCode2 } from "lucide-react";

const NODE_TYPES = [
  { type: 'walletNode', label: 'Wallet Node', icon: Wallet, color: 'text-primary', style: 'border-primary/50 bg-primary/10' },
  { type: 'exchangeNode', label: 'CEX Hub', icon: Building, color: 'text-hud-yellow', style: 'border-hud-yellow/50 bg-hud-yellow/10' },
  { type: 'mixerNode', label: 'Mixer', icon: RefreshCcw, color: 'text-hud-red', style: 'border-hud-red/50 bg-hud-red/10' },
  { type: 'bridgeNode', label: 'Bridge', icon: Link2, color: 'text-hud-blue', style: 'border-hud-blue/50 bg-hud-blue/10' },
  { type: 'defiNode', label: 'DeFi Protocol', icon: Activity, color: 'text-purple-400', style: 'border-purple-400/50 bg-purple-400/10' },
  { type: 'contractNode', label: 'Smart Contract', icon: FileCode2, color: 'text-slate-400', style: 'border-slate-400/50 bg-slate-400/10' },
  { type: 'suspectNode', label: 'Suspect Entity', icon: Ghost, color: 'text-hud-red opacity-80', style: 'border-hud-red border-dashed bg-hud-red/5' },
];

export const CanvasToolbox = () => {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-40 border-r border-border/40 bg-card/60 backdrop-blur-xl flex flex-col pt-6 shadow-[10px_0_30px_rgba(0,0,0,0.1)] z-30 transition-all duration-300">
      <div className="px-4 mb-4">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] font-mono">Toolkit</h3>
      </div>
      <div className="flex-1 overflow-y-auto w-full px-3 py-2 flex flex-col gap-3 hover-scrollbar">
        {NODE_TYPES.map((nt) => (
          <div
            key={nt.type}
            className="group relative flex items-center gap-3 cursor-grab active:cursor-grabbing hover:bg-muted/40 p-1.5 rounded-lg transition-colors border border-transparent hover:border-border/50"
            draggable
            onDragStart={(e) => onDragStart(e, nt.type)}
          >
            <div className={`w-8 h-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-all bg-background/50 backdrop-blur-sm group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(var(--primary),0.3)] ${nt.style}`}>
              <nt.icon className={`h-3.5 w-3.5 ${nt.color}`} />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground font-medium group-hover:text-foreground transition-colors truncate">
              {nt.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
