"use client";

import { Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({ onSend, disabled, className }: ChatInputProps) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-2 border-t border-border/50 bg-[var(--whatsapp-in)] px-3 py-2.5 safe-bottom",
        className
      )}
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message…"
        disabled={disabled}
        className="flex-1 rounded-full border-none bg-white shadow-sm focus-visible:ring-emerald-500"
        autoComplete="off"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !text.trim()}
        className="size-10 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700"
        aria-label="Send message"
      >
        <Send className="size-4" />
      </Button>
    </form>
  );
}
