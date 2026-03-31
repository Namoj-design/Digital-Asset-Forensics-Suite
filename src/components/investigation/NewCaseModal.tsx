import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crosshair, Plus, ShieldAlert, Loader2 } from "lucide-react";
import { useChain, CHAIN_CONFIG } from "@/contexts/ChainContext";
import { useToast } from "@/components/ui/use-toast";

interface NewCaseModalProps {
    onSuccess: (caseId: string) => void;
}

export const NewCaseModal = ({ onSuccess }: NewCaseModalProps) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { selectedChain, setSelectedChain } = useChain();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "fraud",
        priority: "high",
        officer: "Namoj",
        targetWallet: "",
        suspectedWallet: "",
        exchangeWallet: "",
        tags: "",
        maxDepth: "2",
        timeRange: "30",
        riskThreshold: "75"
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.targetWallet) {
            toast({ title: "Validation Error", description: "Title and Target Wallet are required.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            // API call to backend /api/cases
            const { casesApi } = await import("@/lib/api");
            const res = await casesApi.create({ ...formData, chain: selectedChain });

            // Our Express backend wraps data in { success: true, data: { case_id: ... } }
            const caseId = res.data?.data?.case_id || res.data?.case_id || `CASE-${Math.floor(Math.random() * 1000)}`;
            setOpen(false);
            onSuccess(caseId);
        } catch (error: any) {
            console.error("Case creation failed:", error?.response?.data || error.message);
            toast({ title: "Initialization Failed", description: error?.response?.data?.error || "Could not create investigation. Make sure backend is running.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="btn-tactical h-8 text-[10px] px-3 flex items-center gap-1.5">
                    <Plus className="h-3 w-3" />New Case
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-card border-border p-0 overflow-hidden font-mono">
                <DialogHeader className="p-4 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        <DialogTitle className="text-sm tracking-widest uppercase">Initialize Investigation Pipeline</DialogTitle>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">Configure case parameters and graph tracking depth.</p>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="p-5 max-h-[70vh] overflow-y-auto space-y-6">

                        {/* Core Details */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] text-primary font-bold tracking-[0.2em] border-b border-primary/20 pb-1 uppercase">Core Details</h3>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-muted-foreground">Case Title *</label>
                                    <Input required className="h-8 text-xs bg-background" value={formData.title} onChange={e => handleChange("title", e.target.value)} />
                                </div>
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-muted-foreground">Description</label>
                                    <Input className="h-8 text-xs bg-background" value={formData.description} onChange={e => handleChange("description", e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Case Type</label>
                                    <Select value={formData.type} onValueChange={v => handleChange("type", v)}>
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="fraud">Fraud</SelectItem><SelectItem value="phishing">Phishing</SelectItem><SelectItem value="exploit">DeFi Exploit</SelectItem><SelectItem value="laundering">Money Laundering</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Priority</label>
                                    <Select value={formData.priority} onValueChange={v => handleChange("priority", v)}>
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Assigned Officer</label>
                                    <Input required className="h-8 text-xs bg-background" value={formData.officer} onChange={e => handleChange("officer", e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Network (Global)</label>
                                    <Select value={selectedChain} onValueChange={(v: any) => setSelectedChain(v)}>
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(CHAIN_CONFIG).map(([id, config]) => (
                                                <SelectItem key={id} value={id}>{config.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Investigation Inputs */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] text-primary font-bold tracking-[0.2em] border-b border-primary/20 pb-1 uppercase">Investigation Inputs</h3>
                            <div className="grid grid-cols-1 gap-4 text-xs">
                                <div className="space-y-1.5 relative">
                                    <label className="text-muted-foreground">Target Wallet Address *</label>
                                    <Crosshair className="absolute right-2.5 top-[26px] h-3.5 w-3.5 text-primary" />
                                    <Input required placeholder="0x..." className="h-8 text-xs bg-background pr-8 text-primary" value={formData.targetWallet} onChange={e => handleChange("targetWallet", e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-muted-foreground">Suspected Wallet (Optional)</label>
                                        <Input placeholder="0x..." className="h-8 text-xs bg-background" value={formData.suspectedWallet} onChange={e => handleChange("suspectedWallet", e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-muted-foreground">Known Exchange (Optional)</label>
                                        <Input placeholder="0x..." className="h-8 text-xs bg-background" value={formData.exchangeWallet} onChange={e => handleChange("exchangeWallet", e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Initial Tags (Comma separated)</label>
                                    <Input placeholder="Victim, Attacker, Mixer" className="h-8 text-xs bg-background" value={formData.tags} onChange={e => handleChange("tags", e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Advanced Options */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] text-primary font-bold tracking-[0.2em] border-b border-primary/20 pb-1 uppercase">Graph Initialization Config</h3>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Max Depth (Hops)</label>
                                    <Select value={formData.maxDepth} onValueChange={v => handleChange("maxDepth", v)}>
                                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="1">1 Hop</SelectItem><SelectItem value="2">2 Hops</SelectItem><SelectItem value="3">3 Hops</SelectItem><SelectItem value="5">5 Hops (Intensive)</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Time Range (Days)</label>
                                    <Input type="number" className="h-8 text-xs bg-background" value={formData.timeRange} onChange={e => handleChange("timeRange", e.target.value)} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-muted-foreground">Risk Threshold</label>
                                    <Input type="number" min="0" max="100" className="h-8 text-xs bg-background text-hud-red" value={formData.riskThreshold} onChange={e => handleChange("riskThreshold", e.target.value)} />
                                </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground/60 italic">WARNING: High depth initialization (&gt;3) may trigger api rate limits and delay system response.</p>
                        </div>

                    </div>

                    <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
                        <Button type="button" variant="ghost" className="h-8 text-xs font-mono" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button disabled={loading} type="submit" className="h-8 text-xs font-mono bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50 w-44">
                            {loading ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Initializing...</> : "Launch Investigation"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
