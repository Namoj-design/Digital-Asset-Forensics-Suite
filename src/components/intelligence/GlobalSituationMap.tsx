import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Types ────────────────────────────────────────────────
interface IPSignalEvent {
    type: 'IP_SIGNAL';
    id: string;
    timestamp: string;
    networkSignal: string;
    activityLevel: number;
    isHotspot: boolean;
    node: {
        ip: string;
        region: string;
        geo: { lat: number; lng: number; country: string; city: string; riskBase: number };
    };
}

interface CorrelationLinkEvent {
    type: 'CORRELATION_LINK';
    id: string;
    timestamp: string;
    correlationType: string;
    confidence: number;
    source: { region: string; geo: { lat: number; lng: number } };
    destination: { region: string; geo: { lat: number; lng: number } };
}

type MapEvent = IPSignalEvent | CorrelationLinkEvent;

interface NodeAnim {
    marker: L.CircleMarker;
    glow?: L.CircleMarker;
    startTime: number;
    maxOpacity: number;
    event: IPSignalEvent;
}

interface LinkAnim {
    line: L.Polyline;
    startTime: number;
    maxOpacity: number;
    event: CorrelationLinkEvent;
}

// Dark tiles
const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

// True Intelligence Signal Colors
const SIGNAL_COLORS: Record<string, string> = {
    'TOR_EXIT': '#8b2020',
    'VPN': '#7a5520',
    'EXCHANGE_NODE': '#1a3a6e',
    'MIXER_NODE': '#7a2020',
    'DARKNET_ROUTER': '#5a1a6e',
    'HOSTING_PROVIDER': '#6b6020',
};

// Generate curved arc points between two coordinates
function generateArc(from: [number, number], to: [number, number], numPoints: number = 30): [number, number][] {
    const points: [number, number][] = [];
    const midLat = (from[0] + to[0]) / 2;
    const midLng = (from[1] + to[1]) / 2;

    const dx = to[1] - from[1];
    const dy = to[0] - from[0];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curvature = Math.min(dist * 0.15, 12);

    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);

    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const lat = from[0] + (to[0] - from[0]) * t;
        const lng = from[1] + (to[1] - from[1]) * t;
        const arcOffset = 4 * t * (1 - t) * curvature;
        points.push([lat + nx * arcOffset, lng + ny * arcOffset]);
    }
    return points;
}

