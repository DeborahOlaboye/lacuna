"use client";

import { useState, useEffect } from "react";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import WalletModal from "./components/WalletModal";
import OrderForm from "./components/OrderForm";
import OrderBook from "./components/OrderBook";
import MatchPanel from "./components/MatchPanel";
import type { Order, MatchResult } from "./lib/types";
import { fetchAllOrders, disconnectWallet } from "./lib/stellar";
import { loadOrders, saveOrders, mergeOrders } from "./lib/storage";
import { fetchRelayOrders } from "./lib/relay";

type View = "landing" | "dashboard" | "match" | "history";

export default function Home() {
  const [walletAddress, setWalletAddress]   = useState<string | null>(null);
  const [showModal, setShowModal]           = useState(false);
  const [view, setView]                     = useState<View>("landing");
  const [activeTab, setActiveTab]           = useState<"book" | "history">("book");
  const [orders, setOrders]                 = useState<Order[]>([]);
  const [selectedIds, setSelectedIds]       = useState<number[]>([]);
  const [matchHistory, setMatchHistory]     = useState<MatchResult[]>([]);
  const [refreshing, setRefreshing]         = useState(false);
  const [importVal, setImportVal]           = useState("");
  const [importMsg, setImportMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedId, setCopiedId]             = useState<number | null>(null);

  function openWalletModal() {
    setShowModal(true);
  }

  // Persist orders to localStorage whenever they change (only when connected)
  useEffect(() => {
    if (walletAddress && orders.length > 0) {
      saveOrders(walletAddress, orders);
    }
  }, [orders, walletAddress]);

  // On wallet connect:
  // 1. Load private order data from localStorage immediately (fast, offline)
  // 2. Fetch current chain state and merge (updates matched/cancelled + adds others' orders)
  async function handleConnected(addr: string) {
    setWalletAddress(addr);
    setShowModal(false);
    setView("dashboard");

    // Restore private orders from local storage right away
    const local = loadOrders(addr);
    if (local.length > 0) setOrders(local);

    // Then fetch chain state and merge
    await refreshChainOrders(addr, local);
  }

  async function refreshChainOrders(addr: string, existingLocal?: Order[]) {
    setRefreshing(true);
    try {
      const [chainOrders, relayMap] = await Promise.all([
        fetchAllOrders(addr),
        fetchRelayOrders(),
      ]);
      const chainHydrated: Order[] = chainOrders.map((co) => {
        const priv = relayMap.get(co.commitment);
        return {
          // Use relay submittedAt for real age; fall back to a unique but opaque value
          id:         priv?.submittedAt ?? (Date.now() - 1_000_000 + co.onChainId),
          onChainId:  co.onChainId,
          side:       priv?.side ?? "UNKNOWN",
          commitment: co.commitment,
          deposit:    co.deposit,
          trader:     co.trader,
          matched:    co.matched,
          cancelled:  co.cancelled,
          _price:     priv?.price,
          _amount:    priv?.amount,
          _secret:    priv?.secret,
        };
      });
      const local = existingLocal ?? loadOrders(addr);
      setOrders((prev) => mergeOrders(prev.length > 0 ? prev : local, chainHydrated));
    } catch (err) {
      console.error("Chain fetch failed:", err);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDisconnect() {
    try { await disconnectWallet(); } catch { /* ignore */ }
    setWalletAddress(null);
    setView("landing");
    setOrders([]);
    setSelectedIds([]);
    setMatchHistory([]);
  }

  function handleOrderSubmitted(order: Order) {
    setOrders((prev) => [order, ...prev]);
  }

  function handleToggleSelect(id: number) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  function handleMatchComplete(result: MatchResult) {
    setMatchHistory((prev) => [result, ...prev]);
    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === result.orderIdA || o.id === result.orderIdB ? { ...o, matched: true } : o
      );
      if (walletAddress) saveOrders(walletAddress, updated);
      return updated;
    });
    // stay on match panel to show success
  }

  function handleMatchClose() {
    setSelectedIds([]);
    setView("dashboard");
  }

  function exportOrder(o: Order) {
    const payload = JSON.stringify({
      onChainId:  o.onChainId,
      commitment: o.commitment,
      side:       o.side,
      price:      o._price?.toString(),
      amount:     o._amount?.toString(),
      secret:     o._secret?.toString(),
      trader:     o.trader,
      deposit:    o.deposit.toString(),
    });
    const code = "lacuna:" + btoa(payload);
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(o.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function importOrder() {
    try {
      if (!importVal.startsWith("lacuna:")) throw new Error("Invalid code");
      const data = JSON.parse(atob(importVal.slice(7)));
      setOrders((prev) => {
        // Find existing order by commitment or onChainId and patch private data in
        const idx = prev.findIndex(
          (o) => o.commitment === data.commitment || (data.onChainId !== undefined && o.onChainId === data.onChainId)
        );
        if (idx === -1) {
          // Order not yet in book — add it
          const newOrder: Order = {
            id:         Date.now(),
            onChainId:  data.onChainId,
            side:       data.side,
            commitment: data.commitment,
            deposit:    BigInt(data.deposit),
            trader:     data.trader,
            matched:    false,
            cancelled:  false,
            _price:     BigInt(data.price),
            _amount:    BigInt(data.amount),
            _secret:    BigInt(data.secret),
          };
          return [...prev, newOrder];
        }
        // Patch private data into existing order
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          side:    data.side,
          _price:  BigInt(data.price),
          _amount: BigInt(data.amount),
          _secret: BigInt(data.secret),
        };
        return updated;
      });
      setImportMsg({ ok: true, text: "Order imported — private data restored." });
      setImportVal("");
    } catch {
      setImportMsg({ ok: false, text: "Invalid code. Paste the full lacuna:… string." });
    }
    setTimeout(() => setImportMsg(null), 4000);
  }

  // Landing
  if (view === "landing") {
    return (
      <>
        <LandingPage onConnect={openWalletModal} />
        {showModal && <WalletModal onConnect={handleConnected} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // Match & prove view
  if (view === "match") {
    const orderA = orders.find((o) => o.id === selectedIds[0]);
    const orderB = orders.find((o) => o.id === selectedIds[1]);
    const buy    = orderA?.side === "BUY" ? orderA : orderB;
    const sell   = orderA?.side === "SELL" ? orderA : orderB;

    return (
      <div style={{ background: "#08080D", minHeight: "100vh" }}>
        <Header
          walletAddress={walletAddress}
          onConnect={handleDisconnect}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "clamp(12px,4vw,24px)" }}>
          {buy && sell ? (
            <MatchPanel
              orders={orders}
              selectedIds={selectedIds}
              walletAddress={walletAddress ?? ""}
              onMatchComplete={handleMatchComplete}
              onClose={handleMatchClose}
            />
          ) : (
            <div style={{ color: "#9B99AF", padding: 40 }}>No orders selected.</div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard — order book + sidebar
  const myOrders = orders.filter((o) => o.trader === walletAddress);

  return (
    <div style={{ background: "#08080D", minHeight: "100vh" }}>
      <Header
        walletAddress={walletAddress}
        onConnect={handleDisconnect}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "book" ? (
        <div className="lac-dashboard-grid">
          {/* Main: order book */}
          <OrderBook
            orders={orders}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onMatchClick={() => setView("match")}
            onRefresh={() => walletAddress && refreshChainOrders(walletAddress)}
            refreshing={refreshing}
          />

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
            {/* Order form */}
            <OrderForm walletAddress={walletAddress} onOrderSubmitted={handleOrderSubmitted} />

            {/* My orders */}
            <div
              style={{
                flex: 1,
                background: "#0C0C14",
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 12,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 22px",
                  borderBottom: "1px solid rgba(255,255,255,.07)",
                }}
              >
                <span style={{ font: "600 15px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>My orders</span>
                <span style={{ font: "400 11px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>only you see the terms</span>
              </div>

              <div style={{ padding: "8px 22px 16px", overflowY: "auto", flex: 1 }}>
                {myOrders.length === 0 ? (
                  <p style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#5D5B6E", padding: "20px 0" }}>
                    No orders yet.
                  </p>
                ) : (
                  myOrders.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        rowGap: 6,
                        padding: "11px 0",
                        borderBottom: "1px solid rgba(255,255,255,.05)",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            font: "600 10px var(--font-mono), monospace",
                            color: o.side === "BUY" ? "#3ECF8E" : o.side === "SELL" ? "#F26D78" : "#5D5B6E",
                            background: o.side === "BUY" ? "rgba(62,207,142,.1)" : o.side === "SELL" ? "rgba(242,109,120,.1)" : "rgba(255,255,255,.06)",
                            padding: "4px 8px",
                            borderRadius: 5,
                            flexShrink: 0,
                          }}
                        >
                          {o.side === "UNKNOWN" ? "?" : o.side}
                        </span>
                        <span style={{ font: "500 12px var(--font-mono), monospace", color: "#ECEAF6" }}>
                          {o._price ? (Number(o._price) / 1e6).toFixed(4) : "?"} ×{" "}
                          {o._amount ? (Number(o._amount) / 1e6).toFixed(0) : "?"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {!o.matched && !o.cancelled && o._price && (
                          <button
                            onClick={() => exportOrder(o)}
                            title="Copy shareable private data code — paste to counter-party so they can match"
                            style={{
                              font: "500 10px var(--font-mono), monospace",
                              color: copiedId === o.id ? "#3ECF8E" : "#9B99AF",
                              background: "transparent",
                              border: "1px solid rgba(255,255,255,.1)",
                              padding: "3px 8px",
                              borderRadius: 5,
                              cursor: "pointer",
                            }}
                          >
                            {copiedId === o.id ? "copied!" : "share"}
                          </button>
                        )}
                        <span
                          style={{
                            font: "500 10px var(--font-mono), monospace",
                            color: o.matched ? "#3ECF8E" : o.cancelled ? "#F26D78" : "#9D8CFF",
                            background: o.matched
                              ? "rgba(62,207,142,.1)"
                              : o.cancelled
                              ? "rgba(242,109,120,.1)"
                              : "rgba(157,140,255,.12)",
                            padding: "3px 8px",
                            borderRadius: 20,
                          }}
                        >
                          {o.matched ? "SETTLED" : o.cancelled ? "CANCELLED" : "OPEN"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Import counter-party order */}
              <div style={{ padding: "12px 22px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.1em", color: "#5D5B6E", marginBottom: 8 }}>
                  IMPORT COUNTER-PARTY ORDER
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={importVal}
                    onChange={(e) => setImportVal(e.target.value)}
                    placeholder="Paste lacuna:… code"
                    style={{
                      flex: 1,
                      font: "400 11px var(--font-mono), monospace",
                      background: "#0A0A12",
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 6,
                      padding: "7px 10px",
                      color: "#ECEAF6",
                      outline: "none",
                      minWidth: 0,
                    }}
                  />
                  <button
                    onClick={importOrder}
                    disabled={!importVal.trim()}
                    style={{
                      font: "600 11px var(--font-archivo), sans-serif",
                      color: "#08080D",
                      background: importVal.trim() ? "#9D8CFF" : "rgba(255,255,255,.08)",
                      border: "none",
                      borderRadius: 6,
                      padding: "7px 12px",
                      cursor: importVal.trim() ? "pointer" : "default",
                      flexShrink: 0,
                    }}
                  >
                    Import
                  </button>
                </div>
                {importMsg && (
                  <div style={{ font: "400 11px var(--font-archivo), sans-serif", color: importMsg.ok ? "#3ECF8E" : "#F26D78", marginTop: 6 }}>
                    {importMsg.text}
                  </div>
                )}
              </div>

              <div
                style={{
                  padding: "14px 22px",
                  borderTop: "1px solid rgba(255,255,255,.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 48 48">
                  <mask id="mob-icon">
                    <rect width="48" height="48" fill="#fff" />
                    <circle cx="31.5" cy="16.5" r="9.5" fill="#000" />
                  </mask>
                  <circle cx="24" cy="24" r="19" fill="#5D5B6E" mask="url(#mob-icon)" />
                </svg>
                <span style={{ font: "400 10.5px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
                  The book above shows these same orders as hashes only.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History tab */
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "clamp(12px,4vw,24px)" }}>
          <div
            style={{
              background: "#0C0C14",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                rowGap: 8,
                padding: "22px clamp(16px,4vw,30px)",
                borderBottom: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif), Georgia, serif",
                  fontSize: 24,
                  color: "#ECEAF6",
                }}
              >
                Order history
              </span>
              <span style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
                the same orders, seen from both sides of the proof
              </span>
            </div>

            <div className="lac-history-grid">
              {/* Your view */}
              <div style={{ padding: "24px clamp(16px,4vw,30px) 24px clamp(16px,4vw,30px)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3ECF8E" }} />
                  <span style={{ font: "600 11px var(--font-mono), monospace", letterSpacing: "0.14em", color: "#ECEAF6" }}>WHAT YOU KNOW</span>
                  <span style={{ font: "400 10.5px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>— secrets held locally</span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: ".7fr .9fr .9fr 1fr",
                    gap: 8,
                    font: "500 9.5px var(--font-mono), monospace",
                    letterSpacing: "0.1em",
                    color: "#5D5B6E",
                    padding: "0 4px 10px",
                    borderBottom: "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <span>SIDE</span><span>PRICE</span><span>AMOUNT</span><span>OUTCOME</span>
                </div>
                {myOrders.length === 0 ? (
                  <p style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#5D5B6E", padding: "20px 4px" }}>
                    No orders yet.
                  </p>
                ) : (
                  myOrders.map((o) => {
                    const match = matchHistory.find((m) => m.orderIdA === o.id || m.orderIdB === o.id);
                    return (
                      <div
                        key={o.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: ".7fr .9fr .9fr 1fr",
                          gap: 8,
                          alignItems: "center",
                          padding: "14px 4px",
                          borderBottom: "1px solid rgba(255,255,255,.05)",
                        }}
                      >
                        <span style={{ font: "600 10px var(--font-mono), monospace", color: o.side === "BUY" ? "#3ECF8E" : o.side === "SELL" ? "#F26D78" : "#5D5B6E" }}>
                          {o.side === "UNKNOWN" ? "?" : o.side}
                        </span>
                        <span style={{ font: "500 12px var(--font-mono), monospace", color: "#ECEAF6" }}>
                          {o._price ? (Number(o._price) / 1e6).toFixed(4) : "?"}
                        </span>
                        <span style={{ font: "500 12px var(--font-mono), monospace", color: "#ECEAF6" }}>
                          {o._amount ? (Number(o._amount) / 1e6).toFixed(0) : "?"}
                        </span>
                        <span
                          style={{
                            font: "500 11px var(--font-mono), monospace",
                            color: match
                              ? "#3ECF8E"
                              : o.cancelled
                              ? "#5D5B6E"
                              : "#9D8CFF",
                          }}
                        >
                          {match
                            ? `filled @ ${(Number(match.settlementPrice) / 1e6).toFixed(4)}`
                            : o.cancelled
                            ? "cancelled · refunded"
                            : "open"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ZK boundary */}
              <div
                className="lac-history-divider"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  borderLeft: "1px dashed rgba(255,255,255,.1)",
                  borderRight: "1px dashed rgba(255,255,255,.1)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <mask id="zk-div">
                    <rect width="48" height="48" fill="#fff" />
                    <circle cx="31.5" cy="16.5" r="9.5" fill="#000" />
                  </mask>
                  <circle cx="24" cy="24" r="19" fill="#9D8CFF" mask="url(#zk-div)" />
                </svg>
                <span
                  style={{
                    font: "500 9px var(--font-mono), monospace",
                    color: "#5D5B6E",
                    writingMode: "vertical-rl" as const,
                    letterSpacing: "0.2em",
                  }}
                >
                  ZK BOUNDARY
                </span>
              </div>

              {/* Chain view */}
              <div className="lac-history-side-right" style={{ padding: "24px clamp(16px,4vw,30px) 24px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16, paddingLeft: 24 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#9D8CFF" }} />
                  <span style={{ font: "600 11px var(--font-mono), monospace", letterSpacing: "0.14em", color: "#ECEAF6" }}>
                    WHAT THE CHAIN KNOWS
                  </span>
                  <span style={{ font: "400 10.5px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>— forever</span>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.3fr .8fr .8fr 1fr",
                    gap: 8,
                    font: "500 9.5px var(--font-mono), monospace",
                    letterSpacing: "0.1em",
                    color: "#5D5B6E",
                    padding: "0 4px 10px 28px",
                    borderBottom: "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <span>COMMITMENT</span><span>PRICE</span><span>AMOUNT</span><span>STATUS</span>
                </div>
                {myOrders.length === 0 ? (
                  <p style={{ font: "400 12px var(--font-archivo), sans-serif", color: "#5D5B6E", padding: "20px 4px 20px 28px" }}>
                    No orders yet.
                  </p>
                ) : (
                  myOrders.map((o) => {
                    const commitHex = "0x" + BigInt(o.commitment).toString(16).padStart(64, "0");
                    const shortC    = commitHex.slice(0, 6) + "…" + commitHex.slice(-4);
                    const match     = matchHistory.find((m) => m.orderIdA === o.id || m.orderIdB === o.id);
                    return (
                      <div
                        key={o.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.3fr .8fr .8fr 1fr",
                          gap: 8,
                          alignItems: "center",
                          padding: "14px 4px 14px 28px",
                          borderBottom: "1px solid rgba(255,255,255,.05)",
                        }}
                      >
                        <span style={{ font: "500 11.5px var(--font-mono), monospace", color: o.cancelled ? "#9B99AF" : "#9D8CFF", textDecoration: o.cancelled ? "line-through" : undefined }}>
                          {shortC}
                        </span>
                        <span>
                          <span
                            style={{
                              display: "inline-block",
                              width: 38,
                              height: 10,
                              borderRadius: 2,
                              background: "repeating-linear-gradient(45deg, rgba(157,140,255,.3) 0 3px, rgba(157,140,255,.1) 3px 6px)",
                            }}
                          />
                        </span>
                        <span>
                          <span
                            style={{
                              display: "inline-block",
                              width: 30,
                              height: 10,
                              borderRadius: 2,
                              background: "repeating-linear-gradient(45deg, rgba(157,140,255,.3) 0 3px, rgba(157,140,255,.1) 3px 6px)",
                            }}
                          />
                        </span>
                        <span
                          style={{
                            font: "500 10px var(--font-mono), monospace",
                            color: match ? "#3ECF8E" : o.cancelled ? "#F26D78" : "#9D8CFF",
                          }}
                        >
                          {match ? "NULLIFIED" : o.cancelled ? "CANCELLED" : "OPEN"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div
              style={{
                padding: "14px 30px",
                borderTop: "1px solid rgba(255,255,255,.07)",
                font: "400 11.5px var(--font-archivo), sans-serif",
                color: "#5D5B6E",
              }}
            >
              Even settled orders never reveal their terms — the fill price on the left is reconstructed from
              your local secret, not from chain data.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
