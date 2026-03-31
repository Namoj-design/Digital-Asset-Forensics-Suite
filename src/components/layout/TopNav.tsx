import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Bell, Radio, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChain, CHAIN_CONFIG } from "@/contexts/ChainContext";
import { alertsApi } from "@/lib/api";

interface Alert {
  alert_id: number;
  address: string;
  chain: string;
  tx_hash: string;
  amount: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const TopNav = () => {
  const { user, logout } = useAuth();
  const { selectedChain, setSelectedChain, chainConfig } = useChain();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await alertsApi.list();
      setAlerts(res.data.alerts || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Alerts table may not exist yet — silent fail
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const markAllRead = async () => {
    try {
      await alertsApi.markRead();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <header className="h-10 bg-card/80 border-b border-border flex items-center justify-between px-4 shrink-0 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">DAFS // Command Interface</span>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Radio className="h-3 w-3 text-primary animate-pulse-glow" />
          <span className="text-[10px] text-primary font-mono">LIVE</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedChain} onValueChange={(v: any) => setSelectedChain(v)}>
          <SelectTrigger className="w-36 h-7 text-[10px] font-mono bg-background border-border shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {Object.entries(CHAIN_CONFIG).map(([id, config]) => (
              <SelectItem key={id} value={id} className="text-[10px] font-mono">
                {config.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-[9px] text-muted-foreground font-mono hidden sm:inline-block">
          {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
        </span>
        <div className="h-3 w-px bg-border" />

        {/* Notification Bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-7 w-7">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-hud-red text-[8px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-card border-border max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
              <span className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground">Alerts</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[8px] font-mono text-primary hover:underline flex items-center gap-1">
                  <Check className="h-2.5 w-2.5" />Mark all read
                </button>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] font-mono text-muted-foreground">No alerts yet</div>
            ) : (
              alerts.slice(0, 15).map(alert => (
                <DropdownMenuItem key={alert.alert_id} className="flex flex-col items-start gap-0.5 px-3 py-2 cursor-default">
                  <div className="flex items-center gap-1.5 w-full">
                    {!alert.is_read && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                    <span className={`text-[10px] font-mono leading-tight ${alert.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                      {alert.message}
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-muted-foreground/60 ml-3">{timeAgo(alert.created_at)}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-[10px] h-7 px-2 font-mono">
              <div className="h-5 w-5 border border-primary/40 flex items-center justify-center bg-primary/5">
                <span className="text-[9px] font-bold text-primary">
                  {user?.name?.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <span className="hidden sm:inline text-muted-foreground">{user?.name}</span>
              <span className="text-[9px] text-primary/70 uppercase">[{user?.role}]</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-card border-border">
            <DropdownMenuItem className="text-xs font-mono"><User className="h-3 w-3 mr-2" />Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-xs font-mono text-hud-red"><LogOut className="h-3 w-3 mr-2" />Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
