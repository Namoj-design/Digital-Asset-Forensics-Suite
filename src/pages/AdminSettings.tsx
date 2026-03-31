import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Users, Shield, Key, BellRing, Plus, Pause, Play, Trash2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";

const AdminSettings = () => {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [newRec, setNewRec] = useState({ name: "", email: "", telegram_chat_id: "" });
  const [loading, setLoading] = useState(true);

  const fetchRecipients = async () => {
    try {
      const { data } = await adminApi.getRecipients();
      setRecipients(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load recipients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRec.name || !newRec.email) return toast.error("Name and Email required");
    try {
      await adminApi.addRecipient(newRec);
      setNewRec({ name: "", email: "", telegram_chat_id: "" });
      toast.success("Recipient added");
      fetchRecipients();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to add recipient");
    }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await adminApi.updateRecipient(id, { is_active: !currentStatus });
      toast.success(currentStatus ? "Recipient paused" : "Recipient activated");
      fetchRecipients();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!confirm("Remove this alert recipient?")) return;
      await adminApi.deleteRecipient(id);
      toast.success("Recipient removed");
      fetchRecipients();
    } catch (error) {
      toast.error("Failed to delete recipient");
    }
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <Settings className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Admin Settings</h2>
          <p className="text-[10px] text-muted-foreground font-mono">System configuration and user management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="stat-card corner-brackets flex items-center gap-3">
          <Users className="h-4 w-4 text-primary" />
          <div><p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Users</p><p className="text-lg font-bold font-mono">12</p></div>
        </div>
        <div className="stat-card corner-brackets flex items-center gap-3">
          <Shield className="h-4 w-4 text-primary" />
          <div><p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Roles</p><p className="text-lg font-bold font-mono">4</p></div>
        </div>
        <div className="stat-card corner-brackets flex items-center gap-3">
          <BellRing className="h-4 w-4 text-primary" />
          <div><p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">Alert Subs</p><p className="text-lg font-bold font-mono">{recipients.length}</p></div>
        </div>
      </div>

      {/* Alert Recipients Panel */}
      <div className="forensic-panel">
        <div className="p-2.5 border-b border-border flex justify-between items-center">
          <h3 className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-foreground">Alert Recipients</h3>
        </div>
        <div className="p-4 border-b border-border bg-muted/10">
          <form onSubmit={handleAdd} className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <Label className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Name</Label>
              <Input required value={newRec.name} onChange={e => setNewRec({ ...newRec, name: e.target.value })} placeholder="Duty Officer" className="font-mono text-[10px] h-8 bg-background border-border" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <Label className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Email</Label>
              <Input required type="email" value={newRec.email} onChange={e => setNewRec({ ...newRec, email: e.target.value })} placeholder="alerts@agency.gov" className="font-mono text-[10px] h-8 bg-background border-border" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <Label className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Telegram Chat ID (Opt)</Label>
              <Input value={newRec.telegram_chat_id} onChange={e => setNewRec({ ...newRec, telegram_chat_id: e.target.value })} placeholder="-100123456" className="font-mono text-[10px] h-8 bg-background border-border" />
            </div>
            <button type="submit" className="btn-tactical h-8 text-[10px] px-4 flex items-center gap-1">
              <Plus className="h-3 w-3" /> Add
            </button>
          </form>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Name</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Contact</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Status</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-[10px] font-mono text-muted-foreground py-4">Loading recipients...</TableCell></TableRow>
            ) : recipients.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-[10px] font-mono text-muted-foreground py-4">No recipients configured</TableCell></TableRow>
            ) : recipients.map(r => (
              <TableRow key={r.id} className={`border-border transition-colors hover:bg-muted/20 ${!r.is_active ? 'opacity-50' : ''}`}>
                <TableCell className="text-[11px] font-mono font-medium">{r.name}</TableCell>
                <TableCell className="text-[10px] font-mono text-muted-foreground">
                  <div>{r.email}</div>
                  {r.telegram_chat_id && <div className="text-[9px] text-primary/70 mt-0.5">TG: {r.telegram_chat_id}</div>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={`status-dot ${r.is_active ? "bg-status-closed text-status-closed" : "bg-muted-foreground text-muted-foreground"}`} />
                    <span className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">{r.is_active ? "Active" : "Paused"}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleToggle(r.id, r.is_active)} className="text-muted-foreground hover:text-primary transition-colors">
                      {r.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* User Management Panel */}
      <div className="forensic-panel mt-5">
        <div className="p-2.5 border-b border-border">
          <h3 className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-foreground">User Management</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Name</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Email</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Role</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { name: "Namoj", email: "namoj@namolabs.io", role: "Admin", active: true },
              { name: "James Rodriguez", email: "j.rodriguez@namolabs.io", role: "Investigator", active: true },
              { name: "Aisha Patel", email: "a.patel@namolabs.io", role: "Analyst", active: true },
              { name: "Mike Torres", email: "m.torres@namolabs.io", role: "Auditor", active: false },
            ].map(u => (
              <TableRow key={u.email} className="border-border hover:bg-muted/20 transition-colors">
                <TableCell className="text-[11px] font-mono">{u.name}</TableCell>
                <TableCell className="text-[11px] text-muted-foreground font-mono">{u.email}</TableCell>
                <TableCell><span className="risk-badge risk-none">{u.role}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={`status-dot ${u.active ? "bg-status-closed text-status-closed" : "bg-muted-foreground text-muted-foreground"}`} />
                    <span className="text-[10px] font-mono text-muted-foreground">{u.active ? "Active" : "Inactive"}</span>
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

export default AdminSettings;
