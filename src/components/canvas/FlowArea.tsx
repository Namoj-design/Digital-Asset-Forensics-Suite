import { useCallback, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    ReactFlowProvider,
    NodeTypes,
    ReactFlowInstance
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '@/stores/useCanvasStore';
import { Handle, Position, BaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react';
import { Wallet, Building, RefreshCcw, Link2, Ghost, Activity, FileCode2, Trash2, ShieldAlert } from "lucide-react";

// Custom Edge Component
const ThreatEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, data }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    
    const volume = data?.volume ? parseFloat(String(data.volume)) : 0;
    // Logarithmic thickness scaling (cap between 1.5 and 8)
    const strokeWidth = Math.max(1.5, Math.min(8, Math.log10(volume + 1) * 2));
    const isHighRisk = Number(data?.riskScore || 0) >= 75 || data?.isSuspicious;

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth,
                    stroke: isHighRisk ? '#ef4444' : '#3b82f6',
                    filter: isHighRisk ? 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.8))' : 'none',
                }}
                className={isHighRisk ? 'react-flow__edge-path animate-pulse' : 'react-flow__edge-path'}
            />
            {volume > 0 && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan bg-background/80 backdrop-blur-sm border border-border px-1.5 py-0.5 rounded text-[8px] font-mono text-muted-foreground"
                    >
                        {volume.toFixed(2)} VOL
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

// Custom Node Components
const BaseNode = ({ data, typeColor, Icon }: any) => {
    let riskBorder = typeColor;
    let iconClass = 'text-muted-foreground';
    let pulseClass = '';
    
    if (data.riskScore >= 75) {
        riskBorder = 'border-hud-red shadow-[0_0_20px_rgba(220,38,38,0.5)] bg-hud-red/10';
        iconClass = 'text-hud-red';
        pulseClass = 'animate-pulse';
    } else if (data.riskScore >= 40) {
        riskBorder = 'border-hud-yellow shadow-[0_0_15px_rgba(234,179,8,0.3)] bg-hud-yellow/10';
        iconClass = 'text-hud-yellow';
    } else if (data.riskScore > 0) {
        riskBorder = 'border-hud-blue shadow-[0_0_15px_rgba(59,130,246,0.3)] bg-hud-blue/5';
        iconClass = 'text-hud-blue';
    }

    return (
        <div className="flex flex-col items-center group relative z-10 w-24">
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-primary !border-border !top-[-4px]" />
            
            {/* The Circular Node */}
            <div className={`w-14 h-14 rounded-full border-[3px] flex items-center justify-center transition-all bg-card backdrop-blur-md ${riskBorder} ${pulseClass}`}>
                {Icon && <Icon className={`w-6 h-6 ${iconClass}`} />}
            </div>

            {/* Floating Risk Badge (If Risky) */}
            {data.riskScore >= 75 && (
                <div className="absolute -top-3 -right-3 bg-hud-red text-background text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-background shadow-lg z-20">
                    {data.riskScore}
                </div>
            )}

            {/* Label Base */}
            <div className="mt-2 bg-card/90 backdrop-blur-md border border-border px-2 py-1 rounded shadow-md text-center max-w-[120px] transition-all group-hover:scale-105">
                <div className="text-[9px] font-mono text-foreground truncate w-full" title={data.address || 'Unknown'}>
                    {data.address ? `${data.address.substring(0, 8)}...` : 'Undefined'}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-primary !border-border !bottom-[-4px]" />
        </div>
    );
};

const nodeTypes: NodeTypes = {
    walletNode: (props) => <BaseNode {...props} typeColor="border-primary/50" Icon={Wallet} />,
    exchangeNode: (props) => <BaseNode {...props} typeColor="border-hud-yellow/50" Icon={Building} />,
    mixerNode: (props) => <BaseNode {...props} typeColor="border-hud-red/50" Icon={RefreshCcw} />,
    bridgeNode: (props) => <BaseNode {...props} typeColor="border-hud-blue/50" Icon={Link2} />,
    suspectNode: (props) => <BaseNode {...props} typeColor="border-hud-red shadow-[0_0_20px_rgba(220,38,38,0.8)]" Icon={Ghost} />,
    defiNode: (props) => <BaseNode {...props} typeColor="border-purple-400/50" Icon={Activity} />,
    contractNode: (props) => <BaseNode {...props} typeColor="border-slate-400/50" Icon={FileCode2} />,
};

const edgeTypes = {
    threat: ThreatEdge
};

export const FlowArea = () => {
    const { 
        nodes, edges, 
        selectedNodeId,
        setNodes, setEdges,
        onNodesChange, onEdgesChange, onConnect, 
        addNode, setSelectedNodeId 
    } = useCanvasStore();
    
    const [isDraggingNode, setIsDraggingNode] = useState(false);
    const [isHoveringTrash, setIsHoveringTrash] = useState(false);
    
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

    const onNodeDragStart = useCallback(() => setIsDraggingNode(true), []);
    
    const onNodeDrag = useCallback((event: React.MouseEvent, node: any) => {
        const trashElement = document.getElementById('trash-drop-zone');
        if (trashElement) {
            const rect = trashElement.getBoundingClientRect();
            const hover = event.clientX >= rect.left &&
                          event.clientX <= rect.right &&
                          event.clientY >= rect.top &&
                          event.clientY <= rect.bottom;
            setIsHoveringTrash(hover);
        }
    }, []);

    const onNodeDragStop = useCallback((event: React.MouseEvent, node: any) => {
        setIsDraggingNode(false);
        setIsHoveringTrash(false);
        const trashElement = document.getElementById('trash-drop-zone');
        if (trashElement) {
            const rect = trashElement.getBoundingClientRect();
            if (
                event.clientX >= rect.left &&
                event.clientX <= rect.right &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom
            ) {
                // Delete node
                setNodes(nodes.filter(n => n.id !== node.id));
                setEdges(edges.filter(e => e.source !== node.id && e.target !== node.id));
                if (selectedNodeId === node.id) setSelectedNodeId(null);
            }
        }
    }, [nodes, edges, selectedNodeId, setNodes, setEdges, setSelectedNodeId]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) return;
            if (!reactFlowInstance.current) return;

            const position = reactFlowInstance.current.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode = {
                id: `node_${Date.now()}`,
                type,
                position,
                data: { address: '', riskScore: 0 },
            };

            addNode(newNode);
        },
        [addNode]
    );

    return (
        <div className="flex-1 h-full w-full relative" ref={reactFlowWrapper}>
            <ReactFlowProvider>
                {/* Custom Trash Drop Zone */}
                <div 
                    id="trash-drop-zone"
                    className={`absolute bottom-8 right-56 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto shadow-xl ${
                        isHoveringTrash 
                            ? 'bg-hud-red scale-125 border-hud-red/80 shadow-[0_0_30px_rgba(239,68,68,0.8)]' 
                            : isDraggingNode 
                                ? 'bg-card/95 border-2 border-hud-red/50 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                                : 'bg-card/80 border border-border/50 scale-100 opacity-60 hover:opacity-100'
                    }`}
                >
                    <Trash2 className={`w-5 h-5 transition-colors ${isHoveringTrash ? 'text-white' : 'text-hud-red'}`} />
                </div>
                
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={(instance) => (reactFlowInstance.current = instance)}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeDragStart={onNodeDragStart}
                    onNodeDrag={onNodeDrag}
                    onNodeDragStop={onNodeDragStop}
                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                    onPaneClick={() => setSelectedNodeId(null)}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    defaultEdgeOptions={{ type: 'threat', animated: true }}
                    fitView
                    className="bg-background"
                    proOptions={{ hideAttribution: true }}
                >
                    <Background color="#3f3f46" gap={24} size={1.5} className="opacity-40" />
                    <Controls className="!bg-card/90 backdrop-blur-md !border-border fill-foreground shadow-xl rounded-md overflow-hidden" position="bottom-left" />
                </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
};