export const GlobalSituationMap = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);

    const nodeLayerRef = useRef<L.LayerGroup | null>(null);
    const heatLayerRef = useRef<L.LayerGroup | null>(null);
    const linkLayerRef = useRef<L.LayerGroup | null>(null);

    const activeNodes = useRef<NodeAnim[]>([]);
    const activeLinks = useRef<LinkAnim[]>([]);

    const animFrame = useRef<number>(0);
    const [eventLog, setEventLog] = useState<MapEvent[]>([]);
    const [stats, setStats] = useState({ signals: 0, correlations: 0, hotspots: 0 });

    // Initialize Leaflet map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: [25, 20],
            zoom: 2,
            zoomControl: false,
            attributionControl: false,
            minZoom: 2,
            maxZoom: 8,
        });

        L.tileLayer(DARK_TILE, { subdomains: 'abcd' }).addTo(map);
        L.control.zoom({ position: 'bottomright' }).addTo(map); // re-add zoom so user can explore

        // Layer ordering (heat under nodes under links)
        const heatLayer = L.layerGroup().addTo(map);
        const linkLayer = L.layerGroup().addTo(map);
        const nodeLayer = L.layerGroup().addTo(map);

        heatLayerRef.current = heatLayer;
        linkLayerRef.current = linkLayer;
        nodeLayerRef.current = nodeLayer;

        mapRef.current = map;

        return () => {
            cancelAnimationFrame(animFrame.current);
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Fade out old entities
    useEffect(() => {
        const animate = () => {
            const now = Date.now();

            // Fade Nodes
            const nodesToRemove: number[] = [];
            activeNodes.current.forEach((anim, idx) => {
                const age = now - anim.startTime;
                // Nodes live for 15 seconds, fade over 5
                if (age > 15000) {
                    const fadeT = Math.min((age - 15000) / 5000, 1);
                    const opacity = anim.maxOpacity * (1 - fadeT);
                    anim.marker.setStyle({ opacity, fillOpacity: opacity * 0.4 });
                    if (anim.glow) anim.glow.setStyle({ opacity: 0, fillOpacity: opacity * 0.1 });
                    if (fadeT >= 1) nodesToRemove.push(idx);
                }
            });

            for (let i = nodesToRemove.length - 1; i >= 0; i--) {
                const anim = activeNodes.current[nodesToRemove[i]];
                anim.marker.remove();
                if (anim.glow) anim.glow.remove();
                activeNodes.current.splice(nodesToRemove[i], 1);
            }

            // Fade Links
            const linksToRemove: number[] = [];
            activeLinks.current.forEach((anim, idx) => {
                const age = now - anim.startTime;
                // Links are fast flashes: live 4s, fade 2s
                if (age > 4000) {
                    const fadeT = Math.min((age - 4000) / 2000, 1);
                    const opacity = anim.maxOpacity * (1 - fadeT);
                    anim.line.setStyle({ opacity });
                    if (fadeT >= 1) linksToRemove.push(idx);
                }
            });

            for (let i = linksToRemove.length - 1; i >= 0; i--) {
                const anim = activeLinks.current[linksToRemove[i]];
                anim.line.remove();
                activeLinks.current.splice(linksToRemove[i], 1);
            }

            animFrame.current = requestAnimationFrame(animate);
        };

        animFrame.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrame.current);
    }, []);

    // Spawn an IP signal node
    const spawnNode = useCallback((event: IPSignalEvent) => {
        if (!nodeLayerRef.current || !heatLayerRef.current || !mapRef.current) return;

        const pos: [number, number] = [event.node.geo.lat, event.node.geo.lng];
        const color = SIGNAL_COLORS[event.networkSignal] || '#2e3338';

        // Base size on activity level (10-100) -> radius (3-12)
        const radius = Math.max(3, Math.min(12, event.activityLevel / 8));
        const maxOpac = 0.8;

        const marker = L.circleMarker(pos, {
            radius: radius,
            color: color,
            fillColor: color,
            fillOpacity: maxOpac * 0.4,
            weight: 1.5,
            opacity: maxOpac,
        }).bindTooltip(`${event.networkSignal} | ${event.node.ip} | ACT:${event.activityLevel}`, {
            permanent: false, direction: 'top', className: 'leaflet-tooltip-dark', offset: [0, -radius],
        }).addTo(nodeLayerRef.current);

        let glow: L.CircleMarker | undefined;

        // If high activity or risky, spawn a heatmap underlay ring
        if (event.isHotspot) {
            glow = L.circleMarker(pos, {
                radius: radius * 4,
                color: 'transparent',
                fillColor: color,
                fillOpacity: 0.15,
                weight: 0,
                interactive: false
            }).addTo(heatLayerRef.current);
        }

        activeNodes.current.push({
            marker,
            glow,
            startTime: Date.now(),
            maxOpacity: maxOpac,
            event,
        });
    }, []);

    // Spawn an explicit intelligence correlation link
    const spawnLink = useCallback((event: CorrelationLinkEvent) => {
        if (!linkLayerRef.current) return;

        const from: [number, number] = [event.source.geo.lat, event.source.geo.lng];
        const to: [number, number] = [event.destination.geo.lat, event.destination.geo.lng];

        const arcOpacity = (event.confidence / 100) * 0.8; // higher confidence = brighter
        const arcWeight = 1.5;

        const arcPoints = generateArc(from, to, 40);
        const line = L.polyline(arcPoints, {
            color: '#14b8a6', // Teal intelligence link
            weight: arcWeight,
            opacity: arcOpacity,
            dashArray: '4, 6', // Dotted line implies intelligence inference, not direct tx
            smoothFactor: 1,
        }).bindTooltip(`${event.correlationType} | CONF:${event.confidence}%`, {
            permanent: false, direction: 'center', className: 'leaflet-tooltip-dark'
        }).addTo(linkLayerRef.current);

        activeLinks.current.push({
            line,
            startTime: Date.now(),
            maxOpacity: arcOpacity,
            event,
        });
    }, []);

    // Connect to SSE
    useEffect(() => {
        const eventSource = new EventSource('/api/stream/network');

        eventSource.onmessage = (msg) => {
            try {
                const data = JSON.parse(msg.data) as MapEvent;
                if (data.type === 'IP_SIGNAL') {
                    spawnNode(data);
                    setEventLog(prev => [data, ...prev].slice(0, 10));
                    setStats(prev => ({ ...prev, signals: prev.signals + 1, hotspots: prev.hotspots + (data.isHotspot ? 1 : 0) }));
                } else if (data.type === 'CORRELATION_LINK') {
                    spawnLink(data);
                    setEventLog(prev => [data, ...prev].slice(0, 10));
                    setStats(prev => ({ ...prev, correlations: prev.correlations + 1 }));
                }
            } catch { }
        };

        return () => eventSource.close();
    }, [spawnNode, spawnLink]);

    return (
        <div className="absolute inset-0 z-0 bg-[#060a0e]">
            <div ref={containerRef} className="w-full h-full" />

            <style>{`
                .leaflet-tooltip-dark {
                    background: rgba(4, 8, 12, 0.95) !important;
                    border: 1px solid rgba(20, 60, 55, 0.5) !important;
                    color: rgba(20, 184, 166, 0.8) !important;
                    font-family: monospace !important;
                    font-size: 8px !important;
                    letter-spacing: 0.1em !important;
                    text-transform: uppercase !important;
                    padding: 4px 8px !important;
                    border-radius: 2px !important;
                    box-shadow: none !important;
                    backdrop-filter: blur(4px);
                }
                .leaflet-tooltip-dark::before { border-top-color: rgba(20, 60, 55, 0.5) !important; }
                .leaflet-container { background: #060a0e !important; }
                /* Hide native zoom controls */
                .leaflet-control-zoom { border: none !important; box-shadow: none !important; }
                .leaflet-control-zoom a { 
                    background: rgba(10, 14, 18, 0.9) !important; 
                    color: #14b8a6 !important; 
                    border: 1px solid rgba(20, 60, 55, 0.4) !important; 
                }
                .leaflet-control-zoom a:hover { background: rgba(20, 30, 40, 0.9) !important; }
            `}</style>

            {/* Top-left: Stats  */}
            <div className="absolute top-3 left-3 z-[1000] pointer-events-none space-y-1.5">
                <div className="bg-[#0a0e12]/90 border border-[#1a2a28]/50 px-2.5 py-1 rounded flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14b8a6]/40 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#14b8a6]/60"></span>
                    </span>
                    <span className="text-[8px] font-mono text-[#14b8a6]/60 tracking-widest uppercase">
                        Global IP Intel Stream
                    </span>
                </div>
                <div className="bg-[#0a0e12]/90 border border-[#1a2a28]/40 px-2.5 py-1.5 rounded space-y-1">
                    <div className="flex items-center justify-between gap-5">
                        <span className="text-[7px] font-mono text-[#3a4a48] uppercase tracking-widest">Captured Signals</span>
                        <span className="text-[10px] font-mono text-[#14b8a6]/70">{stats.signals}</span>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                        <span className="text-[7px] font-mono text-[#4a2828] uppercase tracking-widest">Active Hotspots</span>
                        <span className="text-[10px] font-mono text-[#8b3030]/80">{stats.hotspots}</span>
                    </div>
                    <div className="flex items-center justify-between gap-5">
                        <span className="text-[7px] font-mono text-[#3a3a4a] uppercase tracking-widest">Correlations</span>
                        <span className="text-[10px] font-mono text-[#5a5a7a]/80">{stats.correlations}</span>
                    </div>
                </div>
            </div>

            {/* Bottom: Event Ticker */}
            <div className="absolute bottom-0 left-0 right-0 z-[1000] pointer-events-none">
                <div className="bg-gradient-to-t from-[#060a0e] via-[#060a0e]/95 to-transparent pt-6 pb-2 px-3">
                    <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                        {eventLog.map((ev) => (
                            <div key={ev.id} className="flex-shrink-0 px-2.5 py-1.5 rounded text-[8px] font-mono tracking-wider uppercase border bg-[#0a0e12]/90 border-[#1a2a28]/50 flex flex-col justify-center gap-0.5">
                                {ev.type === 'IP_SIGNAL' ? (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#a0a0a0]/50">{ev.node.city}</span>
                                            <span style={{ color: SIGNAL_COLORS[ev.networkSignal] || '#14b8a6' }}>{ev.networkSignal}</span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-60">
                                            <span>IP: {ev.node.ip}</span>
                                            {ev.isHotspot && <span className="text-[#8b3030]">HOTSPOT</span>}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#14b8a6]/70">LINK DETECTED</span>
                                            <span className="text-[#a0a0a0]/60">{ev.correlationType}</span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-60">
                                            <span>{ev.source.geo.city} → {ev.destination.geo.city}</span>
                                            <span>CONF:{ev.confidence}%</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top-right: Legend */}
            <div className="absolute top-3 right-3 z-[1000] pointer-events-none">
                <div className="bg-[#0a0e12]/90 border border-[#1a2a28]/40 px-3 py-2.5 rounded space-y-1.5">
                    <span className="text-[8px] font-mono text-[#3a4a48] uppercase tracking-widest block mb-1">Signal Types</span>
                    {Object.entries(SIGNAL_COLORS).map(([label, color]) => (
                        <div key={label} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full border" style={{ backgroundColor: color, opacity: 0.5, borderColor: color }} />
                            <span className="text-[7px] font-mono text-[#a0a0a0]/40 uppercase tracking-wide">{label.replace('_', ' ')}</span>
                        </div>
                    ))}
                    <div className="border-t border-[#1a2a28]/30 mt-2 pt-2">
                        <div className="flex items-center gap-2">
                            <svg width="12" height="4" viewBox="0 0 12 4">
                                <line x1="0" y1="2" x2="12" y2="2" stroke="#14b8a6" strokeWidth="1" strokeDasharray="2,2" opacity="0.6" />
                            </svg>
                            <span className="text-[7px] font-mono text-[#a0a0a0]/40 uppercase tracking-wide">Correlation Link</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
