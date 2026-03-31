import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  ZoomIn, ZoomOut, Maximize2, Loader2, Crosshair, Search, Filter,
  Layers, GitBranch, Minimize2, LayoutGrid, Circle, Target, Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletGraph, LiveGraphNode } from "@/hooks/useEtherscan";
import { ChainId } from "@/lib/etherscan";
import { useGraphStream } from "@/hooks/useGraphStream";
import * as d3 from "d3";
import { NodeIntelligenceCard } from "./NodeIntelligenceCard";
import { investigationApi, monitorApi, intelligenceApi } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────
type LayoutMode = "force" | "radial" | "hierarchical" | "flow" | "cluster";
type FilterMode = "all" | "suspect" | "exchange" | "hub" | "high-value";

interface SimNode {
  id: string; address: string; label: string; type: string;
  riskScore?: number;
  anonymity_score?: number;
  ip_signals?: string[];
  txCount?: number; volume: number; chain?: string;
  isTarget?: boolean;
  x: number; y: number; vx?: number; vy?: number;
  fx?: number | null; fy?: number | null;
  pinned?: boolean; depth?: number;
}

interface SimEdge {
  source: string; target: string; transfers: number; volume: number;
  highlighted?: boolean;
}

interface GraphCanvasProps {
  address?: string;
  chainId?: ChainId;
  onNodeSelect?: (node: any) => void;
  onNodeHold?: (node: any) => void;
  selectedNodeId?: string;
  caseGraph?: { nodes: any[]; edges: any[] } | null;
}

// ─── Layout Calculators ───────────────────────────────────────────
function computeLayout(nodes: SimNode[], edges: SimEdge[], mode: LayoutMode, w: number, h: number): SimNode[] {
  const cx = w / 2, cy = h / 2;
  const targetNode = nodes.find(n => n.type === "target" || n.isTarget);

  if (mode === "radial") {
    const targetIdx = nodes.findIndex(n => n.type === "target" || n.isTarget);
    const others = nodes.filter((_, i) => i !== targetIdx);
    const depth1 = new Set<string>();
    edges.forEach(e => {
      if (e.source === targetNode?.id) depth1.add(e.target);
      if (e.target === targetNode?.id) depth1.add(e.source);
    });
    const ring1 = others.filter(n => depth1.has(n.id));
    const ring2 = others.filter(n => !depth1.has(n.id));

    const out: SimNode[] = [];
    if (targetNode) out.push({ ...targetNode, x: cx, y: cy, fx: cx, fy: cy });

    ring1.forEach((n, i) => {
      const a = (2 * Math.PI * i) / (ring1.length || 1) - Math.PI / 2;
      const r = Math.min(w, h) * 0.25;
      out.push({ ...n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), depth: 1 });
    });
    ring2.forEach((n, i) => {
      const a = (2 * Math.PI * i) / (ring2.length || 1) - Math.PI / 4;
      const r = Math.min(w, h) * 0.42;
      out.push({ ...n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), depth: 2 });
    });
    return out;
  }

  if (mode === "hierarchical") {
    const levels: Map<string, number> = new Map();
    if (targetNode) levels.set(targetNode.id, 0);
    let frontier = targetNode ? [targetNode.id] : [];
    for (let d = 1; d <= 5; d++) {
      const next: string[] = [];
      frontier.forEach(fid => {
        edges.forEach(e => {
          const peer = e.source === fid ? e.target : e.target === fid ? e.source : null;
          if (peer && !levels.has(peer)) { levels.set(peer, d); next.push(peer); }
        });
      });
      frontier = next;
    }
    nodes.forEach(n => { if (!levels.has(n.id)) levels.set(n.id, 3); });

    const byLevel: Map<number, SimNode[]> = new Map();
    nodes.forEach(n => {
      const lv = levels.get(n.id) || 0;
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv)!.push(n);
    });

    const out: SimNode[] = [];
    const maxLv = Math.max(...Array.from(byLevel.keys()));
    byLevel.forEach((lvNodes, lv) => {
      const yPos = 60 + (lv / (maxLv || 1)) * (h - 120);
      lvNodes.forEach((n, i) => {
        const xPos = (w / (lvNodes.length + 1)) * (i + 1);
        out.push({ ...n, x: xPos, y: yPos, depth: lv });
      });
    });
    return out;
  }

  if (mode === "flow") {
    const levels: Map<string, number> = new Map();
    if (targetNode) levels.set(targetNode.id, 0);
    let frontier = targetNode ? [targetNode.id] : [];
    for (let d = 1; d <= 5; d++) {
      const next: string[] = [];
      frontier.forEach(fid => {
        edges.forEach(e => {
          const peer = e.source === fid ? e.target : e.target === fid ? e.source : null;
          if (peer && !levels.has(peer)) { levels.set(peer, d); next.push(peer); }
        });
      });
      frontier = next;
    }
    nodes.forEach(n => { if (!levels.has(n.id)) levels.set(n.id, 3); });

    const byLevel: Map<number, SimNode[]> = new Map();
    nodes.forEach(n => {
      const lv = levels.get(n.id) || 0;
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv)!.push(n);
    });

    const out: SimNode[] = [];
    const maxLv = Math.max(...Array.from(byLevel.keys()));
    byLevel.forEach((lvNodes, lv) => {
      const xPos = 80 + (lv / (maxLv || 1)) * (w - 160);
      lvNodes.forEach((n, i) => {
        const yPos = (h / (lvNodes.length + 1)) * (i + 1);
        out.push({ ...n, x: xPos, y: yPos, depth: lv });
      });
    });
    return out;
  }

  if (mode === "cluster") {
    const groups: Map<string, SimNode[]> = new Map();
    nodes.forEach(n => {
      const g = n.type || "normal";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(n);
    });
    const gArr = Array.from(groups.entries());
    const out: SimNode[] = [];
    gArr.forEach(([, gNodes], gi) => {
      const gAngle = (2 * Math.PI * gi) / (gArr.length || 1);
      const gCx = cx + (Math.min(w, h) * 0.28) * Math.cos(gAngle);
      const gCy = cy + (Math.min(w, h) * 0.28) * Math.sin(gAngle);
      gNodes.forEach((n, ni) => {
        const a = (2 * Math.PI * ni) / (gNodes.length || 1);
        const r = Math.max(40, gNodes.length * 8);
        out.push({ ...n, x: gCx + r * Math.cos(a), y: gCy + r * Math.sin(a) });
      });
    });
    return out;
  }

  // force - just return raw positions, D3 simulation will handle
  return nodes.map(n => ({ ...n, x: n.x || cx + (Math.random() - 0.5) * 300, y: n.y || cy + (Math.random() - 0.5) * 300 }));
}

