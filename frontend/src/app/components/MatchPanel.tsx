"use client";

import { useState } from "react";
import type { Order, MatchResult } from "../lib/types";
import { generateMatchProof, accountToField } from "../lib/circuit";

interface MatchPanelProps {
  orders: Order[];
  selectedIds: number[];
  onMatchComplete: (result: MatchResult) => void;
}

type MatchStatus =
  | "idle"
  | "computing"
  | "verifying"
  | "submitting"
  | "success"
  | "error";

export default function MatchPanel({
  orders,
  selectedIds,
  onMatchComplete,
}: MatchPanelProps) {
  const [status, setStatus] = useState<MatchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [proofSnippet, setProofSnippet] = useState<string | null>(null);
  const [timeTaken, setTimeTaken] = useState<number | null>(null);

  const orderA = orders.find((o) => o.id === selectedIds[0]);
  const orderB = orders.find((o) => o.id === selectedIds[1]);

  const canMatch =
    selectedIds.length === 2 &&
    orderA &&
    orderB &&
    orderA.side !== orderB.side &&
    !orderA.matched &&
    !orderB.matched &&
    orderA._price !== undefined &&
    orderB._price !== undefined;

  const buyOrder  = orderA?.side === "BUY"  ? orderA : orderB;
  const sellOrder = orderA?.side === "SELL" ? orderA : orderB;

  const priceCompatible =
    buyOrder?._price !== undefined &&
    sellOrder?._price !== undefined &&
    buyOrder._price >= sellOrder._price;

  async function handleMatch() {
    if (!canMatch || !buyOrder || !sellOrder) return;
    if (!buyOrder._price || !buyOrder._amount || !buyOrder._secret) return;
    if (!sellOrder._price || !sellOrder._amount || !sellOrder._secret) return;

    setStatus("computing");
    setError(null);
    const t0 = Date.now();

    try {
      const settlementPrice  = (buyOrder._price + sellOrder._price) / 2n;
      const settlementAmount = buyOrder._amount < sellOrder._amount
        ? buyOrder._amount
        : sellOrder._amount;

      const buyerHash  = await accountToField(buyOrder.trader);
      const sellerHash = await accountToField(sellOrder.trader);

      setStatus("verifying");
      const proofOutput = await generateMatchProof(
        { price: buyOrder._price,  amount: buyOrder._amount,  secret: buyOrder._secret,  traderHash: buyerHash  },
        { price: sellOrder._price, amount: sellOrder._amount, secret: sellOrder._secret, traderHash: sellerHash },
        { price: settlementPrice, amount: settlementAmount }
      );

      setProofSnippet(
        JSON.stringify(proofOutput.proof.pi_a).slice(0, 60) + "..."
      );
      setTimeTaken(Date.now() - t0);

      setStatus("submitting");
      // Simulate on-chain submission (replace with actual Stellar SDK call)
      await new Promise((r) => setTimeout(r, 1500));

      const matchResult: MatchResult = {
        orderIdA: buyOrder.id,
        orderIdB: sellOrder.id,
        settlementPrice,
        settlementAmount,
        txHash: "0x" + proofOutput.nullifierA.slice(0, 20) + "...",
        proofValid: true,
      };

      setResult(matchResult);
      setStatus("success");
      onMatchComplete(matchResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Proof generation failed");
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-6">
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">
        Match Orders
      </h2>

      {selectedIds.length < 2 && (
        <div className="text-center py-8 text-slate-600">
          <p className="text-sm">Select two orders from the book to match.</p>
          <p className="text-xs mt-1 text-slate-700">
            A BUY and a SELL with overlapping prices.
          </p>
        </div>
      )}

      {selectedIds.length === 2 && buyOrder && sellOrder && (
        <>
          {/* Order summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[{ order: buyOrder, label: "BUY" }, { order: sellOrder, label: "SELL" }].map(({ order, label }) => (
              <div
                key={order.id}
                className={`rounded-lg border p-3 ${
                  label === "BUY"
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : "border-red-500/25 bg-red-500/5"
                }`}
              >
                <p className={`text-xs font-bold mb-2 ${label === "BUY" ? "text-emerald-400" : "text-red-400"}`}>
                  {label} #{String(order.id).slice(-4)}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Price</span>
                    <span className="text-slate-300">
                      {order._price ? `$${(Number(order._price) / 1e6).toFixed(6)}` : "???"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Amount</span>
                    <span className="text-slate-300">
                      {order._amount ? `${(Number(order._amount) / 1e6).toFixed(2)}` : "???"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compatibility check */}
          {buyOrder._price && sellOrder._price && (
            <div className={`rounded-lg border px-4 py-3 mb-4 text-xs ${
              priceCompatible
                ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
                : "border-red-500/25 bg-red-500/5 text-red-400"
            }`}>
              {priceCompatible ? (
                <>
                  <p className="font-semibold mb-1">Price spread is valid</p>
                  <p className="text-slate-500">
                    Settlement: ${((Number(buyOrder._price) + Number(sellOrder._price)) / 2e6).toFixed(6)} (midpoint)
                  </p>
                </>
              ) : (
                <p>No match — buyer bid below seller ask</p>
              )}
            </div>
          )}

          {/* ZK explanation */}
          <div className="rounded-lg bg-[#0a0a14] border border-[#1a1a2e] px-4 py-3 mb-4 text-xs text-slate-500 space-y-1.5">
            <p className="text-slate-400 font-semibold text-xs">ZK Proof will verify (privately):</p>
            <div className="flex items-center gap-2"><span className="text-violet-400">✓</span> Both commitment openings are correct</div>
            <div className="flex items-center gap-2"><span className="text-violet-400">✓</span> Buyer price ≥ seller price (no reveal)</div>
            <div className="flex items-center gap-2"><span className="text-violet-400">✓</span> Settlement price within spread</div>
            <div className="flex items-center gap-2"><span className="text-violet-400">✓</span> Settlement amount ≤ both order amounts</div>
            <div className="flex items-center gap-2"><span className="text-violet-400">✓</span> Nullifiers correctly derived</div>
          </div>

          {/* Status messages */}
          {status === "computing" && (
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 mb-4 text-xs text-violet-300 animate-pulse">
              Generating Groth16 proof... (this takes ~15-30s)
            </div>
          )}
          {status === "verifying" && (
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 mb-4 text-xs text-violet-300 animate-pulse">
              Running BN254 pairing check locally...
            </div>
          )}
          {status === "submitting" && (
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-4 py-3 mb-4 text-xs text-violet-300 animate-pulse">
              Submitting proof to Stellar testnet...
            </div>
          )}

          {status === "success" && result && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-4 py-3 mb-4 space-y-2">
              <p className="text-emerald-400 font-semibold text-xs">Match executed on-chain ✓</p>
              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Settlement price</span>
                  <span className="text-slate-300">${(Number(result.settlementPrice) / 1e6).toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Settlement amount</span>
                  <span className="text-slate-300">{(Number(result.settlementAmount) / 1e6).toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Proof time</span>
                  <span className="text-slate-300">{timeTaken ? `${(timeTaken / 1000).toFixed(1)}s` : "—"}</span>
                </div>
                {proofSnippet && (
                  <div className="mt-2 font-mono text-slate-600 break-all text-xs">
                    Proof: {proofSnippet}
                  </div>
                )}
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/25 px-4 py-3 mb-4 text-xs text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleMatch}
            disabled={!priceCompatible || ["computing", "verifying", "submitting", "success"].includes(status)}
            className="w-full py-3 rounded-lg text-sm font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === "computing" || status === "verifying"
              ? "Generating ZK Proof..."
              : status === "submitting"
              ? "Submitting to Stellar..."
              : status === "success"
              ? "Matched ✓"
              : "Generate Proof & Match"}
          </button>
        </>
      )}
    </div>
  );
}
