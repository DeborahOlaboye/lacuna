"use client";

import { useState } from "react";
import type { Order, OrderSide } from "../lib/types";
import { computeCommitment, randomSecret, accountToField } from "../lib/circuit";

interface OrderFormProps {
  walletAddress: string | null;
  onOrderSubmitted: (order: Order) => void;
}

export default function OrderForm({ walletAddress, onOrderSubmitted }: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>("BUY");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "computing" | "done">("idle");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress) return;

    setStatus("computing");
    try {
      const priceScaled  = BigInt(Math.round(parseFloat(price) * 1_000_000));
      const amountScaled = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      const secret       = randomSecret();
      const traderHash   = await accountToField(walletAddress);
      const sideNum      = side === "BUY" ? 0n : 1n;

      const commitment = await computeCommitment(priceScaled, amountScaled, sideNum, secret);

      const order: Order = {
        id: Date.now(),
        side,
        commitment,
        deposit: side === "BUY"
          ? priceScaled * amountScaled / 1_000_000n
          : amountScaled,
        trader: walletAddress,
        matched: false,
        cancelled: false,
        _price: priceScaled,
        _amount: amountScaled,
        _secret: secret,
      };

      setLastOrder(order);
      onOrderSubmitted(order);
      setStatus("done");
      setPrice("");
      setAmount("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error(err);
      setStatus("idle");
    }
  }

  return (
    <div className="rounded-xl border border-[#1a1a2e] bg-[#0f0f1a] p-6">
      <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-4">
        Submit Order
      </h2>

      {/* Side toggle */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {(["BUY", "SELL"] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
              side === s
                ? s === "BUY"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-transparent text-slate-500 border border-[#1a1a2e] hover:border-slate-600"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1.5">
            Limit Price (USDC)
          </label>
          <input
            type="number"
            step="0.000001"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1.005000"
            required
            className="w-full bg-[#0a0a14] border border-[#1a1a2e] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-500 uppercase tracking-widest mb-1.5">
            Amount (USDC)
          </label>
          <input
            type="number"
            step="0.000001"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="300.000000"
            required
            className="w-full bg-[#0a0a14] border border-[#1a1a2e] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="rounded-lg bg-[#0a0a14] border border-[#1a1a2e] px-4 py-3 text-xs text-slate-500 space-y-1">
          <div className="flex justify-between">
            <span>Secret (auto-generated)</span>
            <span className="text-violet-400 font-mono">randomized</span>
          </div>
          <div className="flex justify-between">
            <span>Commitment</span>
            <span className="text-violet-400 font-mono">Poseidon(price, amount, side, secret)</span>
          </div>
          <div className="flex justify-between">
            <span>On-chain visible</span>
            <span className="text-emerald-400">commitment hash only</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!walletAddress || status === "computing"}
          className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            side === "BUY"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
          }`}
        >
          {status === "computing"
            ? "Computing commitment..."
            : status === "done"
            ? "Order submitted ✓"
            : walletAddress
            ? `Submit ${side} Order`
            : "Connect wallet first"}
        </button>
      </form>

      {lastOrder && status === "done" && (
        <div className="mt-4 rounded-lg bg-violet-500/10 border border-violet-500/20 p-3 text-xs space-y-1">
          <p className="text-violet-300 font-semibold">Order committed on-chain:</p>
          <p className="font-mono text-slate-400 break-all">
            {lastOrder.commitment.slice(0, 40)}...
          </p>
          <p className="text-slate-500">Price & amount hidden ✓ Only you hold the secret.</p>
        </div>
      )}
    </div>
  );
}
