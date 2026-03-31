import { useState, useEffect } from "react";
import { intelligenceApi } from "@/lib/api";
import { ShieldAlert, AlertTriangle, ExternalLink, Skull } from "lucide-react";

interface IntelItem {
    id: string;
    title: string;
    source: string;
    link: string;
    published_at: string;
    severity: "low" | "medium" | "high";
    category: string;
    description: string;
}

export const LiveNewsPanel = () => {
    const [items, setItems] = useState<IntelItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetchFeed = async () => {
            try {
                const { data } = await intelligenceApi.getNews();
                if (active) setItems(data.slice(0, 10));
            } catch (error) {
                console.error(error);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchFeed();
        const interval = setInterval(fetchFeed, 10 * 60 * 1000);
        return () => { active = false; clearInterval(interval); };
    }, []);

    const getSeverityIcon = (sev: string) => {
        switch (sev) {
            case 'high': return <Skull className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />;
            case 'medium': return <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />;
            default: return <div className="h-1.5 w-1.5 rounded-full bg-teal-500/50 shrink-0 mt-1.5" />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0b1014]/90 backdrop-blur-md border border-teal-900/30 rounded-xl overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-teal-900/30">
                <h3 className="text-[10px] font-mono tracking-widest uppercase text-teal-500 flex items-center gap-1.5 line-clamp-1">
                    <ShieldAlert className="h-3 w-3" />
                    Scam Intelligence Feed
                </h3>
                <div className="flex items-center gap-1">
                    {loading && <div className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />}
                    <span className="text-[8px] font-mono text-teal-700 uppercase">NewsData.io</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-teal-900/50">
                {items.length === 0 && !loading ? (
                    <div className="text-[9px] text-muted-foreground font-mono text-center pt-10">No scam reports found.</div>
                ) : (
                    items.map((item) => (
                        <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2.5 rounded hover:bg-teal-950/30 border border-transparent hover:border-teal-900/50 transition-colors group"
                        >
                            <div className="flex items-start gap-2">
                                {getSeverityIcon(item.severity)}
                                <div className="space-y-1 min-w-0">
                                    <h4 className="text-[10px] font-bold text-teal-50 leading-snug line-clamp-2 group-hover:text-teal-300 transition-colors">
                                        {item.title}
                                    </h4>
                                    <p className="text-[8px] text-muted-foreground/70 line-clamp-1 font-mono">
                                        {item.description}
                                    </p>
                                    <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground uppercase tracking-widest">
                                        <span>{item.category} • {item.related_chain}</span>
                                        <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
};
