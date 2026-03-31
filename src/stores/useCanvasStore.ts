import { create } from 'zustand';
import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';

export type CanvasState = {
    canvasId: string | null;
    caseId: string | null;
    canvasName: string;
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number, y: number, zoom: number };
    selectedNodeId: string | null;
    aiLoading: boolean;
    hasUnsavedChanges: boolean;
    copilotMessages: { role: "user" | "ai"; content: string }[];
    lastActions: string[];
    
    // Actions
    setCanvasId: (id: string | null) => void;
    setCaseId: (id: string | null) => void;
    setCanvasName: (name: string) => void;
    
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    setViewport: (viewport: { x: number, y: number, zoom: number }) => void;
    addNode: (node: Node) => void;
    setSelectedNodeId: (id: string | null) => void;
    
    setAiLoading: (loading: boolean) => void;
    addCopilotMessage: (msg: { role: "user" | "ai"; content: string }) => void;
    setLastActions: (actions: string[]) => void;
    markSaved: () => void;
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
    canvasId: null,
    caseId: null,
    canvasName: 'Untitled Investigation',
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodeId: null,
    aiLoading: false,
    hasUnsavedChanges: false,
    copilotMessages: [
        { role: "ai", content: "Agent initialized. I can automatically trace wallets, detect laundering hops, and correlate suspicious networks. How can I assist this investigation?" }
    ],
    lastActions: [],
    
    setCanvasId: (id) => set({ canvasId: id }),
    setCaseId: (id) => set({ caseId: id }),
    setCanvasName: (name) => set({ canvasName: name, hasUnsavedChanges: true }),
    
    onNodesChange: (changes: NodeChange[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
            hasUnsavedChanges: true,
        });
    },
    
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
            hasUnsavedChanges: true,
        });
    },
    
    onConnect: (connection: Connection) => {
        set({
            edges: addEdge({ ...connection, animated: true }, get().edges),
            hasUnsavedChanges: true,
        });
    },
    
    setNodes: (nodes) => set({ nodes, hasUnsavedChanges: true }),
    setEdges: (edges) => set({ edges, hasUnsavedChanges: true }),
    setViewport: (viewport) => set({ viewport, hasUnsavedChanges: true }),
    
    addNode: (node) => set({ 
        nodes: [...get().nodes, node],
        hasUnsavedChanges: true
    }),
    
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    
    setAiLoading: (loading) => set({ aiLoading: loading }),
    addCopilotMessage: (msg) => set(state => ({ copilotMessages: [...state.copilotMessages, msg] })),
    setLastActions: (actions) => set({ lastActions: actions }),
    markSaved: () => set({ hasUnsavedChanges: false }),
}));
