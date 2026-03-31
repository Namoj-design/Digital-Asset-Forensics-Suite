import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CopyButton = ({ text, size = "sm" }: { text: string; size?: "sm" | "xs" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={size === "xs" ? "h-5 w-5" : "h-7 w-7"}
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3 w-3 text-status-closed" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  );
};
