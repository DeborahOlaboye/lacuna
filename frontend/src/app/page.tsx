"use client";

import { useState } from "react";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import WalletModal from "./components/WalletModal";
import OrderForm from "./components/OrderForm";
import OrderBook from "./components/OrderBook";
import MatchPanel from "./components/MatchPanel";
import type { Order, MatchResult } from "./lib/types";
import { fetchAllOrders, disconnectWallet } from "./lib/stellar";

type View = "landing" | "dashboard" | "match" | "history";

export default function Home() {
  const [walletAddress, setWalletAddress]   = useState<string | null>(null);
  const [showModal, setShowModal]           = useState(false);
  const [view, setView]                     = useState<View>("landing");
  const [activeTab, setActiveTab]           = useState<"book" | "history">("book");
  const [orders, setOrders]                 = useState<Order[]>([]);
  const [selectedIds, setSelectedIds]       = useState<number[]>([]);
  const [matchHistory, setMatchHistory]     = useState<MatchResult[]>([]);

  function openWalletModal() {
    setShowModal(true);
  }

  // On wallet connect, pull existing on-chain orders so the book is populated
  async function handleConnected(addr: string) {
    setWalletAddress(addr);
    setShowModal(false);
    setView("dashboard");
    try {
      const chainOrders = await fetchAllOrders(addr);
      if (chainOrders.length > 0) {
        const hydrated: Order[] = chainOrders.map((co) => ({
          id: Date.now() + co.onChainId,
          onChainId: co.onChainId,
          side: "BUY",          // side is hidden on-chain; unknown unless it's our order
          commitment: co.commitment,
          deposit: co.deposit,
          trader: co.trader,
          matched: co.matched,
          cancelled: co.cancelled,
        }));
        setOrders(hydrated);
      }
    } catch {
      // Non-fatal: user may have no orders, or demo address has no account
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
    setOrders((prev) =>
      prev.map((o) =>
        o.id === result.orderIdA || o.id === result.orderIdB ? { ...o, matched: true } : o
      )
    );
    // stay on match panel to show success
  }

  function handleMatchClose() {
    setSelectedIds([]);
    setView("dashboard");
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
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 380px",
            gap: 16,
            padding: 16,
            height: "calc(100vh - 61px)",
            boxSizing: "border-box",
          }}
        >
          {/* Main: order book */}
          <OrderBook
            orders={orders}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onMatchClick={() => setView("match")}
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
                        padding: "13px 0",
                        borderBottom: "1px solid rgba(255,255,255,.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          style={{
                            font: "600 10px var(--font-mono), monospace",
                            color: o.side === "BUY" ? "#3ECF8E" : "#F26D78",
                            background: o.side === "BUY" ? "rgba(62,207,142,.1)" : "rgba(242,109,120,.1)",
                            padding: "4px 8px",
                            borderRadius: 5,
                          }}
                        >
                          {o.side}
                        </span>
                        <span style={{ font: "500 12.5px var(--font-mono), monospace", color: "#ECEAF6" }}>
                          {o._price ? (Number(o._price) / 1e6).toFixed(4) : "?"} ×{" "}
                          {o._amount ? (Number(o._amount) / 1e6).toFixed(0) : "?"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

              <div
                style={{
                  marginTop: "auto",
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
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: 24 }}>
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
                padding: "22px 30px",
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr", alignItems: "stretch" }}>
              {/* Your view */}
              <div style={{ padding: "24px 0 24px 30px" }}>
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
                        <span style={{ font: "600 10px var(--font-mono), monospace", color: o.side === "BUY" ? "#3ECF8E" : "#F26D78" }}>
                          {o.side}
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
              <div style={{ padding: "24px 30px 24px 0" }}>
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
