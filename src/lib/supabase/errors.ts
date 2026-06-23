import type { PostgrestError } from "@supabase/supabase-js";

export function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "code" in error
  );
}

export function isMissingColumnError(
  error: unknown,
  column: string,
): boolean {
  return (
    isPostgrestError(error) &&
    error.code === "42703" &&
    error.message.includes(column)
  );
}

export function isCheckConstraintError(
  error: unknown,
  constraintHint?: string,
): boolean {
  return (
    isPostgrestError(error) &&
    error.code === "23514" &&
    (!constraintHint ||
      error.message.toLowerCase().includes(constraintHint.toLowerCase()))
  );
}

export function formatSupabaseError(error: unknown): string {
  if (isPostgrestError(error)) {
    const parts = [error.message];
    if (error.details) parts.push(error.details);
    if (error.hint) parts.push(`Hint: ${error.hint}`);
    if (error.code) parts.push(`[${error.code}]`);
    return parts.join(" — ");
  }

  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function serializeErrorForLog(error: unknown): Record<string, unknown> {
  if (isPostgrestError(error)) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, name: error.name };
  }

  return { message: String(error) };
}

export function isStaleChatSessionError(error: unknown): boolean {
  if (isPostgrestError(error) && error.code === "23503") return true;
  if (
    error instanceof Error &&
    error.message.includes("session may be stale")
  ) {
    return true;
  }
  return false;
}

export function diagnoseSupabaseError(error: unknown): string {
  if (!isPostgrestError(error)) {
    return formatSupabaseError(error);
  }

  switch (error.code) {
    case "23503":
      return `Foreign key violation — a referenced record is missing (e.g. business not seeded). ${formatSupabaseError(error)}`;
    case "23505":
      return `Duplicate entry — this phone number is already registered for this store. ${formatSupabaseError(error)}`;
    case "23502":
      return `Required field is missing. ${formatSupabaseError(error)}`;
    case "42501":
      return `Permission denied by row-level security policy. ${formatSupabaseError(error)}`;
    case "23514":
      if (error.message.includes("shipment_status")) {
        return `Invalid shipment status for the current database schema. Run supabase/migrations/20250623100000_order_state_machine.sql. ${formatSupabaseError(error)}`;
      }
      return formatSupabaseError(error);
    default:
      return formatSupabaseError(error);
  }
}
