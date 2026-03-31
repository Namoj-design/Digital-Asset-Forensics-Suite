import { useState, useEffect } from "react";
import { Activity, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

interface AssetData {
    id: string;
    symbol: string;
    price: number;
    prevPrice: number;
    change: string;
    isUp: boolean;
    sparkline: number[];
}

const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "DOGE"];

export const MarketDataPanel = () => {
    const [assets, setAssets] = useState<AssetData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

    const fetchMarket = async (prevAssets: AssetData[]) => {
        try {
            const dataPromises = SYMBOLS.map(async (sym) => {
                const res = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`);
                const json = await res.json();
                const price = parseFloat(json.data.amount);

                const prev = prevAssets.find(a => a.symbol === sym);
                const prevPrice = prev ? prev.price : price;
                const diff = price - prevPrice;
                const pctChange = prevPrice > 0 ? ((diff / prevPrice) * 100) : 0;

                // Build a rolling sparkline from previous data
                const oldSparkline = prev?.sparkline || [];
                const sparkline = [...oldSparkline.slice(-11), price];

                return {
                    id: sym,
                    symbol: sym,
                    price,
                    prevPrice,
                    change: Math.abs(pctChange).toFixed(2),
                    isUp: diff >= 0,
                    sparkline
                };
            });
            const results = await Promise.all(dataPromises);
            setAssets(results);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarket([]);
        const int = setInterval(() => {
            setAssets(prev => {
                fetchMarket(prev);
                return prev;
            });
        }, 8000); // Refresh every 8 seconds for live feel
        return () => clearInterval(int);
    }, []);

    // Render mini sparkline SVG
    const renderSparkline = (data: number[], isUp: boolean) => {
        if (data.length < 2) return null;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const w = 80;
        const h = 24;
        const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
        return (
            <svg width={w} height={h} className="shrink-0">
                <polyline
                    points={points}
                    fill="none"
                    stroke={isUp ? 'rgb(20, 184, 166)' : 'rgb(239, 68, 68)'}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#0b1014]/90 backdrop-blur-md border border-teal-900/30 rounded-xl overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-teal-900/30">
                <h3 className="text-[10px] font-mono tracking-widest uppercase text-teal-500 flex items-center gap-1.5">
                    <Activity className="h-3 w-3" />
                    Market Pulse
                </h3>
                <div className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
                    </span>
                    <span className="text-[8px] font-mono text-teal-600 uppercase">Live</span>
                </div>
            </div>
            <div className="flex-1 p-2 overflow-y-auto space-y-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-teal-900/50">
                {loading && assets.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-teal-500/50">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                    </div>
                ) : (
                    assets.map(asset => {
                        const isFlash = asset.price !== asset.prevPrice;
                        return (
                            <div
                                key={asset.id}
                                onClick={() => setSelectedAsset(selectedAsset === asset.id ? null : asset.id)}
                                className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-all duration-300 border ${selectedAsset === asset.id
                                        ? 'bg-teal-950/40 border-teal-500/40'
                                        : 'bg-black/20 border-teal-900/20 hover:border-teal-900/50 hover:bg-black/30'
                                    }`}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-white tracking-widest">{asset.symbol}</span>
                                        <span className={`text-[8px] font-mono flex items-center gap-0.5 ${asset.isUp ? 'text-teal-400' : 'text-red-400'}`}>
                                            {asset.isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                                            {asset.isUp ? '▲' : '▼'} {asset.change}%
                                        </span>
                                    </div>
                                    {renderSparkline(asset.sparkline, asset.isUp)}
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <span className={`block text-xs font-mono font-bold transition-colors duration-500 ${isFlash
                                            ? (asset.isUp ? 'text-teal-300' : 'text-red-300')
                                            : 'text-white'
                                        }`}>
                                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
