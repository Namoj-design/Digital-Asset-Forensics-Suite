// Mock data for the forensics dashboard

export const mockUser = {
  id: "usr_001",
  name: "Namoj",
  email: "namoj@namolabs.io",
  role: "admin" as const,
  avatar: null,
};

export const mockDashboardStats = {
  totalInvestigations: 247,
  openCases: 38,
  highRiskWallets: 1243,
  totalTracedTransactions: 89432,
};

export const mockAlerts = [
  { id: "a1", message: "Wallet 0x7a2...f3d linked to known mixer", severity: "critical" as const, time: "2 min ago" },
  { id: "a2", message: "Unusual volume spike on investigation #94N2", severity: "high" as const, time: "15 min ago" },
  { id: "a3", message: "New wallet cluster detected in case #102", severity: "medium" as const, time: "1 hr ago" },
  { id: "a4", message: "Evidence file anchored on-chain for case #87", severity: "low" as const, time: "3 hrs ago" },
  { id: "a5", message: "Risk score update: 0xb4e...2a1 now Critical", severity: "critical" as const, time: "5 hrs ago" },
];

export const mockCases = [
  { id: "CASE-001", title: "DeFi Protocol Exploit Investigation", status: "open" as const, priority: "critical" as const, createdDate: "2026-01-15", assignedOfficer: "Namoj", linkedWalletCount: 24 },
  { id: "CASE-002", title: "Suspected Money Laundering via Mixers", status: "investigating" as const, priority: "high" as const, createdDate: "2026-01-22", assignedOfficer: "James Rodriguez", linkedWalletCount: 47 },
  { id: "CASE-003", title: "NFT Wash Trading Ring", status: "investigating" as const, priority: "medium" as const, createdDate: "2026-02-01", assignedOfficer: "Aisha Patel", linkedWalletCount: 12 },
  { id: "CASE-004", title: "Ransomware Payment Tracing", status: "open" as const, priority: "critical" as const, createdDate: "2026-02-03", assignedOfficer: "Namoj", linkedWalletCount: 8 },
  { id: "CASE-005", title: "Phishing Wallet Cluster Analysis", status: "closed" as const, priority: "low" as const, createdDate: "2025-12-10", assignedOfficer: "Mike Torres", linkedWalletCount: 31 },
  { id: "CASE-006", title: "Cross-chain Bridge Exploit", status: "open" as const, priority: "high" as const, createdDate: "2026-02-07", assignedOfficer: "James Rodriguez", linkedWalletCount: 19 },
];

export const mockWalletData = {
  address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  blockchain: "ETH",
  totalVolume: 2450000,
  totalTransfers: 342,
  currentBalance: 12.45,
  portfolioValue: 41250,
  riskScore: 78,
  firstSeen: "2024-03-15T08:30:00Z",
  lastSeen: "2026-02-09T14:22:00Z",
  exposure: {
    exchange: 35,
    defi: 28,
    mixer: 22,
    bridge: 10,
    scam: 5,
  },
};

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  volume: number;
  riskScore: number;
  label: string;
  type: "wallet" | "exchange" | "mixer" | "contract";
}

export interface GraphEdge {
  source: string;
  target: string;
  transfers: number;
  volume: number;
}

export const mockGraphNodes: GraphNode[] = [
  { id: "n1", x: 150, y: 300, volume: 2450000, riskScore: 78, label: "0x7a25...488D", type: "wallet" },
  { id: "n2", x: 350, y: 200, volume: 890000, riskScore: 45, label: "0xd9e1...3f2A", type: "exchange" },
  { id: "n3", x: 350, y: 400, volume: 1200000, riskScore: 92, label: "0x3c44...9876", type: "mixer" },
  { id: "n4", x: 550, y: 150, volume: 450000, riskScore: 23, label: "0xf39F...2266", type: "exchange" },
  { id: "n5", x: 550, y: 300, volume: 670000, riskScore: 67, label: "0x7082...bA6e", type: "wallet" },
  { id: "n6", x: 550, y: 450, volume: 340000, riskScore: 88, label: "0x9965...1234", type: "contract" },
  { id: "n7", x: 750, y: 200, volume: 210000, riskScore: 34, label: "0xAb8a...7dF1", type: "wallet" },
  { id: "n8", x: 750, y: 380, volume: 560000, riskScore: 71, label: "0x1CBd...9c02", type: "wallet" },
  { id: "n9", x: 950, y: 280, volume: 180000, riskScore: 15, label: "0x2e1a...5Bc3", type: "exchange" },
  { id: "n10", x: 950, y: 420, volume: 890000, riskScore: 95, label: "0xDEAD...BEEF", type: "mixer" },
];

