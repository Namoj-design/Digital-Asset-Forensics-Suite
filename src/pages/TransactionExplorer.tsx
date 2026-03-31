import { useState } from "react";
import { Search, AlertTriangle, CheckCircle, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/common/CopyButton";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryClient } from "@tanstack/react-query";
import { useTransactionByHash, useTransactionReceipt } from "@/hooks/useEtherscan";
import { weiToEth, hexToNumber } from "@/lib/etherscan";
import { useChain } from "@/contexts/ChainContext";

const TransactionExplorer = () => {
  const [input, setInput] = useState("");
  const [txHash, setTxHash] = useState<string | undefined>();
  const { selectedChain, chainConfig } = useChain();

  const tx = useTransactionByHash(txHash, chainConfig.scanId as any);
  const receipt = useTransactionReceipt(txHash, chainConfig.scanId as any);

  const handleSearch = () => {
    const trimmed = input.trim();
    if (trimmed.length === 66 && trimmed.startsWith("0x")) {
      setTxHash(trimmed);
    }
  };

  const txData = tx.data;
  const receiptData = receipt.data;

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center gap-3">
        <Hash className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-xs font-bold text-foreground tracking-[0.2em] uppercase">Transaction Explorer</h2>
          <p className="text-[10px] text-muted-foreground font-mono">Inspect any blockchain transaction</p>
        </div>
      </div>

      <div className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Enter transaction hash (0x...)" className="pl-8 font-mono text-[10px] h-8 bg-background border-border" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} />
        </div>
        <button onClick={handleSearch} className="btn-tactical h-8 text-[10px] px-4">Inspect</button>
      </div>

      {(tx.isLoading || receipt.isLoading) && <Skeleton className="h-60 w-full bg-card" />}

      {tx.isError && (
        <div className="forensic-panel p-4 text-center text-hud-red text-[11px] font-mono">
          Failed to fetch transaction. Check hash and chain.
        </div>
      )}

      {txData && (
        <div className="forensic-panel corner-brackets">
          <div className="p-3 border-b border-border flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-primary" />
            <span className="text-[9px] font-mono font-bold tracking-[0.15em] uppercase text-foreground">Transaction Details</span>
            {receiptData && (
              <span className={`risk-badge ml-2 ${receiptData.status === "0x1" ? "risk-low" : "risk-critical"}`}>
                {receiptData.status === "0x1" ? <><CheckCircle className="h-3 w-3 mr-1" />Success</> : <><AlertTriangle className="h-3 w-3 mr-1" />Failed</>}
              </span>
            )}
            <span className="text-[9px] font-mono text-primary/70 tracking-widest uppercase border border-primary/20 px-1.5 py-0.5 ml-auto">{chainConfig.name}</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Tx Hash" value={txData.hash} copy />
            <Field label="Block" value={txData.blockNumber ? hexToNumber(txData.blockNumber).toLocaleString() : "Pending"} />
            <Field label="From" value={txData.from} copy />
            <Field label="To" value={txData.to || "Contract Creation"} copy={!!txData.to} />
            <Field label="Value" value={`${weiToEth(txData.value).toFixed(6)} ${chainConfig.symbol}`} />
            <Field label="Gas Limit" value={hexToNumber(txData.gas).toLocaleString()} />
            {txData.gasPrice && <Field label="Gas Price" value={`${(hexToNumber(txData.gasPrice) / 1e9).toFixed(2)} Gwei`} />}
            {receiptData && <Field label="Gas Used" value={hexToNumber(receiptData.gasUsed).toLocaleString()} />}
            <Field label="Nonce" value={hexToNumber(txData.nonce).toString()} />
            {receiptData?.logs && <Field label="Events" value={`${receiptData.logs.length} log(s)`} />}
          </div>

          {txData.input && txData.input !== "0x" && (
            <div className="px-4 pb-4">
              <p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase mb-1">Input Data</p>
              <div className="p-2.5 bg-muted/30 border border-border font-mono text-[10px] break-all max-h-20 overflow-auto text-muted-foreground">
                {txData.input}
              </div>
            </div>
          )}
        </div>
      )}

      {!txHash && !tx.isLoading && (
        <div className="text-center py-16">
          <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">Enter transaction hash to inspect</p>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, copy }: { label: string; value: string; copy?: boolean }) => (
  <div>
    <p className="text-[9px] text-muted-foreground font-mono tracking-wider uppercase">{label}</p>
    <div className="flex items-center gap-1">
      <p className="text-[11px] font-mono text-foreground truncate">{value}</p>
      {copy && <CopyButton text={value} size="xs" />}
    </div>
  </div>
);

export default TransactionExplorer;
