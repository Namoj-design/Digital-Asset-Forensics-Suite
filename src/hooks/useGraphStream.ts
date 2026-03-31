import { useState, useEffect, useCallback, useRef } from "react";

interface GraphEvent {
    type: "NEW_TRANSACTION" | "ALERT" | "HEARTBEAT" | "CONNECTED";
    chain?: string;
    tx_hash?: string;
    from?: string;
    to?: string;
    value?: string;
    timestamp?: string;
    anomaly_score?: number;
    case_id?: string;
    severity?: string;
    description?: string;
    wallet?: string;
}

interface NewNodeData {
    id: string;
    address: string;
    label: string;
    type: string;
    isTarget: boolean;
}

interface NewEdgeData {
    source: string;
    target: string;
    volume: number;
    transfers: number;
}

export function useGraphStream(caseId?: string) {
    const [events, setEvents] = useState<GraphEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [pendingNodes, setPendingNodes] = useState<NewNodeData[]>([]);
    const [pendingEdges, setPendingEdges] = useState<NewEdgeData[]>([]);
    const sourceRef = useRef<EventSource | null>(null);

    const connect = useCallback(() => {
        if (sourceRef.current) sourceRef.current.close();

        const url = `/api/stream/graph${caseId ? `?case_id=${caseId}` : ""}`;
        const es = new EventSource(url);

        es.onmessage = (event) => {
            try {
                const data: GraphEvent = JSON.parse(event.data);

                if (data.type === "CONNECTED") {
                    setConnected(true);
                    return;
                }
                if (data.type === "HEARTBEAT") return;

                if (data.type === "NEW_TRANSACTION") {
                    // Queue new nodes and edges for graph
                    if (data.from) {
                        setPendingNodes(prev => {
                            if (prev.some(n => n.id === data.from)) return prev;
                            return [...prev, {
                                id: data.from!,
                                address: data.from!,
                                label: `${data.from!.substring(0, 8)}...`,
                                type: "normal",
                                isTarget: false,
                            }];
                        });
                    }
                    if (data.to) {
                        setPendingNodes(prev => {
                            if (prev.some(n => n.id === data.to)) return prev;
                            return [...prev, {
                                id: data.to!,
                                address: data.to!,
                                label: `${data.to!.substring(0, 8)}...`,
                                type: "normal",
                                isTarget: false,
                            }];
                        });
                    }
                    if (data.from && data.to) {
                        setPendingEdges(prev => [...prev, {
                            source: data.from!,
                            target: data.to!,
                            volume: parseFloat(data.value || "0"),
                            transfers: 1,
                        }]);
                    }
                }

                setEvents(prev => [data, ...prev.slice(0, 49)]); // keep last 50
            } catch { }
        };

        es.onerror = () => {
            setConnected(false);
            // Auto-reconnect after 5s
            setTimeout(() => { if (sourceRef.current === es) connect(); }, 5000);
        };

        sourceRef.current = es;
    }, [caseId]);

    useEffect(() => {
        connect();
        return () => { sourceRef.current?.close(); };
    }, [connect]);

    // Consume pending items
    const consumePending = useCallback(() => {
        const nodes = [...pendingNodes];
        const edges = [...pendingEdges];
        setPendingNodes([]);
        setPendingEdges([]);
        return { nodes, edges };
    }, [pendingNodes, pendingEdges]);

    return { events, connected, consumePending, pendingNodes, pendingEdges };
}
