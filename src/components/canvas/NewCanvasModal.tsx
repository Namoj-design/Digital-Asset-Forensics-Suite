import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Network } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { canvasApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export const NewCanvasModal = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    chain: "ethereum",
    case_id: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await canvasApi.create(formData);
      toast({
        title: "Canvas Created",
        description: "Investigator canvas initialized successfully."
      });
      setOpen(false);
      if (onSuccess) onSuccess();
      if (res.data?.data?._id) {
        navigate(`/canvas/${res.data.data._id}`);
      }
    } catch (err: any) {
      toast({
        title: "Creation Failed",
        description: err.response?.data?.error || "An error occurred.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-8 text-[11px] font-mono tracking-widest bg-primary hover:bg-primary/80">
          <Plus className="mr-2 h-4 w-4" />
          NEW CANVAS
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-primary/10 rounded-md">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-sm tracking-widest uppercase font-mono">Create Intelligence Canvas</DialogTitle>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-mono">Canvas Name</Label>
            <Input 
              required
              placeholder="e.g. Operation Lazarus Flow"
              className="h-8 text-xs bg-background font-mono"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-mono">Description</Label>
            <Input 
              placeholder="Optional description"
              className="h-8 text-xs bg-background font-mono"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-mono">Primary Network</Label>
              <Select value={formData.chain} onValueChange={(val) => setFormData({...formData, chain: val})}>
                <SelectTrigger className="h-8 text-xs bg-background font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="optimism">Optimism</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="avalanche">Avalanche</SelectItem>
                  <SelectItem value="bnb">BNB Chain</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-mono">Link Case ID</Label>
              <Input 
                placeholder="CASE-XXXXXX"
                className="h-8 text-xs bg-background font-mono"
                value={formData.case_id}
                onChange={(e) => setFormData({...formData, case_id: e.target.value})}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" className="h-8 text-xs" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? "Initializing..." : "Create Canvas"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
