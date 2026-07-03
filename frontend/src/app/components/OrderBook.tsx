"use client";

import type { Order } from "../lib/types";

interface OrderBookProps {
  orders: Order[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onMatchClick: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function StatusBadge({ order }: { order: Order }) {
  if (order.matched)
    return (
      <span
        style={{
          font: "500 10px var(--font-mono), monospace",
          color: "#3ECF8E",
          background: "rgba(62,207,142,.1)",
          padding: "4px 9px",
          borderRadius: 20,
        }}
      >
        MATCHED
      </span>
    );
  if (order.cancelled)
    return (
      <span
        style={{
          font: "500 10px var(--font-mono), monospace",
          color: "#F26D78",
          background: "rgba(242,109,120,.1)",
          padding: "4px 9px",
          borderRadius: 20,
        }}
      >
        CANCELLED
      </span>
    );
  return (
    <span
      style={{
        font: "500 10px var(--font-mono), monospace",
        color: "#9D8CFF",
        background: "rgba(157,140,255,.12)",
        padding: "4px 9px",
        borderRadius: 20,
      }}
    >
      OPEN
    </span>
  );
}

function RedactBar({ w = 44 }: { w?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: w,
        height: 10,
        borderRadius: 2,
        background: "repeating-linear-gradient(45deg, rgba(157,140,255,.3) 0 3px, rgba(157,140,255,.1) 3px 6px)",
      }}
    />
  );
}

const COL = "52px 1.5fr 1.2fr .9fr .8fr .9fr .6fr .9fr 48px";