export const mockGraphEdges: GraphEdge[] = [
  { source: "n1", target: "n2", transfers: 12, volume: 450000 },
  { source: "n1", target: "n3", transfers: 8, volume: 780000 },
  { source: "n2", target: "n4", transfers: 5, volume: 200000 },
  { source: "n2", target: "n5", transfers: 15, volume: 340000 },
  { source: "n3", target: "n5", transfers: 3, volume: 150000 },
  { source: "n3", target: "n6", transfers: 7, volume: 280000 },
  { source: "n5", target: "n7", transfers: 4, volume: 120000 },
  { source: "n5", target: "n8", transfers: 9, volume: 410000 },
  { source: "n7", target: "n9", transfers: 2, volume: 80000 },
  { source: "n8", target: "n9", transfers: 6, volume: 250000 },
  { source: "n8", target: "n10", transfers: 11, volume: 670000 },
  { source: "n6", target: "n10", transfers: 4, volume: 190000 },
];

export const mockTransactions = [
  { hash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890", from: "0x7a25...488D", to: "0xd9e1...3f2A", amount: 15.5, token: "ETH", usdValue: 51425, timestamp: "2026-02-09T14:22:00Z", riskFlag: "none" as const },
  { hash: "0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab", from: "0x7a25...488D", to: "0x3c44...9876", amount: 50000, token: "USDT", usdValue: 50000, timestamp: "2026-02-09T12:15:00Z", riskFlag: "high" as const },
  { hash: "0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd", from: "0xd9e1...3f2A", to: "0x7a25...488D", amount: 8.2, token: "ETH", usdValue: 27180, timestamp: "2026-02-08T22:45:00Z", riskFlag: "medium" as const },
  { hash: "0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", from: "0x3c44...9876", to: "0x7082...bA6e", amount: 25000, token: "USDC", usdValue: 25000, timestamp: "2026-02-08T18:30:00Z", riskFlag: "critical" as const },
  { hash: "0x5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12", from: "0xf39F...2266", to: "0x7a25...488D", amount: 3.1, token: "ETH", usdValue: 10280, timestamp: "2026-02-07T09:10:00Z", riskFlag: "none" as const },
  { hash: "0x6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234", from: "0x7082...bA6e", to: "0xDEAD...BEEF", amount: 100000, token: "USDT", usdValue: 100000, timestamp: "2026-02-06T16:55:00Z", riskFlag: "critical" as const },
];

export const mockHighRiskWallets = [
  { address: "0xDEAD...BEEF", riskScore: 95, totalVolume: 8900000, linkedCases: 4, lastActivity: "2026-02-09" },
  { address: "0x3c44...9876", riskScore: 92, totalVolume: 12000000, linkedCases: 3, lastActivity: "2026-02-08" },
  { address: "0x9965...1234", riskScore: 88, totalVolume: 3400000, linkedCases: 2, lastActivity: "2026-02-07" },
  { address: "0x7a25...488D", riskScore: 78, totalVolume: 2450000, linkedCases: 1, lastActivity: "2026-02-09" },
  { address: "0x1CBd...9c02", riskScore: 71, totalVolume: 5600000, linkedCases: 2, lastActivity: "2026-02-05" },
];

export const mockEvidence = [
  { id: "ev1", fileName: "wallet_cluster_analysis.pdf", type: "PDF", hash: "a3f2b1c4d5e6f7890123456789abcdef01234567", uploadedBy: "Namoj", timestamp: "2026-02-08T10:30:00Z", anchorTxHash: "0xabc...123" },
  { id: "ev2", fileName: "transaction_screenshot.png", type: "Image", hash: "b4e3c2d5f6a7890123456789abcdef0123456789", uploadedBy: "James Rodriguez", timestamp: "2026-02-07T15:22:00Z", anchorTxHash: null },
  { id: "ev3", fileName: "suspicious_patterns.txt", type: "Text", hash: "c5f4d3e6a7b890123456789abcdef01234567890", uploadedBy: "Aisha Patel", timestamp: "2026-02-06T09:15:00Z", anchorTxHash: "0xdef...456" },
];

export const riskDistributionData = [
  { name: "Critical", value: 124, fill: "hsl(0, 84%, 60%)" },
  { name: "High", value: 312, fill: "hsl(25, 95%, 53%)" },
  { name: "Medium", value: 456, fill: "hsl(45, 93%, 47%)" },
  { name: "Low", value: 687, fill: "hsl(142, 71%, 45%)" },
  { name: "None", value: 1893, fill: "hsl(210, 16%, 82%)" },
];

export const investigationsByStatus = [
  { name: "Open", value: 38, fill: "hsl(221, 83%, 53%)" },
  { name: "Investigating", value: 15, fill: "hsl(25, 95%, 53%)" },
  { name: "Closed", value: 194, fill: "hsl(142, 71%, 45%)" },
];
