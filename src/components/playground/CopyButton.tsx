"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

type CopyButtonProps = {
  getText: () => string;
  label?: string;
  successMessage?: string;
  size?: "sm" | "default";
  variant?: "default" | "secondary" | "ghost" | "outline";
};

export function CopyButton({
  getText,
  label = "コードをコピー",
  successMessage = "コードをクリップボードにコピーしました",
  size = "sm",
  variant = "secondary",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("コピーに失敗しました — クリップボードを利用できません");
    }
  };

  return (
    <Button variant={variant} size={size} onClick={onCopy} className="gap-1.5">
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label}
    </Button>
  );
}
