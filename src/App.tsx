import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChainProvider } from "@/contexts/ChainContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Investigations from "@/pages/Investigations";
import InvestigationWorkspace from "@/pages/InvestigationWorkspace";
import WalletIntelligence from "@/pages/WalletIntelligence";
import TransactionExplorer from "@/pages/TransactionExplorer";
import EvidenceVault from "@/pages/EvidenceVault";
import RiskAnalytics from "@/pages/RiskAnalytics";
import Reports from "@/pages/Reports";
import AdminSettings from "@/pages/AdminSettings";
import IntelligenceFeed from "@/pages/IntelligenceFeed";
import CanvasManagement from "@/pages/CanvasManagement";
import InvestigatorCanvas from "@/pages/InvestigatorCanvas";
import SolanaForensics from "@/pages/SolanaForensics";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ChainProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/investigations" element={<Investigations />} />
                <Route path="/investigations/:caseId" element={<InvestigationWorkspace />} />
                <Route path="/wallet-intelligence" element={<WalletIntelligence />} />
                <Route path="/transaction-explorer" element={<TransactionExplorer />} />
                <Route path="/evidence-vault" element={<EvidenceVault />} />
                <Route path="/risk-analytics" element={<RiskAnalytics />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/intelligence-feed" element={<IntelligenceFeed />} />
                <Route path="/canvas" element={<CanvasManagement />} />
                <Route path="/canvas/:canvasId" element={<InvestigatorCanvas />} />
                <Route path="/admin" element={<AdminSettings />} />
                <Route path="/solana-forensics" element={<SolanaForensics />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ChainProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
