import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChatTypingSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex justify-start", className)}
      aria-label="Assistant is typing"
      role="status"
    >
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[var(--whatsapp-in)] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-2 rounded-full bg-emerald-200" />
          <Skeleton className="size-2 rounded-full bg-emerald-300" />
          <Skeleton className="size-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  );
}
