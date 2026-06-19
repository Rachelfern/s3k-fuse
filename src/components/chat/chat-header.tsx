"use client";

import Link from "next/link";
import { ArrowLeft, Phone, Video } from "lucide-react";
import { S3KLogo } from "@/components/brand/s3k-logo";
import { CartPill } from "@/components/chat/cart-pill";
import { mockBusiness } from "@/lib/mock/business";

export function ChatHeader() {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-[var(--whatsapp-header)] px-3 py-2.5 shadow-md safe-top">
      <Link
        href="/"
        className="rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/10"
        aria-label="Back to home"
      >
        <ArrowLeft className="size-5" />
      </Link>

      <S3KLogo size="sm" className="ring-white/20" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {mockBusiness.name}
        </p>
        <p className="truncate text-xs text-emerald-100/80">online</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="rounded-full p-2 text-white/80 hover:bg-white/10"
          aria-label="Video call"
        >
          <Video className="size-4" />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-white/80 hover:bg-white/10"
          aria-label="Voice call"
        >
          <Phone className="size-4" />
        </button>
        <CartPill />
      </div>
    </header>
  );
}
