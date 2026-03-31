import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Search, FolderOpen, Wallet, ArrowRightLeft,
  Archive, BarChart3, FileText, Settings, Shield, Activity, Network
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { label: "Investigations", icon: FolderOpen, path: "/investigations" },
  { label: "Investigator Canvas", icon: Network, path: "/canvas" },
  { label: "Wallet Intel", icon: Wallet, path: "/wallet-intelligence" },
  { label: "Tx Explorer", icon: ArrowRightLeft, path: "/transaction-explorer" },
  { label: "Evidence Vault", icon: Archive, path: "/evidence-vault" },
  { label: "Risk Analytics", icon: BarChart3, path: "/risk-analytics" },
  { label: "Reports", icon: FileText, path: "/reports" },
  { label: "Intelligence Feed", icon: Activity, path: "/intelligence-feed" },
];

const adminItems = [
  { label: "Admin", icon: Settings, path: "/admin" },
];

export const AppSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const allItems = user?.role === "admin" ? [...navItems, ...adminItems] : navItems;

  return (
    <aside className="w-56 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-xs font-bold text-foreground tracking-widest uppercase">Namo Labs</h1>
            <div className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase leading-relaxed">
              Digital Asset<br />
              Forensics Suite
            </div>
          </div>
        </div>
      </div>

      {/* System status */}
      <div className="px-4 py-2.5 border-b border-sidebar-border flex items-center gap-2">
        <div className="status-dot bg-primary text-primary" />
        <span className="text-[9px] text-muted-foreground tracking-widest uppercase">System Online</span>
        <Activity className="h-3 w-3 text-primary ml-auto animate-pulse-glow" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 space-y-0.5">
        {allItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item mx-1 ${isActive(item.path) ? "nav-item-active" : "nav-item-inactive"}`}
          >
            <item.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <p className="text-[9px] text-muted-foreground/50 text-center tracking-[0.25em] uppercase">Trace the Ledger</p>
      </div>
    </aside>
  );
};
