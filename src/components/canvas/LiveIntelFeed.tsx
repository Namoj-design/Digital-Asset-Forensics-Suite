import { useEffect, useState } from "react";
import { Activity, Radio, AlertTriangle } from "lucide-react";

export const LiveIntelFeed = () => {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const eventSource = new EventSource("http://localhost:3000/api/stream/network");
        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === "IP_SIGNAL" || data.type === "CORRELATION_LINK") {
                setEvents((prev) => [data, ...prev].slice(0, 5));
            }
        };
        return () => eventSource.close();
    }, []);

    if (events.length === 0) return null;

    return (
        <div className="absolute top-4 right-4 w-64 z-20 space-y-2 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 backdrop-blur border border-border rounded-md shadow-lg pointer-events-auto">
                <Radio className="h-3 w-3 text-hud-red animate-pulse" />
                <span className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground uppercase">Live Intel Stream</span>
            </div>
            
            <div className="space-y-2">
                {events.map((ev, i) => (
                    <div 
                        key={ev.id || i}
                        className="bg-card/90 backdrop-blur border border-border/50 rounded p-2 shadow-lg animate-in fade-in slide-in-from-right-4 pointer-events-auto"
                    >
                        {ev.type === "IP_SIGNAL" ? (
                            <div className="flex items-start gap-2">
                                <Activity className={`h-3 w-3 mt-0.5 ${ev.isHotspot ? "text-hud-red" : "text-hud-yellow"}`} />
                                <div>
                                    <div className="text-[10px] font-bold font-mono tracking-wide text-foreground">{ev.networkSignal}</div>
                                    <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{ev.node.geo.city}, {ev.node.geo.country}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 mt-0.5 text-hud-red" />
                                <div>
                                    <div className="text-[10px] font-bold font-mono tracking-wide text-hud-red uppercase">Connection Detected</div>
                                    <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{ev.correlationType}</div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
