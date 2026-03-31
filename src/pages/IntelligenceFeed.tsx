import { GlobalSituationMap } from "@/components/intelligence/GlobalSituationMap";
import { LiveNewsPanel } from "@/components/intelligence/LiveNewsPanel";
import { MarketDataPanel } from "@/components/intelligence/MarketDataPanel";
import { AIInsightsPanel } from "@/components/intelligence/AIInsightsPanel";

const IntelligenceFeed = () => {
    return (
        <div className="h-full w-full flex flex-col bg-[#05080a] overflow-hidden relative font-mono">
            {/* Top Section: Global Map (65% height) */}
            <div className="flex-[65] relative border-b border-teal-900/50 shadow-[0_10px_30px_-10px_rgba(20,184,166,0.1)] z-0">
                <GlobalSituationMap />
            </div>

            {/* Bottom Section: Panels (35% height) */}
            <div className="flex-[35] grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 z-10 bg-black/40 min-h-[300px]">
                <LiveNewsPanel />
                <MarketDataPanel />
                <AIInsightsPanel />
            </div>
        </div>
    );
};

export default IntelligenceFeed;
