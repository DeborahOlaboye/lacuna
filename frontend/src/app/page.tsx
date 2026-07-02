"use client";

import { useState } from "react";
import Header from "./components/Header";
import OrderForm from "./components/OrderForm";
import OrderBook from "./components/OrderBook";
import MatchPanel from "./components/MatchPanel";
import type { Order, MatchResult } from "./lib/types";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchResult[]>([]);

  function connectWallet() {
    // Demo: generate a random-looking Stellar address for the hackathon demo
    // In production: integrate Freighter or WalletConnect
    if (walletAddress) {
      setWalletAddress(null);
      return;
    }
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let addr = "G";
    for (let i = 0; i < 55; i++) addr += chars[Math.floor(Math.random() * chars.length)];
    setWalletAddress(addr);
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
        o.id === result.orderIdA || o.id === result.orderIdB
          ? { ...o, matched: true }
          : o
      )
    );
    setSelectedIds([]);
  }

  const totalMatched  = matchHistory.length;
  const totalVolume   = matchHistory.reduce((s, m) => s + Number(m.settlementAmount) / 1e6, 0);
  const openOrders    = orders.filter((o) => !o.matched && !o.cancelled).length;

  return (
    <div className="min-h-screen bg-[#07070f]">
      <Header walletAddress={walletAddress} onConnect={connectWallet} />

      {/* Stats bar */}
      <div className="border-b border-[#1a1a2e] bg-[#0a0a14]">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center gap-8 text-xs text-slate-500">
          <span>Open orders: <strong className="text-slate-300">{openOrders}</strong></span>
          <span>Matches executed: <strong className="text-slate-300">{totalMatched}</strong></span>
          <span>Volume (demo): <strong className="text-slate-300">${totalVolume.toFixed(2)} USDC</strong></span>
          <span className="ml-auto hidden sm:block">
            Lacuna circuit: 1,411 constraints · Groth16 · BN254
          </span>
        </div>
      </div>

      {/* Hero banner */}
      <div className="border-b border-[#1a1a2e] bg-gradient-to-r from-violet-950/30 to-transparent">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">
                Institutional dark pool — zero-knowledge order matching
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xl">
                Submit hidden orders. A permissionless matcher provides a Groth16 ZK proof
                that two orders are compatible. Stellar verifies the proof on-chain via BN254
                pairing check. No price or amount is ever revealed.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {["Circom 2.0", "Groth16", "Poseidon", "Soroban", "BN254"].map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Order submission */}
        <div className="lg:col-span-1 space-y-5">
          <OrderForm
            walletAddress={walletAddress}
            onOrderSubmitted={handleOrderSubmitted}
          />

          {/* How it works */}
          <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              How it works
            </h3>
            <ol className="space-y-3 text-xs text-slate-500">
              {[
                ["Commit", "Trader computes Poseidon(price, amount, side, secret) and deposits tokens"],
                ["Match", "Matcher finds two compatible orders and generates a Groth16 ZK proof"],
                ["Verify", "Soroban contract verifies the BN254 pairing on-chain — no data revealed"],
                ["Settle", "Tokens transferred automatically. Order details remain private forever"],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-3">
                  <span className="text-violet-400 font-mono w-14 flex-shrink-0">{title}</span>
                  <span>{desc}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Middle: Order book */}
        <div className="lg:col-span-1">
          <OrderBook
            orders={orders}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        </div>

        {/* Right: Match panel + history */}
        <div className="lg:col-span-1 space-y-5">
          <MatchPanel
            orders={orders}
            selectedIds={selectedIds}
            onMatchComplete={handleMatchComplete}
          />

          {/* Match history */}
          {matchHistory.length > 0 && (
            <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Match History
              </h3>
              <div className="space-y-2">
                {matchHistory.map((m, i) => (
                  <div key={i} className="text-xs bg-[#0a0a14] border border-[#1a1a2e] rounded-lg px-3 py-2.5">
                    <div className="flex justify-between text-slate-400">
                      <span>${(Number(m.settlementPrice) / 1e6).toFixed(6)}</span>
                      <span>{(Number(m.settlementAmount) / 1e6).toFixed(2)} USDC</span>
                      <span className="text-emerald-400">ZK ✓</span>
                    </div>
                    <div className="font-mono text-slate-600 mt-1 truncate">
                      {m.txHash}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a2e] mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <span>Lacuna · Stellar Hacks: Real-World ZK 2026</span>
          <span>Groth16 on BN254 · Poseidon · Soroban Protocol 25</span>
        </div>
      </footer>
    </div>
  );
}
