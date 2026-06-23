"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, RefreshCw } from "lucide-react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { AdminDateTimeCell } from "@/components/admin/admin-datetime-cell";
import { ConnectionErrorBanner } from "@/components/ui/connection-error-banner";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { Button } from "@/components/ui/button";
import type { ShipmentRow } from "@/lib/admin/shipments-list";
import { mapShipmentStatusFromDb } from "@/lib/orders/shipment-status-compat";
import type { PaymentStatus, ShipmentStatus } from "@/lib/types";
import {
  isShipmentBlockedForOrder,
  SHIPMENT_STATUS_BLOCKED_TOOLTIP,
} from "@/lib/admin/order-utils";
import type { PaymentMethod } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ShipmentFilter = "all" | ShipmentStatus;

const FILTER_PILLS: { key: ShipmentFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "awaiting_payment", label: "Awaiting Payment" },
  { key: "packed", label: "Packed" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_OPTIONS: { value: ShipmentStatus; label: string }[] = [
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "packed", label: "Packed" },
  { value: "in_transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
];

const SHIPMENT_CHIP_STYLES: Record<ShipmentStatus, string> = {
  awaiting_payment: "bg-amber-100 text-amber-700",
  assigned: "bg-gray-100 text-gray-700",
  packed: "bg-purple-100 text-purple-700",
  in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
};

function formatStatusLabel(status: ShipmentStatus): string {
  return status.replace(/_/g, " ");
}

function getCustomerLabel(row: ShipmentRow): string {
  return row.customer_name ?? row.customer_phone ?? "Unknown customer";
}

function mapOrderRow(row: {
  id: string;
  delivery_courier: string | null;
  tracking_id: string | null;
  shipment_status: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  customers: { name: string | null; phone: string | null } | null;
}): ShipmentRow | null {
  if (!row.tracking_id) return null;

  return {
    id: row.id,
    delivery_courier: row.delivery_courier,
    tracking_id: row.tracking_id,
    shipment_status: mapShipmentStatusFromDb(row.shipment_status),
    payment_status: row.payment_status,
    payment_method: row.payment_method ?? "upi",
    notes: row.notes,
    created_at: row.created_at,
    customer_name: row.customers?.name ?? null,
    customer_phone: row.customers?.phone ?? null,
  };
}

async function fetchShipmentsFromApi(): Promise<ShipmentRow[]> {
  const response = await fetch("/api/admin/shipments", { cache: "no-store" });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }

  const data = (await response.json()) as { shipments: ShipmentRow[] };
  if (process.env.NODE_ENV === "development") {
    console.log("[ADMIN SHIPMENTS]", { rows: data.shipments.length });
  }
  return data.shipments;
}

async function updateShipmentStatusViaApi(
  orderId: string,
  status: ShipmentStatus,
): Promise<void> {
  const response = await fetch("/api/admin/shipments", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, status }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
}

function ShipmentStatusChip({ status }: { status: ShipmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        SHIPMENT_CHIP_STYLES[status],
      )}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

interface StatusChangeDropdownProps {
  orderId: string;
  currentStatus: ShipmentStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  flashSuccess: boolean;
  onStatusChange: (orderId: string, status: ShipmentStatus) => Promise<void>;
}

