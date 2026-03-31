import { Link, useNavigate } from "react-router-dom";
import { StatusBadge, PriorityBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Download, Eye, Pencil, X, FolderOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { NewCaseModal } from "@/components/investigation/NewCaseModal";
import { casesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Investigations = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const canEdit = user?.role === "admin" || user?.role === "investigator";

  const [caseToEdit, setCaseToEdit] = useState<any>(null);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!caseToDelete) return;
    try {
      await casesApi.delete(caseToDelete);
      toast({ title: "Success", description: "Case deleted successfully." });
      setCases(cases.filter(c => c.case_id !== caseToDelete));
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error || "Failed to delete case.", variant: "destructive" });
    } finally {
      setCaseToDelete(null);
    }
  };

  const handleExport = async (caseId: string) => {
    try {
      const response = await casesApi.export(caseId);
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report-${caseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast({ title: "Export Failed", description: "Failed to generate report.", variant: "destructive" });
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseToEdit) return;
    try {
      const res = await casesApi.update(caseToEdit.case_id, {
        title: caseToEdit.title,
        description: caseToEdit.description,
        case_type: caseToEdit.type,
        priority: caseToEdit.priority,
        riskThreshold: caseToEdit.riskThreshold
      });
      toast({ title: "Success", description: "Case updated successfully." });
      setCases(cases.map(c => c.case_id === caseToEdit.case_id ? { ...c, ...res.data.data } : c));
      setCaseToEdit(null);
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error || "Failed to update case.", variant: "destructive" });
    }
  };

  const fetchCases = async () => {
    try {
      const res = await casesApi.list();
      if (res.data?.success) {
        setCases(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch cases:", err);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const filtered = cases.filter(c =>
    c.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.case_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Case Management</h2>
            <p className="text-[10px] text-muted-foreground font-mono">{cases.length} registered cases</p>
          </div>
        </div>
        <NewCaseModal onSuccess={() => fetchCases()} />
      </div>

      <div className="relative w-72">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search cases..." className="pl-8 font-mono text-[11px] h-8 bg-background border-border" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="forensic-panel">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[9px] font-mono tracking-widest uppercase w-28">Case ID</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Title</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Status</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Priority</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Created</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Officer</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right">Wallets</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center font-mono text-xs py-10 opacity-50">
                  No cases found. Create a new case to begin.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(c => (
              <TableRow key={c.case_id} className="border-border hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-[11px] text-primary">{c.case_id}</TableCell>
                <TableCell className="text-xs">{c.title}</TableCell>
                <TableCell><StatusBadge status={c.status || "Active"} /></TableCell>
                <TableCell><PriorityBadge priority={c.priority || "Medium"} /></TableCell>
                <TableCell className="text-[11px] text-muted-foreground font-mono">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.created_by}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {(() => {
                    try {
                      if (!c.graph_data) return 0;
                      const parsed = typeof c.graph_data === 'string' ? JSON.parse(c.graph_data) : c.graph_data;
                      return parsed?.graph?.nodes?.length || parsed?.nodes?.length || 0;
                    } catch (e) {
                      return 0;
                    }
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" asChild title="View Details">
                      <Link to={`/investigations/${c.case_id}`}><Eye className="h-3 w-3 text-primary" /></Link>
                    </Button>
                    <Button disabled={!canEdit} variant="ghost" size="icon" className="h-6 w-6" title="Edit Case" onClick={() => setCaseToEdit(c)}>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button disabled={!canEdit} variant="ghost" size="icon" className="h-6 w-6" title="Export PDF" onClick={() => handleExport(c.case_id)}>
                      <Download className="h-3 w-3 text-muted-foreground" />
                    </Button>
                    <Button disabled={!canEdit} variant="ghost" size="icon" className="h-6 w-6" title="Delete Case" onClick={() => setCaseToDelete(c.case_id)}>
                      <X className="h-3 w-3 text-hud-red" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!caseToDelete} onOpenChange={(open) => !open && setCaseToDelete(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono tracking-widest uppercase">Delete Investigation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">Are you sure you want to delete this case? This action cannot be undone and will delete all associated evidence files and reports.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCaseToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete Case</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Case Modal */}
      <Dialog open={!!caseToEdit} onOpenChange={(open) => !open && setCaseToEdit(null)}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border font-mono">
          <DialogHeader>
            <DialogTitle className="text-sm tracking-widest uppercase text-primary">Edit Case Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Case Title</label>
              <Input required className="h-8 text-xs bg-background" value={caseToEdit?.title || ""} onChange={(e) => setCaseToEdit({ ...caseToEdit, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Description</label>
              <Input className="h-8 text-xs bg-background" value={caseToEdit?.description || ""} onChange={(e) => setCaseToEdit({ ...caseToEdit, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Case Type</label>
                <Select value={caseToEdit?.type || "Trace"} onValueChange={(v) => setCaseToEdit({ ...caseToEdit, type: v })}>
                  <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Trace">Trace</SelectItem>
                    <SelectItem value="Fraud">Fraud</SelectItem>
                    <SelectItem value="Phishing">Phishing</SelectItem>
                    <SelectItem value="Exploit">DeFi Exploit</SelectItem>
                    <SelectItem value="Laundering">Money Laundering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Priority</label>
                <Select value={caseToEdit?.priority || "Medium"} onValueChange={(v) => setCaseToEdit({ ...caseToEdit, priority: v })}>
                  <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <label className="text-xs text-muted-foreground flex justify-between">
                <span>Intelligence Risk Threshold</span>
                <span className="text-primary font-mono">{caseToEdit?.riskThreshold || 75}%</span>
              </label>
              <input type="range" min="1" max="100" className="w-full accent-primary h-1 bg-muted rounded-full appearance-none cursor-pointer" value={caseToEdit?.riskThreshold || 75} onChange={(e) => setCaseToEdit({ ...caseToEdit, riskThreshold: parseInt(e.target.value) })} />
              <p className="text-[9px] text-muted-foreground mb-4">Adjusting this threshold will trigger a background re-evaluation of the investigation graph.</p>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" className="h-8 text-xs" onClick={() => setCaseToEdit(null)}>Cancel</Button>
              <Button type="submit" className="h-8 text-xs bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Investigations;
