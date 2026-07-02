"use client";

import type { Order } from "../lib/types";

interface OrderBookProps {
  orders: Order[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
}

function StatusBadge({ order }: { order: Order }) {
  if (order.matched)   return <span className="px-2 py-0.5 rounded-full text-xs bg-violet-500/15 text-violet-400 border border-violet-500/25">Matched</span>;
  if (order.cancelled) return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700/50 text-slate-500 border border-slate-700">Cancelled</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Open</span>;
}

export default function OrderBook({ orders, selectedIds, onToggleSelect }: OrderBookProps) {
  const open = orders.filter((o) => !o.matched && !o.cancelled);
  const closed = orders.filter((o) => o.matched || o.cancelled);

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-6">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">
          Order Book
        </h2>
        <div className="text-center py-12 text-slate-600">
          <p className="text-2xl mb-2">—</p>
          <p className="text-sm">No orders yet. Submit a BUY or SELL order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
          Order Book
        </h2>
        <span className="text-xs text-slate-500 bg-[#0a0a14] border border-[#1a1a2e] px-2 py-1 rounded-md">
          {open.length} open · {closed.length} closed
        </span>
      </div>

      <p className="text-xs text-slate-600 mb-4">
        Price and amount are hidden. Only Poseidon commitment hashes are visible on-chain.
        Select two open orders to generate a match proof.
      </p>

      <div className="space-y-2">
        {orders.map((order) => {
          const isSelected = selectedIds.includes(order.id);
          const isSelectable = !order.matched && !order.cancelled;

          return (
            <div
              key={order.id}
              onClick={() => isSelectable && onToggleSelect(order.id)}
              className={`rounded-lg border px-4 py-3 transition-all ${
                isSelectable ? "cursor-pointer" : "cursor-default opacity-60"
              } ${
                isSelected
                  ? "border-violet-500/50 bg-violet-500/10"
                  : isSelectable
                  ? "border-[#1a1a2e] bg-[#0a0a14] hover:border-slate-600"
                  : "border-[#1a1a2e] bg-[#080810]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isSelectable && (
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "border-violet-500 bg-violet-500"
                          : "border-slate-600"
                      }`}
                    >
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                  )}

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                      order.side === "BUY"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        : "bg-red-500/10 text-red-400 border-red-500/25"
                    }`}
                  >
                    {order.side}
                  </span>

                  <span className="font-mono text-xs text-slate-500">
                    #{String(order.id).slice(-4)}
                  </span>
                </div>

                <StatusBadge order={order} />
              </div>

              <div className="mt-2 ml-7 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-20">Commitment</span>
                  <span className="font-mono text-xs text-slate-500">
                    {order.commitment.slice(0, 18)}...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-20">Price</span>
                  <span className="text-xs text-slate-600 italic">
                    {order._price
                      ? `$${(Number(order._price) / 1e6).toFixed(6)} (private)`
                      : "hidden"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-20">Amount</span>
                  <span className="text-xs text-slate-600 italic">
                    {order._amount
                      ? `${(Number(order._amount) / 1e6).toFixed(2)} USDC (private)`
                      : "hidden"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