function StatusChangeDropdown({
  orderId,
  currentStatus,
  paymentMethod,
  paymentStatus,
  flashSuccess,
  onStatusChange,
}: StatusChangeDropdownProps) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shipmentBlocked = isShipmentBlockedForOrder(paymentMethod, paymentStatus);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleSelect(status: ShipmentStatus) {
    if (status === currentStatus) {
      setOpen(false);
      return;
    }

    setUpdating(true);
    try {
      await onStatusChange(orderId, status);
      setOpen(false);
    } finally {
      setUpdating(false);
    }
  }

  const currentLabel =
    STATUS_OPTIONS.find((option) => option.value === currentStatus)?.label ??
    formatStatusLabel(currentStatus);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-md transition-colors duration-300",
        flashSuccess && "bg-green-100",
      )}
      title={shipmentBlocked ? SHIPMENT_STATUS_BLOCKED_TOOLTIP : undefined}
    >
      <button
        type="button"
        disabled={updating || shipmentBlocked}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full min-w-[140px] items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-left text-sm text-gray-700 transition-colors hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 min-w-full overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => void handleSelect(option.value)}
              className={cn(
                "flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50",
                option.value === currentStatus
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-700",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<ShipmentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFlashIds, setSuccessFlashIds] = useState<Set<string>>(
    new Set(),
  );
  const flashTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const flashSuccess = useCallback((orderId: string) => {
    setSuccessFlashIds((current) => {
      const next = new Set(current);
      next.add(orderId);
      return next;
    });

    const existing = flashTimeoutsRef.current.get(orderId);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      setSuccessFlashIds((current) => {
        const next = new Set(current);
        next.delete(orderId);
        return next;
      });
      flashTimeoutsRef.current.delete(orderId);
    }, 1000);

    flashTimeoutsRef.current.set(orderId, timeout);
  }, []);

  const loadShipments = useCallback(async (options?: { isRefresh?: boolean }) => {
    if (options?.isRefresh) {
      setRefreshing(true);
    }

    try {
      const rows = await fetchShipmentsFromApi();
      setShipments(rows);
      setError(null);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load shipments.";
      if (process.env.NODE_ENV === "development") {
        console.error("[ADMIN SHIPMENTS] load failed:", loadError);
      }
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleStatusChange = useCallback(
    async (orderId: string, status: ShipmentStatus) => {
      try {
        await updateShipmentStatusViaApi(orderId, status);
      } catch (updateError) {
        const message =
          updateError instanceof Error
            ? updateError.message
            : "Failed to update shipment status.";
        setError(message);
        throw updateError;
      }

      setShipments((current) =>
        current.map((row) =>
          row.id === orderId ? { ...row, shipment_status: status } : row,
        ),
      );
      flashSuccess(orderId);
      setError(null);
    },
    [flashSuccess],
  );

  const applyRealtimeOrder = useCallback(
    (record: Record<string, unknown> | undefined) => {
      if (!record || typeof record.id !== "string") return;

      const mapped = mapOrderRow({
        id: record.id,
        delivery_courier:
          typeof record.delivery_courier === "string"
            ? record.delivery_courier
            : null,
        tracking_id:
          typeof record.tracking_id === "string" ? record.tracking_id : null,
        shipment_status: mapShipmentStatusFromDb(
          String(record.shipment_status ?? "assigned"),
        ),
        payment_status: record.payment_status as PaymentStatus,
        payment_method: (record.payment_method as PaymentMethod) ?? "upi",
        notes: typeof record.notes === "string" ? record.notes : null,
        created_at:
          typeof record.created_at === "string"
            ? record.created_at
            : new Date().toISOString(),
        customers: null,
      });

      if (!mapped) {
        setShipments((current) => current.filter((row) => row.id !== record.id));
        return;
      }

      setShipments((current) => {
        const index = current.findIndex((row) => row.id === mapped.id);

        if (index === -1) {
          void loadShipments();
          return current;
        }

        const next = [...current];
        next[index] = {
          ...next[index],
          delivery_courier: mapped.delivery_courier,
          tracking_id: mapped.tracking_id,
          shipment_status: mapped.shipment_status,
          payment_status: mapped.payment_status,
          payment_method: mapped.payment_method,
          notes: mapped.notes,
          created_at: mapped.created_at,
        };
        return next;
      });
    },
    [loadShipments],
  );

  useEffect(() => {
    void loadShipments();

    const supabase = createClient();
    const flashTimeouts = flashTimeoutsRef.current;

    const handler = (
      payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>,
    ) => {
      if (payload.eventType === "DELETE") {
        const oldRecord = payload.old as Record<string, unknown> | undefined;
        if (oldRecord && typeof oldRecord.id === "string") {
          setShipments((current) =>
            current.filter((row) => row.id !== oldRecord.id),
          );
        }
        return;
      }

      if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
        applyRealtimeOrder(payload.new as Record<string, unknown>);
      }
    };

    const channel = supabase
      .channel("admin-shipments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        handler,
      )
      .subscribe();

    return () => {
      flashTimeouts.forEach((timeout) => clearTimeout(timeout));
      flashTimeouts.clear();
      void supabase.removeChannel(channel);
    };
  }, [applyRealtimeOrder, loadShipments]);

  const filteredShipments =
    activeFilter === "all"
      ? shipments
      : shipments.filter((row) => row.shipment_status === activeFilter);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Logistics & Shipments
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Monitor dispatches, tracking IDs, and courier delivery statuses in
            real-time.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadShipments({ isRefresh: true })}
            disabled={refreshing}
            aria-label="Refresh shipments"
          >
            <RefreshCw
              className={cn("size-4", refreshing && "animate-spin")}
            />
          </Button>
          <span className="flex items-center gap-1.5 text-sm text-green-500">
            <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
            Live Tracking
          </span>
        </div>
      </div>

      {error ? (
        <ConnectionErrorBanner
          message={`Failed to load shipments: ${error}`}
          onRetry={() => void loadShipments()}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill.key}
            type="button"
            onClick={() => setActiveFilter(pill.key)}
            className={cn(
              "rounded-full border border-gray-200 px-4 py-1.5 text-sm transition-colors",
              activeFilter === pill.key
                ? "border-green-500 bg-green-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50",
            )}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500">
        {loading
          ? "Loading shipments…"
          : `${filteredShipments.length} shipment${filteredShipments.length === 1 ? "" : "s"} found`}
      </p>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Courier Partner</th>
                <th className="px-5 py-3">Tracking Reference</th>
                <th className="min-w-[7.5rem] whitespace-nowrap px-5 py-3">Created Date</th>
                <th className="px-5 py-3">Shipment Status</th>
                <th className="px-5 py-3">Logistics Notes</th>
                <th className="px-5 py-3">Change Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} columns={8} />
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    {shipments.length === 0
                      ? "No shipments yet."
                      : "No shipments match this filter."}
                  </td>
                </tr>
              ) : (
                filteredShipments.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {row.id}
                    </td>
                    <td className="px-5 py-4 text-gray-700">
                      {getCustomerLabel(row)}
                    </td>
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {row.delivery_courier ?? "Pending assignment"}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-gray-600">
                      {row.tracking_id}
                    </td>
                    <td className="min-w-[7.5rem] whitespace-nowrap px-5 py-4">
                      <AdminDateTimeCell iso={row.created_at} />
                    </td>
                    <td className="px-5 py-4">
                      <ShipmentStatusChip status={row.shipment_status} />
                    </td>
                    <td className="max-w-[200px] truncate px-5 py-4 text-gray-600">
                      {row.notes ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusChangeDropdown
                        orderId={row.id}
                        currentStatus={row.shipment_status}
                        paymentMethod={row.payment_method}
                        paymentStatus={row.payment_status}
                        flashSuccess={successFlashIds.has(row.id)}
                        onStatusChange={handleStatusChange}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
