import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Network, ArrowRight, Trash2, Info } from "lucide-react";
import { canvasApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

const CanvasManagement = () => {
  const [canvases, setCanvases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchCanvases = async () => {
    try {
      const res = await canvasApi.list();
      if (res.data?.success) {
        setCanvases(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch canvases:", err);
    }
  };

  useEffect(() => {
    fetchCanvases();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this canvas?")) return;
    try {
      await canvasApi.delete(id);
      toast({ title: "Deleted", description: "Canvas removed successfully." });
      setCanvases(canvases.filter(c => c._id !== id));
    } catch (err) {
      toast({ title: "Error", description: "Could not delete canvas", variant: "destructive" });
    }
  };

  const filtered = canvases.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.case_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Network className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Canvas Management</h2>
            <p className="text-[10px] text-muted-foreground font-mono">{canvases.length} active workspaces</p>
          </div>
        </div>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input 
          placeholder="Search canvas names or cases..." 
          className="pl-8 font-mono text-[11px] h-8 bg-background border-border" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </div>

      <div className="forensic-panel">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[9px] font-mono tracking-widest uppercase w-64">Canvas Name</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Linked Case</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Network</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Last Updated</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center font-mono text-xs py-10 opacity-50">
                  No intelligence canvases found. Create a new one to begin visually mapping entities.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(c => (
              <TableRow key={c._id} className="border-border hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-[11px] text-primary">
                  <Link to={`/canvas/${c._id}`} className="hover:underline flex items-center gap-2">
                    <Network className="h-3 w-3" />
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {c.case_id ? (
                    <Link to={`/investigations/${c.case_id}`} className="hover:text-primary transition-colors">
                      {c.case_id}
                    </Link>
                  ) : (
                    <span className="opacity-50">None</span>
                  )}
                </TableCell>
                <TableCell className="text-xs uppercase font-mono">{c.chain}</TableCell>
                <TableCell className="text-[11px] text-muted-foreground font-mono">{new Date(c.updated_at).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-hud-red hover:bg-hud-red/10" onClick={() => handleDelete(c._id)} title="Delete Canvas">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[9px] font-mono bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" asChild>
                      <Link to={`/canvas/${c._id}`}>
                        Open Workspace <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CanvasManagement;
