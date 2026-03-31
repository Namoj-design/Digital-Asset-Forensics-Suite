import { CopyButton } from "./CopyButton";

export const shortenAddress = (addr: string, chars = 6) =>
  addr.length > chars * 2 + 2 ? `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}` : addr;

export const WalletAddress = ({ address, full = false }: { address: string; full?: boolean }) => (
  <span className="inline-flex items-center gap-1">
    <span className="wallet-address">{full ? address : shortenAddress(address)}</span>
    <CopyButton text={address} size="xs" />
  </span>
);
