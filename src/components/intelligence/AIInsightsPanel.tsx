import { useState } from "react";
import { Cpu, Send, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatMessage {
    id: string;
    role: "user" | "ai";
    content: React.ReactNode;
}

export const AIInsightsPanel = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: "1", role: "ai", content: "Intel core activated. I am monitoring the global graph and darknet parameters. How can I assist your investigation?" }
    ]);
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        const newMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input };
        setMessages(prev => [...prev, newMsg]);
        setInput("");

        // Simulate AI response
        setTimeout(() => {
            let aiResp = "Scanning parameters... Request acknowledged.";
            if (input.toLowerCase().includes("darknet")) aiResp = "Analyzing darknet exposure... Detected 3 high-anonymity entities in current viewport. Re-routing paths...";
            if (input.toLowerCase().includes("report")) aiResp = "Synthesizing intelligence report. Anomalies concentrated in Eastern Europe cluster.";
            setMessages(prev => [...prev, { id: Date.now().toString(), role: "ai", content: aiResp }]);
        }, 800);
    };

    return (
        <div className="h-full flex flex-col bg-[#0b1014]/90 backdrop-blur-md border border-teal-900/30 rounded-xl overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-teal-900/30">
                <h3 className="text-[10px] font-mono tracking-widest uppercase text-teal-400 flex items-center gap-1.5">
                    <Cpu className="h-3 w-3" />
                    Strategic Insights
                </h3>
                <Sparkles className="h-3 w-3 text-teal-500/50" />
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3 flex flex-col [&::-webkit-scrollbar]:hidden">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-2 rounded text-[10px] font-mono leading-relaxed ${msg.role === 'user'
                            ? 'bg-teal-900/40 text-teal-100 border border-teal-500/30 rounded-br-sm'
                            : 'bg-black/40 text-muted-foreground border border-white/5 rounded-bl-sm'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-2 py-1.5 bg-[#080c10] border-t border-[#1a2a28]/30 flex items-center gap-1.5">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Query intel core..."
                    className="h-6 text-[9px] bg-[#0a0e12] border-[#1a2a28]/40 font-mono text-[#14b8a6]/60 placeholder:text-[#1a2a28] rounded-sm"
                />
                <Button onClick={handleSend} size="icon" className="h-6 w-6 shrink-0 bg-[#0e1a18] text-[#14b8a6]/50 hover:bg-[#122220] hover:text-[#14b8a6]/70 rounded-sm">
                    <Send className="h-2.5 w-2.5" />
                </Button>
            </div>
        </div>
    );
};
