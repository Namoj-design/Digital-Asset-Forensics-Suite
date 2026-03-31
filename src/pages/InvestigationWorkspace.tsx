import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { WalletPanel } from "@/components/investigation/WalletPanel";
import { GraphCanvas } from "@/components/investigation/GraphCanvas";
import { TransactionTable } from "@/components/investigation/TransactionTable";
import { LiveGraphNode } from "@/hooks/useEtherscan";
import { Input } from "@/components/ui/input";
import { Search, Crosshair, Radio, ShieldAlert, Loader2, Network, ExternalLink, HardDriveDownload } from "lucide-react";
import { ChainId as EtherscanChainId } from "@/lib/etherscan";
import { casesApi, canvasApi } from "@/lib/api";
import { useEffect } from "react";
import { useChain, ChainId as AppChainId } from "@/contexts/ChainContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DEFAULT_ADDRESS = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const InvestigationWorkspace = () => {
  const { caseId } = useParams();
  const [searchParams] = useSearchParams();
  const initialAddr = searchParams.get("address") || DEFAULT_ADDRESS;

  const [address, setAddress] = useState(initialAddr);
  const [inputAddr, setInputAddr] = useState(initialAddr);
  const [selectedNode, setSelectedNode] = useState<string | undefined>();
  const [selectedAddress, setSelectedAddress] = useState<string>(initialAddr);
  const [caseData, setCaseData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const [syncStatus, setSyncStatus] = useState<'synced'|'desynced'|'no_canvas' | null>(null);
  const [canvasLink, setCanvasLink] = useState<string | null>(null);

  const { selectedChain, chainConfig, setSelectedChain } = useChain();
  const [scanChainId, setScanChainId] = useState<EtherscanChainId>(chainConfig.scanId as EtherscanChainId);

  useEffect(() => {
    if (caseId && caseId.startsWith('CASE-')) {
      casesApi.get(caseId).then(res => {
        if (res.data?.success && res.data.data) {
          const dbCase = res.data.data;
          setAddress(dbCase.target_wallet);
          setSelectedAddress(dbCase.target_wallet);
          setInputAddr(dbCase.target_wallet);

          if (dbCase.chain) {
            const chainStr = dbCase.chain.toLowerCase();
            setSelectedChain(chainStr as AppChainId);
            const cMap: Record<string, EtherscanChainId> = { "ethereum": 1, "polygon": 137, "bnb": 56, "arbitrum": 42161, "optimism": 10, "base": 8453, "avalanche": 43114 };
            if (cMap[chainStr]) setScanChainId(cMap[chainStr]);
          }

          try {
            const parsedGraph = typeof dbCase.graph_data === 'string' ? JSON.parse(dbCase.graph_data) : dbCase.graph_data;
            setCaseData(parsedGraph);
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      });

      // Poll sync status
      canvasApi.getSyncStatus(caseId).then(res => {
         if (res.data?.success) {
           setSyncStatus(res.data.status);
           if (res.data.canvas_id) setCanvasLink(res.data.canvas_id);
         }
      });

    } else {
      setScanChainId(chainConfig.scanId as EtherscanChainId);
    }
  }, [caseId, chainConfig.scanId]);

  const handleNodeSelect = (node: LiveGraphNode | null) => {
    // Tap just navigates local panel, closes HUD
    setSelectedAddress(node?.address || address || DEFAULT_ADDRESS);
    setSelectedNode(undefined);
  };

  const handleNodeHold = (node: LiveGraphNode) => {
    // Hold opens Deep Intelligence HUD
    setSelectedNode(node.id);
    setSelectedAddress(node.address || address || DEFAULT_ADDRESS);
  };

  const handleSearch = () => {
    const trimmed = inputAddr.trim();
    if (trimmed.length === 42 && trimmed.startsWith("0x")) {
      setAddress(trimmed);
      setSelectedAddress(trimmed);
      setSelectedNode(undefined);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2.5rem)]">
      {/* Header bar */}
      <div className="px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crosshair className="h-3.5 w-3.5 text-primary" />
          <div>
            <h2 className="text-[11px] font-bold text-foreground tracking-[0.15em] uppercase">
              Investigation {caseId || "Workspace"}
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-[9px] text-muted-foreground font-mono">Live wallet flow analysis — {chainConfig?.name}</p>
              <Radio className="h-2.5 w-2.5 text-primary animate-pulse-glow" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 flex-1 ml-4">
          
          {canvasLink && (
            <div className="flex items-center gap-3 mr-2 border-r border-border pr-4">
               {syncStatus === 'synced' ? (
                 <span className="text-[9px] text-hud-blue tracking-widest uppercase flex items-center gap-1"><Network className="h-3 w-3" /> Synced</span>
               ) : syncStatus === 'desynced' ? (
                 <span className="text-[9px] text-hud-yellow tracking-widest uppercase flex items-center gap-1"><HardDriveDownload className="h-3 w-3 animate-pulse" /> Out of Sync</span>
               ) : null}
               <Button variant="outline" size="sm" className="h-7 px-3 text-[10px] font-mono tracking-widest border-primary/30 text-primary hover:bg-primary/20" asChild>
                  <Link to={`/canvas/${canvasLink}`}><ExternalLink className="mr-1.5 h-3 w-3" /> OPEN CANVAS</Link>
               </Button>
            </div>
          )}

          {caseData?.insights?.suspicious_wallets?.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-hud-red/10 border border-hud-red/20 rounded">
              <ShieldAlert className="h-3 w-3 text-hud-red animate-pulse" />
              <span className="text-[9px] text-hud-red font-mono tracking-widest">{caseData.insights.suspicious_wallets.length} Threats</span>
            </div>
          )}
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Target address..."
              className="pl-8 font-mono text-[10px] h-7 bg-background border-border"
              value={inputAddr}
              onChange={e => setInputAddr(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="btn-tactical h-7 text-[9px] px-3">Trace</button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="flex flex-1 min-h-0">
        <WalletPanel address={selectedAddress} chainId={scanChainId} />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 relative bg-background">
            {caseId && !caseData ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-10">
                <div className="bg-background/80 p-6 border border-border rounded-lg max-w-sm text-center shadow-2xl">
                  <div className="mx-auto w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center bg-primary/5 mb-4">
                    <Crosshair className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2 uppercase tracking-widest">Canvas Not Initialized</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mb-5">An investigator must initialize the visual canvas to begin tracing and analyzing the target's network flows.</p>
                  <button 
                    disabled={isInitializing}
                    onClick={async () => {
                      try {
                        setIsInitializing(true);
                        const res = await casesApi.initializeCanvas(caseId);
                        if (res.data?.success) {
                          const graphData = typeof res.data.data.graph_data === 'string' ? JSON.parse(res.data.data.graph_data) : res.data.data.graph_data;
                          setCaseData(graphData);
                        }
                      } catch (err) {
                        console.error("Failed to initialize canvas:", err);
                      } finally {
                        setIsInitializing(false);
                      }
                    }}
                    className="btn-tactical text-[10px] px-6 py-2.5 w-full flex items-center justify-center gap-2"
                  >
                    {isInitializing ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Compiling Intelligence Graph...</>
                    ) : (
                      "Create Intelligence Canvas"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <GraphCanvas
                address={address}
                chainId={scanChainId}
                onNodeSelect={handleNodeSelect}
                onNodeHold={handleNodeHold}
                selectedNodeId={selectedNode}
                caseGraph={caseData?.graph || caseData}
              />
            )}
          </div>
        </div>
      </div>

      {/* Transaction feed */}
      <div className="shrink-0 max-h-64 overflow-auto border-t border-border">
        <TransactionTable address={address} chainId={scanChainId} />
      </div>
    </div>
  );
};

export default InvestigationWorkspace;