// ─── BFS Pathfinder ───────────────────────────────────────────────
function bfsPath(edges: SimEdge[], startId: string, endId: string): string[] | null {
  const adj: Map<string, string[]> = new Map();
  edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e.target);
    adj.get(e.target)!.push(e.source);
  });
  const visited = new Set<string>();
  const parent: Map<string, string | null> = new Map();
  const queue = [startId];
  visited.add(startId);
  parent.set(startId, null);

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === endId) {
      const path: string[] = [];
      let c: string | null = endId;
      while (c) { path.unshift(c); c = parent.get(c) || null; }
      return path;
    }
    (adj.get(cur) || []).forEach(nb => {
      if (!visited.has(nb)) { visited.add(nb); parent.set(nb, cur); queue.push(nb); }
    });
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────
export const GraphCanvas = ({ address = "0x0d...", chainId = 1 as ChainId, onNodeSelect, onNodeHold, selectedNodeId, caseGraph }: GraphCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  // Controls
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("force");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [simplified, setSimplified] = useState(false);
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [pathEnd, setPathEnd] = useState<string | null>(null);
  const [pathNodes, setPathNodes] = useState<Set<string>>(new Set());
  const [pathEdges, setPathEdges] = useState<Set<string>>(new Set());
  const [pathMode, setPathMode] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hold Interaction State
  const [holdProgressNode, setHoldProgressNode] = useState<string | null>(null);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const holdTriggered = useRef(false);

  // Escape key to exit fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    if (isFullscreen) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Simulation state
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const simRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);

  const liveGraph = useWalletGraph(caseGraph ? undefined : address, chainId);
  const graphData = caseGraph || liveGraph.data;
  const isLoading = caseGraph ? false : liveGraph.isLoading;

  // SSE Stream — incremental live updates
  const { connected: sseConnected, consumePending, pendingNodes, pendingEdges } = useGraphStream();
  const [liveNodes, setLiveNodes] = useState<any[]>([]);
  const [liveEdges, setLiveEdges] = useState<any[]>([]);

  // ─── AI Intelligence Canvas State ─────────────────────────────
  const [aiInsights, setAiInsights] = useState<{ suspiciousNodes: Set<string>, predictedEdges: any[] }>({ suspiciousNodes: new Set(), predictedEdges: [] });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const analyzeNode = useCallback(async (wallet: string) => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await intelligenceApi.analyze({ wallet, chain: chainId.toString(), depth: 2 });
      const data = res.data;
      if (data.error) throw new Error(data.error);

      // Only canvasGraphState is updated, viewGraphState (mergedGraphData) remains pure
      const susNodes = new Set<string>(data.graph_updates?.suspicious_nodes || []);
      setAiInsights(prev => ({
        suspiciousNodes: new Set([...prev.suspiciousNodes, ...susNodes]),
        predictedEdges: [...prev.predictedEdges, ...(data.graph_updates?.suggested_edges || [])]
      }));
    } catch (e: any) {
      console.error("AI Analysis failed", e);
      setAiError("AI insights unavailable");
      setTimeout(() => setAiError(null), 4000);
    } finally {
      setIsAiLoading(false);
    }
  }, [chainId]);

  useEffect(() => {
    if (pendingNodes.length === 0 && pendingEdges.length === 0) return;
    const timer = setTimeout(() => {
      const { nodes, edges } = consumePending();
      if (nodes.length > 0) setLiveNodes(prev => [...prev, ...nodes.filter(n => !prev.some(p => p.id === n.id))]);
      if (edges.length > 0) setLiveEdges(prev => [...prev, ...edges]);
    }, 2000); // Debounce 2s
    return () => clearTimeout(timer);
  }, [pendingNodes, pendingEdges, consumePending]);

  // Merge live SSE data with static graph data
  const mergedGraphData = useMemo(() => {
    if (!graphData && liveNodes.length === 0) return null;
    const baseNodes = graphData?.nodes || [];
    const baseEdges = graphData?.edges || [];
    const existingIds = new Set(baseNodes.map((n: any) => n.id));
    const newNodes = liveNodes.filter(n => !existingIds.has(n.id));
    return {
      nodes: [...baseNodes, ...newNodes],
      edges: [...baseEdges, ...liveEdges],
    };
  }, [graphData, liveNodes, liveEdges]);

  // Container size
  const [dims, setDims] = useState({ w: 800, h: 500 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Build / Rebuild Simulation ──────────────────────────────
  // IMMUTABLE original data — NEVER mutated
  const allNodes: SimNode[] = useMemo(() => {
    const src = mergedGraphData;
    if (!src?.nodes) return [];
    return src.nodes.map((n: any) => ({
      id: n.id, address: n.address || n.id, label: n.label || (n.id?.substring(0, 8) + "..."),
      type: n.type || "normal", riskScore: n.riskScore || 0, txCount: n.txCount || 0,
      volume: n.volume || 0, chain: n.chain, isTarget: n.isTarget || n.type === "target",
      x: n.x ?? dims.w / 2, y: n.y ?? dims.h / 2,
    }));
  }, [mergedGraphData, dims]);

  const rawEdges: SimEdge[] = useMemo(() => {
    const src = mergedGraphData;
    if (!src?.edges) return [];
    const merged: Map<string, SimEdge> = new Map();
    src.edges.forEach((e: any) => {
      const key = `${e.source}_${e.target}`;
      if (merged.has(key)) {
        const ex = merged.get(key)!;
        ex.transfers += e.transfers || 1;
        ex.volume += parseFloat(e.volume || 0);
      } else {
        merged.set(key, { source: e.source, target: e.target, transfers: e.transfers || 1, volume: parseFloat(e.volume || 0) });
      }
    });
    return Array.from(merged.values());
  }, [mergedGraphData]);

  // DERIVED filtered view — original data NEVER changes
  const visibleNodeIds: Set<string> = useMemo(() => {
    let nodes = allNodes;

    // Apply node-type filters
    if (filterMode === "suspect") nodes = nodes.filter(n => n.type === "suspect" || n.type === "target" || n.riskScore >= 60);
    else if (filterMode === "exchange") nodes = nodes.filter(n => n.type === "exchange" || n.type === "target");
    else if (filterMode === "hub") nodes = nodes.filter(n => n.type === "hub" || n.type === "target" || n.txCount >= 5);

    return new Set(nodes.map(n => n.id));
  }, [allNodes, filterMode]);

  const filteredEdges: SimEdge[] = useMemo(() => {
    // Only include edges where BOTH source and target are in visible set
    let out = rawEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

    if (simplified) {
      const maxVol = Math.max(...out.map(e => e.volume), 0.001);
      out = out.filter(e => e.volume > maxVol * 0.05 || e.transfers > 2);
    }
    if (filterMode === "high-value") {
      const maxVol = Math.max(...rawEdges.map(e => e.volume), 0.001);
      out = rawEdges.filter(e => e.volume > maxVol * 0.1 && visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
    }
    return out;
  }, [rawEdges, visibleNodeIds, simplified, filterMode]);

  const filteredNodes: SimNode[] = useMemo(() => {
    let out = allNodes.filter(n => visibleNodeIds.has(n.id));

    // When simplified, also remove orphans with no visible edges
    if (simplified && filteredEdges.length > 0) {
      const connectedIds = new Set<string>();
      filteredEdges.forEach(e => { connectedIds.add(e.source); connectedIds.add(e.target); });
      out = out.filter(n => connectedIds.has(n.id) || n.type === "target");
    }

    // Carry over positions from current sim if available
    if (simNodes.length > 0) {
      const posMap = new Map(simNodes.map(n => [n.id, { x: n.x, y: n.y }]));
      out = out.map(n => {
        const pos = posMap.get(n.id);
        return pos ? { ...n, x: pos.x, y: pos.y } : n;
      });
    }

    // Validate — no NaN or undefined positions
    out = out.map(n => ({
      ...n,
      x: Number.isFinite(n.x) ? n.x : dims.w / 2 + (Math.random() - 0.5) * 100,
      y: Number.isFinite(n.y) ? n.y : dims.h / 2 + (Math.random() - 0.5) * 100,
    }));

    console.log(`[Graph Filter] ${out.length} nodes, ${filteredEdges.length} edges (filter: ${filterMode}, simplified: ${simplified})`);
    return out;
  }, [allNodes, visibleNodeIds, simplified, filteredEdges, dims]);

  // Lay out and start simulation
  useEffect(() => {
    // Guard: if no nodes remain after filtering, clear sim and bail
    if (filteredNodes.length === 0) {
      if (simRef.current) { simRef.current.stop(); simRef.current = null; }
      setSimNodes([]);
      return;
    }

    if (simRef.current) simRef.current.stop();

    if (layoutMode === "force") {
      const clonedNodes = filteredNodes.map(n => ({ ...n }));
      const targetN = clonedNodes.find(n => n.isTarget);
      if (targetN) { targetN.fx = dims.w / 2; targetN.fy = dims.h / 2; }

      // Build safe edge links — only edges whose endpoints exist in cloned nodes
      const nodeIds = new Set(clonedNodes.map(n => n.id));
      const safeEdges = filteredEdges
        .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
        .map(e => ({ ...e }));

      const sim = d3.forceSimulation<SimNode>(clonedNodes)
        .force("link", d3.forceLink<SimNode, any>(safeEdges).id((d: any) => d.id).distance(80).strength(0.4))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(dims.w / 2, dims.h / 2))
        .force("collide", d3.forceCollide(25))
        .alphaDecay(0.03)
        .on("tick", () => setSimNodes([...clonedNodes]));

      simRef.current = sim;
    } else {
      const laid = computeLayout(filteredNodes, filteredEdges, layoutMode, dims.w, dims.h);
      setSimNodes(laid);
      simRef.current = null;
    }

    return () => { simRef.current?.stop(); };
  }, [filteredNodes, filteredEdges, layoutMode, dims]);

  // ─── Pathfinder logic ────────────────────────────────────────
  useEffect(() => {
    if (!pathStart || !pathEnd) { setPathNodes(new Set()); setPathEdges(new Set()); return; }
    const path = bfsPath(filteredEdges, pathStart, pathEnd);
    if (!path) { setPathNodes(new Set()); setPathEdges(new Set()); return; }
    setPathNodes(new Set(path));
    const pe = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      pe.add(`${path[i]}_${path[i + 1]}`);
      pe.add(`${path[i + 1]}_${path[i]}`);
    }
    setPathEdges(pe);
  }, [pathStart, pathEnd, filteredEdges]);

  // ─── Interaction handlers ────────────────────────────────────
  const handleBgMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('.graph-node')) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragNodeId && simRef.current) {
      const node = simRef.current.nodes().find(n => n.id === dragNodeId);
      if (node) {
        node.fx = (e.clientX - pan.x) / zoom;
        node.fy = (e.clientY - pan.y) / zoom;
        simRef.current.alpha(0.3).restart();
      }
      return;
    }
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [dragging, dragNodeId, pan, zoom]);

  const handleMouseUp = useCallback(() => {
    if (dragNodeId && simRef.current) {
      const node = simRef.current.nodes().find(n => n.id === dragNodeId);
      if (node && !node.pinned) { node.fx = null; node.fy = null; }
    }
    setDragging(false);
    setDragNodeId(null);
  }, [dragNodeId]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, node: SimNode) => {
    e.stopPropagation();

    // Setup for potential drag
    setDragNodeId(node.id);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    lastPos.current = { x: clientX, y: clientY };

    // Setup for hold detection
    holdTriggered.current = false;
    setHoldProgressNode(node.id);

    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      holdTriggered.current = true;
      setHoldProgressNode(null);
      onNodeHold?.(node); // Trigger 500ms hold action
    }, 500);
  }, [onNodeHold]);

  const handleNodeMouseUp = useCallback((e: React.MouseEvent | React.TouchEvent, node: SimNode) => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldProgressNode(null);

    // If hold wasn't triggered, treat it as a tap
    if (!holdTriggered.current) {
      if (pathMode) {
        if (!pathStart) { setPathStart(node.id); }
        else if (!pathEnd) { setPathEnd(node.id); }
        else { setPathStart(node.id); setPathEnd(null); }
      } else {
        onNodeSelect?.(node); // Trigger fast navigation tap action
        analyzeNode(node.id); // Trigger AI Intelligence Analysis in Canvas Mode
      }
    }

    // Clean up drag
    setDragNodeId(null);
    if (!node.pinned && simRef.current) {
      const sn = simRef.current.nodes().find(n => n.id === node.id);
      if (sn && !sn.pinned) { sn.fx = null; sn.fy = null; }
    }
  }, [pathMode, pathStart, pathEnd, onNodeSelect]);

  const handleNodeClick = useCallback((node: SimNode) => {
    // Deprecated in favor of the custom down/up tap logic to prevent conflicts
  }, []);

  const handleNodeDblClick = useCallback((node: SimNode) => {
    if (simRef.current) {
      const sn = simRef.current.nodes().find(n => n.id === node.id);
      if (sn) {
        sn.pinned = !sn.pinned;
        if (sn.pinned) { sn.fx = sn.x; sn.fy = sn.y; }
        else { sn.fx = null; sn.fy = null; }
        simRef.current.alpha(0.1).restart();
      }
    }
  }, []);

  // Workflow Handlers
  const handleExpand = useCallback(async (address: string, chain: string) => {
    try {
      const res = await investigationApi.expand(address, chain);
      if (res.data?.success) {
        const { nodes, edges } = res.data.data;
        setLiveNodes(prev => [...prev, ...nodes]);
        setLiveEdges(prev => [...prev, ...edges]);
      }
    } catch (e) {
      console.error("Expand failed", e);
    }
  }, []);

  const handleTrace = useCallback(async (address: string, chain: string) => {
    try {
      const res = await investigationApi.trace(address, chain, 2);
      if (res.data?.success) {
        const { nodes, edges } = res.data.data;
        setLiveNodes(prev => [...prev, ...nodes]);
        setLiveEdges(prev => [...prev, ...edges]);
        // Note: trace will naturally pull endpoints. D3 will render them.
      }
    } catch (e) {
      console.error("Trace failed", e);
    }
  }, []);

  const handleWatch = useCallback(async (address: string, chain: string) => {
    try {
      await monitorApi.add(address, chain);
      // Optional: highlight visually
    } catch (e) {
      console.error("Watch failed", e);
    }
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────
  const nodeRadius = (n: SimNode) => {
    const base = n.isTarget ? 18 : 8;
    return Math.max(base, Math.min(28, base + (n.txCount || 0) * 0.5));
  };

  const nodeColor = (n: SimNode) => {
    if (aiInsights.suspiciousNodes.has(n.id)) return "hsl(0, 85%, 55%)"; // AI Predicted Suspect (RED)
    if (n.type === "target" || n.isTarget) return "hsl(185, 80%, 55%)";
    if (n.type === "exchange") return "hsl(220, 70%, 60%)";
    if (n.type === "suspect") return "hsl(0, 72%, 55%)";
    if (n.type === "hub") return "hsl(45, 70%, 55%)";
    return "hsl(215, 15%, 45%)";
  };

  const nodeOpacity = (n: SimNode) => {
    if (pathNodes.size > 0) return pathNodes.has(n.id) ? 1 : 0.15;
    if (n.isTarget || n.type === "suspect" || n.type === "exchange") return 1;
    return 0.6;
  };

  const edgeKey = (e: SimEdge) => `${e.source}_${e.target}`;
  const maxEdgeVol = useMemo(() => Math.max(...filteredEdges.map(e => e.volume), 0.001), [filteredEdges]);

  // ─── Render ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div ref={containerRef} className="graph-canvas relative h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">Loading graph intel...</p>
        </div>
      </div>
    );
  }

  // Empty state — filter produced 0 results vs no data at all
  const isFilterEmpty = mergedGraphData && allNodes.length > 0 && simNodes.length === 0;

  if (!mergedGraphData || (allNodes.length === 0 && simNodes.length === 0)) {
    return (
      <div ref={containerRef} className="graph-canvas relative h-full flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">No graph data available</p>
      </div>
    );
  }

  const layoutLabels: Record<LayoutMode, string> = {
    force: "Force", radial: "Radial", hierarchical: "Hierarchy", flow: "Flow", cluster: "Cluster"
  };
  const filterLabels: Record<FilterMode, string> = {
    all: "All", suspect: "Suspects", exchange: "Exchanges", hub: "Hubs", "high-value": "High Value"
  };

  return (
    <div ref={containerRef} className={`graph-canvas relative overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 bg-background h-screen w-screen" : "h-full"}`}>
      {/* Empty filter state */}
      {isFilterEmpty && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Filter className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase mb-2">No nodes match current filter</p>
            <button onClick={() => { setFilterMode("all"); setSimplified(false); }} className="text-[9px] font-mono text-primary border border-primary/40 px-3 py-1 rounded hover:bg-primary/10 transition-colors">
              Reset Filters
            </button>
          </div>
        </div>
      )}
      {/* ─ TOP CONTROL BAR ─ */}
      <div className="absolute top-2 left-3 right-12 z-20 flex items-center gap-1.5 flex-wrap">
        {/* Layout Selector */}
        <div className="flex items-center bg-card/90 backdrop-blur-sm border border-border rounded overflow-hidden">
          <span className="text-[8px] text-muted-foreground font-mono px-2 tracking-widest uppercase flex items-center gap-1"><Layers className="h-2.5 w-2.5" />Layout</span>
          {(Object.keys(layoutLabels) as LayoutMode[]).map(m => (
            <button key={m} onClick={() => setLayoutMode(m)} className={`text-[8px] font-mono px-2 py-1.5 transition-colors ${layoutMode === m ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              {layoutLabels[m]}
            </button>
          ))}
        </div>
        {/* Filter Selector */}
        <div className="flex items-center bg-card/90 backdrop-blur-sm border border-border rounded overflow-hidden">
          <span className="text-[8px] text-muted-foreground font-mono px-2 tracking-widest uppercase flex items-center gap-1"><Filter className="h-2.5 w-2.5" />Filter</span>
          {(Object.keys(filterLabels) as FilterMode[]).map(m => (
            <button key={m} onClick={() => setFilterMode(m)} className={`text-[8px] font-mono px-2 py-1.5 transition-colors ${filterMode === m ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
              {filterLabels[m]}
            </button>
          ))}
        </div>
        {/* Action Buttons */}
        <button onClick={() => setSimplified(!simplified)} className={`text-[8px] font-mono px-2.5 py-1.5 border rounded transition-colors bg-card/90 backdrop-blur-sm ${simplified ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
          <Minimize2 className="h-2.5 w-2.5 inline mr-1" />Simplify
        </button>
        <button onClick={() => { setPathMode(!pathMode); setPathStart(null); setPathEnd(null); setPathNodes(new Set()); setPathEdges(new Set()); }}
          className={`text-[8px] font-mono px-2.5 py-1.5 border rounded transition-colors bg-card/90 backdrop-blur-sm ${pathMode ? "border-yellow-500 text-yellow-400 bg-yellow-500/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
          <GitBranch className="h-2.5 w-2.5 inline mr-1" />Path Finder
        </button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setFilterMode("all"); setSimplified(false); setPathMode(false); setPathStart(null); setPathEnd(null); setPathNodes(new Set()); setPathEdges(new Set()); setLayoutMode("force"); }}
          className="text-[8px] font-mono px-2.5 py-1.5 border border-border rounded text-muted-foreground hover:text-foreground bg-card/90 backdrop-blur-sm">
          Reset
        </button>
      </div>

      {/* Path finder status */}
      {pathMode && (
        <div className="absolute top-11 left-3 z-20 text-[8px] font-mono bg-yellow-500/10 border border-yellow-500/30 rounded px-2 py-1 text-yellow-400">
          {!pathStart ? "Click SOURCE node" : !pathEnd ? "Click DESTINATION node" : `Path: ${pathNodes.size} hops`}
        </div>
      )}

      {/* AI Intelligence Error Failsafe */}
      {aiError && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-20 text-[9px] font-mono bg-hud-red/10 border border-hud-red/30 rounded px-3 py-1.5 text-hud-red shadow-lg backdrop-blur-sm flex items-center gap-1.5">
          <Layers className="h-3 w-3" />
          {aiError}
        </div>
      )}
      
      {/* AI Processing Indicator */}
      {isAiLoading && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-20 text-[9px] font-mono bg-primary/10 border border-primary/30 rounded px-3 py-1.5 text-primary shadow-lg backdrop-blur-sm flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Analyzing intelligence...
        </div>
      )}

      {/* HUD info */}
      <div className="absolute bottom-3 left-3 z-10">
        <div className="flex items-center gap-2 text-[8px] font-mono text-muted-foreground bg-card/80 backdrop-blur-sm border border-border rounded px-2 py-1">
          <Crosshair className="h-2.5 w-2.5 text-primary" />
          <span className="tracking-widest uppercase">Network Graph</span>
          <span className="text-primary">·</span>
          <span>{simNodes.length} nodes</span>
          <span className="text-primary">·</span>
          <span>{filteredEdges.length} flows</span>
          <span className="text-primary">·</span>
          <span className={`flex items-center gap-1 ${sseConnected ? "text-green-400" : "text-red-400"}`}>
            <Radio className="h-2 w-2" />
            {sseConnected ? "LIVE" : "OFFLINE"}
          </span>
          {liveNodes.length > 0 && (
            <><span className="text-primary">·</span><span className="text-yellow-400">+{liveNodes.length} live</span></>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-card/80 backdrop-blur-sm border border-border rounded px-2 py-1.5 flex flex-col gap-0.5">
        {[["Target", "hsl(185,80%,55%)"], ["Suspect", "hsl(0,72%,55%)"], ["Exchange", "hsl(220,70%,60%)"], ["Hub", "hsl(45,70%,55%)"], ["Normal", "hsl(215,15%,45%)"]].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color as string }} />
            <span className="text-[7px] font-mono text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Zoom & Fullscreen Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 border border-border backdrop-blur-sm hover:border-primary/40" onClick={() => setZoom(z => Math.min(z + 0.2, 3))}>
          <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 border border-border backdrop-blur-sm hover:border-primary/40" onClick={() => setZoom(z => Math.max(z - 0.2, 0.3))}>
          <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className={`h-7 w-7 border backdrop-blur-sm ${isFullscreen ? "bg-primary/20 border-primary text-primary" : "bg-card/80 border-border hover:border-primary/40"}`} onClick={() => { setIsFullscreen(!isFullscreen); setZoom(1); setPan({ x: 0, y: 0 }); }} title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />}
        </Button>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (() => {
        const hn = simNodes.find(n => n.id === hoveredNode);
        if (!hn) return null;
        return (
          <div className="absolute z-30 bg-card border border-border rounded-md p-2 shadow-lg pointer-events-none" style={{ left: hn.x * zoom + pan.x + 20, top: hn.y * zoom + pan.y - 20 }}>
            <p className="text-[9px] font-mono text-primary">{hn.address?.substring(0, 18)}...</p>
            <p className="text-[8px] font-mono text-muted-foreground">Type: {hn.type} · Risk: {hn.riskScore}%</p>
            <p className="text-[8px] font-mono text-muted-foreground">Txs: {hn.txCount} · Pinned: {hn.pinned ? "Yes" : "No"}</p>
            {(hn.anonymity_score || 0) >= 40 && (
              <div className="mt-1 pt-1 border-t border-border/50">
                <p className="text-[8px] font-mono text-hud-red">Anonymity: {hn.anonymity_score}%</p>
                {hn.ip_signals && hn.ip_signals.length > 0 && (
                  <p className="text-[8px] font-mono text-hud-red/80">{hn.ip_signals.join(" / ")}</p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* SVG Canvas */}
      <svg className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleBgMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="c" /><feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="glow-strong"><feGaussianBlur stdDeviation="6" result="c" /><feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(185,60%,45%)" opacity="0.5" />
          </marker>
          <marker id="arrow-highlight" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(50,90%,60%)" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {filteredEdges.map((edge, i) => {
            const sourceNode = simNodes.find(n => n.id === edge.source);
            const targetNode = simNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            const ek = edgeKey(edge);
            const isPathEdge = pathEdges.has(ek);
            const thickness = Math.max(0.5, Math.min(5, (edge.volume / maxEdgeVol) * 5));
            const opacity = pathNodes.size > 0 ? (isPathEdge ? 0.9 : 0.05) : Math.max(0.08, Math.min(0.4, thickness / 5));

            // Offset line end by node radius so arrow is visible
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const tr = nodeRadius(targetNode) + 4;
            const endX = targetNode.x - (dx / dist) * tr;
            const endY = targetNode.y - (dy / dist) * tr;

            return (
              <line key={i}
                x1={sourceNode.x} y1={sourceNode.y}
                x2={endX} y2={endY}
                stroke={isPathEdge ? "hsl(50,90%,60%)" : "hsl(185,60%,45%)"}
                strokeWidth={isPathEdge ? 2.5 : thickness}
                strokeOpacity={opacity}
                markerEnd={isPathEdge ? "url(#arrow-highlight)" : "url(#arrow)"}
              />
            );
          })}

          {/* AI Predicted Edges */}
          {aiInsights.predictedEdges.map((edge, i) => {
            const sourceNode = simNodes.find(n => n.id === edge.source);
            const targetNode = simNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            return (
              <line key={`ai_${i}`}
                x1={sourceNode.x} y1={sourceNode.y}
                x2={targetNode.x} y2={targetNode.y}
                stroke="hsl(0, 85%, 55%)"
                strokeWidth={2}
                strokeOpacity={0.8}
                strokeDasharray="4 4"
                className="animate-pulse"
              />
            );
          })}

          {/* Nodes */}
          {simNodes.map(node => {
            const r = nodeRadius(node);
            const color = nodeColor(node);
            const op = nodeOpacity(node);
            const isSelected = node.id === selectedNodeId;
            const isHovered = node.id === hoveredNode;

            return (
              <g key={node.id} className="graph-node cursor-pointer"
                onDoubleClick={() => handleNodeDblClick(node)}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseUp={(e) => handleNodeMouseUp(e, node)}
                onMouseLeave={(e) => {
                  setHoveredNode(null);
                  handleNodeMouseUp(e, node); // cancel hold if mouse leaves
                }}
                onTouchStart={(e) => handleNodeMouseDown(e, node)}
                onTouchEnd={(e) => handleNodeMouseUp(e, node)}
                onMouseEnter={() => setHoveredNode(node.id)}
              >
                {/* Hold Progress Indicator */}
                {holdProgressNode === node.id && (
                  <circle cx={node.x} cy={node.y} r={r + 12} fill="none" stroke="currentColor" strokeWidth={2}
                    className="text-teal-400 opacity-60 transition-all duration-500 origin-[cx_cy] animate-[spin_1s_linear_infinite]"
                    strokeDasharray={`${Math.PI * 2 * (r + 12)}`}
                    strokeDashoffset="0"
                  />
                )}

                {/* Selection ring */}
                {(isSelected || isHovered) && <circle cx={node.x} cy={node.y} r={r + 8} fill={color} opacity={0.12} filter="url(#glow-strong)" />}

                {/* High Anonymity Pulse */}
                {(node.anonymity_score || 0) >= 80 && (
                  <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke="hsl(0,90%,60%)" strokeWidth={1}
                    className="opacity-60 transition-all duration-700 origin-[cx_cy] animate-[ping_2s_linear_infinite]"
                  />
                )}

                {/* Pinned indicator */}
                {node.pinned && <circle cx={node.x} cy={node.y} r={r + 5} fill="none" stroke="hsl(45,90%,60%)" strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />}

                {/* Outer ring: size = importance */}
                <circle cx={node.x} cy={node.y} r={r}
                  fill="transparent" stroke={color}
                  strokeWidth={node.isTarget ? 2.5 : isSelected ? 2 : 1}
                  opacity={op}
                  filter={node.isTarget || node.type === "suspect" ? "url(#glow)" : undefined}
                />
                {/* Inner fill */}
                <circle cx={node.x} cy={node.y} r={r * 0.45}
                  fill={color} opacity={op * (node.isTarget ? 1 : 0.7)}
                />

                {/* Label */}
                <text x={node.x} y={node.y + r + 11} textAnchor="middle"
                  className="text-[7px] font-mono" fill="hsl(215,15%,55%)" opacity={op}>
                  {node.label}
                </text>
                {/* Type tag for special nodes */}
                {(node.type === "exchange" || node.type === "suspect" || node.type === "hub") && (
                  <text x={node.x} y={node.y - r - 4} textAnchor="middle"
                    className="text-[6px] font-mono uppercase tracking-widest" fill={color} opacity={op * 0.8}>
                    {node.type}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Node Intelligence Card */}
      {selectedNodeId && (() => {
        const node = simNodes.find(n => n.id === selectedNodeId) || allNodes.find(n => n.id === selectedNodeId);
        if (!node) return null;
        return (
          <NodeIntelligenceCard
            key={node.id}
            address={node.address || node.id}
            chain={node.chain || "ethereum"}
            onClose={() => onNodeSelect?.(null)}
            onFocusNode={(addr) => {
              const target = simNodes.find(n => n.id === addr || n.address?.toLowerCase() === addr.toLowerCase());
              if (target) {
                onNodeSelect?.(target);
              }
            }}
            onTrace={() => handleTrace(node.address || node.id, node.chain || "ethereum")}
            onExpand={() => handleExpand(node.address || node.id, node.chain || "ethereum")}
            onWatch={() => handleWatch(node.address || node.id, node.chain || "ethereum")}
          />
        );
      })()}
    </div>
  );
};
