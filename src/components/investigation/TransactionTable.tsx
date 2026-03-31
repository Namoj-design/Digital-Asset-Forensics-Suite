import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "@/components/common/CopyButton";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletTxList } from "@/hooks/useEtherscan";
import { weiToEth, shortenAddress, formatTimestamp, CHAINS, ChainId } from "@/lib/etherscan";
import { List } from "lucide-react";

interface TransactionTableProps {
  address?: string;
  chainId?: ChainId;
}

export const TransactionTable = ({ address = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", chainId = 137 }: TransactionTableProps) => {
  const txList = useWalletTxList(address, chainId, 1, 20);
  const chain = CHAINS[chainId];

  return (
    <div className="forensic-panel">
      <div className="p-2.5 border-b border-border flex items-center gap-2">
        <List className="h-3 w-3 text-primary" />
        <h3 className="text-[9px] font-mono font-bold text-foreground tracking-[0.15em] uppercase">Transaction Log — Live</h3>
      </div>
      {txList.isLoading ? (
        <div className="p-3 space-y-1.5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full bg-muted" />)}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Tx Hash</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">From</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">To</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right">Value</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase text-right">Gas</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Time</TableHead>
              <TableHead className="text-[9px] font-mono tracking-widest uppercase">Block</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(txList.data) && txList.data.map(tx => (
              <TableRow key={tx.hash} className="border-border hover:bg-muted/20 transition-colors">
                <TableCell>
                  <span className="inline-flex items-center gap-1">
                    <span className="font-mono text-[10px] text-primary">{shortenAddress(tx.hash, 8)}</span>
                    <CopyButton text={tx.hash} size="xs" />
                  </span>
                </TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">{shortenAddress(tx.from)}</TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">{shortenAddress(tx.to)}</TableCell>
                <TableCell className="text-right font-mono text-[10px]">{weiToEth(tx.value).toFixed(4)} {chain.symbol}</TableCell>
                <TableCell className="text-right text-[10px] font-mono text-muted-foreground">{Number(tx.gasUsed).toLocaleString()}</TableCell>
                <TableCell className="text-[10px] text-muted-foreground font-mono">{formatTimestamp(tx.timeStamp)}</TableCell>
                <TableCell className="text-[10px] font-mono text-muted-foreground">{tx.blockNumber}</TableCell>
              </TableRow>
            ))}
            {Array.isArray(txList.data) && txList.data.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-[10px] font-mono">No transactions found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