export default function OrderBook({ orders, selectedIds, onToggleSelect, onMatchClick, onRefresh, refreshing }: OrderBookProps) {
  const open    = orders.filter((o) => !o.matched && !o.cancelled);
  const matched = orders.filter((o) => o.matched);
  const cancelled = orders.filter((o) => o.cancelled);

  const canMatch = selectedIds.length === 2;

  return (
    <div
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flex: 1,
      }}
    >
      {/* Book header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 22px",
          borderBottom: "1px solid rgba(255,255,255,.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ font: "600 15px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>Order book</span>
          <span style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
            commitments only — terms never touch the chain
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              style={{
                font: "500 10.5px var(--font-mono), monospace",
                color: "#9B99AF",
                background: "transparent",
                border: "1px solid rgba(255,255,255,.12)",
                padding: "5px 10px",
                borderRadius: 20,
                cursor: refreshing ? "default" : "pointer",
                opacity: refreshing ? 0.5 : 1,
              }}
            >
              {refreshing ? "loading…" : "↻ refresh"}
            </button>
          )}
          <span style={{ font: "500 10.5px var(--font-mono), monospace", color: "#9D8CFF", background: "rgba(157,140,255,.1)", padding: "5px 10px", borderRadius: 20 }}>
            {open.length} OPEN
          </span>
          {matched.length > 0 && (
            <span style={{ font: "500 10.5px var(--font-mono), monospace", color: "#3ECF8E", background: "rgba(62,207,142,.1)", padding: "5px 10px", borderRadius: 20 }}>
              {matched.length} MATCHED
            </span>
          )}
          {cancelled.length > 0 && (
            <span style={{ font: "500 10.5px var(--font-mono), monospace", color: "#5D5B6E", background: "rgba(255,255,255,.06)", padding: "5px 10px", borderRadius: 20 }}>
              {cancelled.length} CANCELLED
            </span>
          )}
        </div>
      </div>

      {/* Column headers */}
      {orders.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: COL,
            gap: 8,
            alignItems: "center",
            padding: "12px 22px",
            font: "500 10px var(--font-mono), monospace",
            letterSpacing: "0.12em",
            color: "#5D5B6E",
            borderBottom: "1px solid rgba(255,255,255,.07)",
          }}
        >
          <span>ID</span>
          <span>COMMITMENT</span>
          <span>TRADER</span>
          <span>DEPOSIT</span>
          <span style={{ color: "#9D8CFF" }}>SIDE·ZK</span>
          <span style={{ color: "#9D8CFF" }}>PRICE·ZK</span>
          <span>AGE</span>
          <span>STATUS</span>
          <span>SEL</span>
        </div>
      )}

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {orders.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, gap: 12 }}>
            <span style={{ font: "400 36px var(--font-serif), Georgia, serif", color: "#5D5B6E" }}>—</span>
            <p style={{ font: "400 13px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
              No orders yet. Submit a hidden order using the form.
            </p>
          </div>
        ) : (
          orders.map((order, idx) => {
            const isSelected   = selectedIds.includes(order.id);
            const hasPrivate   = !!(order._price && order._amount && order._secret);
            // Only open orders WITH private data can be selected for matching
            const isSelectable = !order.matched && !order.cancelled && hasPrivate;
            const isOpen       = !order.matched && !order.cancelled;
            const orderId      = String(idx + 1).padStart(2, "0");
            const commitHex    = "0x" + BigInt(order.commitment).toString(16).padStart(64, "0");
            const shortCommit  = commitHex.slice(0, 8) + "…" + commitHex.slice(-4);
            const shortTrader  = order.trader.slice(0, 4) + "…" + order.trader.slice(-4);
            const depositXlm   = (Number(order.deposit) / 1_000_000).toFixed(2);
            const ageDiff      = Date.now() - order.id;
            // id values offset by 1_000_000 are placeholders (no relay timestamp)
            const hasRealAge   = !!(order._price) || ageDiff < 3_600_000 * 24;
            const ageMin       = Math.floor(ageDiff / 60000);
            const ageLabel     = !hasRealAge ? "—" : ageMin < 1 ? "just now" : ageMin < 60 ? ageMin + "m" : Math.floor(ageMin / 60) + "h";

            return (
              <div
                key={order.id}
                onClick={() => isSelectable && onToggleSelect(order.id)}
                title={isOpen && !hasPrivate ? "Cannot select — private data (price/secret) not available for this order" : undefined}
                style={{
                  display: "grid",
                  gridTemplateColumns: COL,
                  gap: 8,
                  alignItems: "center",
                  padding: "0 22px",
                  height: 47,
                  borderBottom: "1px solid rgba(255,255,255,.04)",
                  cursor: isSelectable ? "pointer" : "default",
                  opacity: (order.matched || order.cancelled) ? 0.5 : 1,
                  background: isSelected ? "rgba(157,140,255,.07)" : "transparent",
                  boxShadow: isSelected ? "inset 3px 0 0 #9D8CFF" : "none",
                  transition: "background .15s",
                }}
              >
                <span style={{ font: "500 12px var(--font-mono), monospace", color: "#5D5B6E" }}>#{orderId}</span>
                <span style={{ font: "500 12.5px var(--font-mono), monospace", color: isSelected ? "#9D8CFF" : "#ECEAF6" }}>
                  {shortCommit}
                </span>
                <span style={{ font: "500 12px var(--font-mono), monospace", color: "#9B99AF" }}>{shortTrader}</span>
                <span style={{ font: "500 12px var(--font-mono), monospace", color: "#ECEAF6" }}>{depositXlm}</span>
                {/* Side — redacted */}
                <span><RedactBar w={28} /></span>
                {/* Price — redacted */}
                <span><RedactBar w={44} /></span>
                <span style={{ font: "500 12px var(--font-mono), monospace", color: "#9B99AF" }}>{ageLabel}</span>
                <span><StatusBadge order={order} /></span>
                <span>
                  {isSelectable ? (
                    <span
                      style={{
                        display: "inline-flex",
                        width: 17,
                        height: 17,
                        borderRadius: 5,
                        background: isSelected ? "#9D8CFF" : "transparent",
                        border: isSelected ? "none" : "1.5px solid rgba(255,255,255,.2)",
                        color: "#08080D",
                        alignItems: "center",
                        justifyContent: "center",
                        font: "700 11px var(--font-archivo), sans-serif",
                      }}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  ) : isOpen && !hasPrivate ? (
                    <span
                      title="Private data unavailable"
                      style={{
                        display: "inline-flex",
                        width: 17,
                        height: 17,
                        borderRadius: 5,
                        background: "rgba(242,109,120,.15)",
                        border: "1.5px solid rgba(242,109,120,.35)",
                        alignItems: "center",
                        justifyContent: "center",
                        font: "700 11px var(--font-archivo), sans-serif",
                        color: "#F26D78",
                      }}
                    >
                      ?
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 22px",
          borderTop: canMatch
            ? "1px solid rgba(157,140,255,.25)"
            : "1px solid rgba(255,255,255,.07)",
          background: canMatch ? "rgba(157,140,255,.06)" : "transparent",
          transition: "all .2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {canMatch ? (
            <>
              <span style={{ font: "600 13px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>
                2 commitments selected
              </span>
              <span style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#9B99AF" }}>
                compatibility is proven, never revealed
              </span>
            </>
          ) : (
            <span style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
              {orders.length === 0
                ? "Submit orders to start matching"
                : `Select 2 open orders to generate a proof (${selectedIds.length}/2)`}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {canMatch && (
            <button
              onClick={() => selectedIds.length === 2 && onToggleSelect(selectedIds[0])}
              style={{
                font: "600 12.5px var(--font-archivo), sans-serif",
                color: "#9B99AF",
                padding: "10px 16px",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 8,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
          <button
            disabled={!canMatch}
            onClick={onMatchClick}
            style={{
              font: "600 12.5px var(--font-archivo), sans-serif",
              color: canMatch ? "#08080D" : "#5D5B6E",
              background: canMatch ? "#9D8CFF" : "rgba(255,255,255,.06)",
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              cursor: canMatch ? "pointer" : "default",
              transition: "all .2s",
            }}
          >
            Generate proof &amp; match →
          </button>
        </div>
      </div>
    </div>
  );
}
