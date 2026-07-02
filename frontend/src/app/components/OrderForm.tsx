"use client";

import { useState } from "react";
import type { Order, OrderSide } from "../lib/types";
import { computeCommitment, randomSecret } from "../lib/circuit";
import { submitOrder as submitOrderOnChain } from "../lib/stellar";

interface OrderFormProps {
  walletAddress: string | null;
  onOrderSubmitted: (order: Order) => void;
}

export default function OrderForm({ walletAddress, onOrderSubmitted }: OrderFormProps) {
  const [side, setSide] = useState<OrderSide>("BUY");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus]   = useState<"idle" | "computing" | "submitting" | "done" | "error">("idle");
  const [commitment, setCommitment] = useState<string | null>(null);
  const [txHash, setTxHash]   = useState<string | null>(null);
  const [errMsg, setErrMsg]   = useState<string | null>(null);
  const [secret] = useState(() => randomSecret());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress || !price || !amount) return;
    setStatus("computing");
    setErrMsg(null);
    try {
      const priceScaled  = BigInt(Math.round(parseFloat(price)  * 1_000_000));
      const amountScaled = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      const sideNum      = side === "BUY" ? 0n : 1n;
      const deposit      = side === "BUY" ? priceScaled * amountScaled / 1_000_000n : amountScaled;
      const comm         = await computeCommitment(priceScaled, amountScaled, sideNum, secret);
      setCommitment(comm);

      setStatus("submitting");
      // Submit to dark pool contract on Stellar testnet
      const { hash, onChainId } = await submitOrderOnChain(walletAddress, comm, deposit);
      setTxHash(hash);

      const order: Order = {
        id: Date.now(),
        onChainId,
        side,
        commitment: comm,
        deposit,
        trader: walletAddress,
        matched: false,
        cancelled: false,
        txHash: hash,
        _price: priceScaled,
        _amount: amountScaled,
        _secret: secret,
      };
      onOrderSubmitted(order);
      setStatus("done");
      setTimeout(() => { setStatus("idle"); setTxHash(null); }, 8000);
    } catch (err) {
      console.error(err);
      setErrMsg(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 8000);
    }
  }

  const depositEstimate =
    price && amount
      ? side === "BUY"
        ? (parseFloat(price) * parseFloat(amount)).toFixed(2)
        : parseFloat(amount).toFixed(2)
      : null;

  return (
    <div
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: 12,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ font: "600 15px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>
          New hidden order
        </span>
        <span
          style={{
            font: "500 9.5px var(--font-mono), monospace",
            letterSpacing: "0.1em",
            color: "#9D8CFF",
            background: "rgba(157,140,255,.1)",
            padding: "4px 9px",
            borderRadius: 20,
          }}
        >
          HASHED LOCALLY
        </span>
      </div>

      {/* Side toggle */}
      <div style={{ display: "flex", background: "#12121D", borderRadius: 10, padding: 3 }}>
        {(["BUY", "SELL"] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              flex: 1,
              textAlign: "center",
              font: "600 13.5px var(--font-archivo), sans-serif",
              color:
                side === s
                  ? s === "BUY"
                    ? "#08080D"
                    : "#08080D"
                  : "#9B99AF",
              background:
                side === s
                  ? s === "BUY"
                    ? "#3ECF8E"
                    : "#F26D78"
                  : "transparent",
              borderRadius: 8,
              padding: "11px 0",
              border: "none",
              cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Price */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E" }}>
              LIMIT PRICE
            </span>
            <span style={{ font: "400 10.5px var(--font-archivo), sans-serif", color: "#5D5B6E" }}>
              {side === "BUY" ? "max you'll pay" : "min you'll accept"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#0A0A12",
              border: price ? "1px solid #9D8CFF" : "1px solid rgba(255,255,255,.1)",
              borderRadius: 10,
              padding: "14px 16px",
              boxShadow: price ? "0 0 0 3px rgba(157,140,255,.12)" : "none",
            }}
          >
            <input
              type="number"
              step="0.000001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="1.0100"
              required
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                font: "500 18px var(--font-mono), monospace",
                color: "#ECEAF6",
                width: "100%",
              }}
            />
            <span style={{ font: "500 11px var(--font-archivo), sans-serif", color: "#5D5B6E", flexShrink: 0 }}>XLM</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
            <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E" }}>AMOUNT</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#0A0A12",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="300"
              required
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                font: "500 18px var(--font-mono), monospace",
                color: "#ECEAF6",
                width: "100%",
              }}
            />
            <span style={{ font: "500 11px var(--font-archivo), sans-serif", color: "#5D5B6E", flexShrink: 0 }}>XLM</span>
          </div>
        </div>

        {/* Secret */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px" }}>
          <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#5D5B6E" }}>SECRET</span>
          <span style={{ font: "500 11.5px var(--font-mono), monospace", color: "#9B99AF" }}>
            0x{secret.toString(16).slice(0, 6)}…generated locally
          </span>
        </div>

        {/* Commitment preview */}
        {status === "error" && errMsg && (
          <div
            style={{
              background: "rgba(242,109,120,.07)",
              border: "1px solid rgba(242,109,120,.25)",
              borderRadius: 12,
              padding: "12px 14px",
              font: "400 11.5px/1.55 var(--font-archivo), sans-serif",
              color: "#F26D78",
            }}
          >
            {errMsg}
          </div>
        )}
        {status === "done" && commitment ? (
          <div
            style={{
              background: "rgba(62,207,142,.05)",
              border: "1px solid rgba(62,207,142,.25)",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3ECF8E" }} />
              <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#3ECF8E" }}>
                ORDER ON-CHAIN
              </span>
            </div>
            <div style={{ font: "500 11px var(--font-mono), monospace", color: "#ECEAF6", wordBreak: "break-all", lineHeight: 1.6 }}>
              0x{BigInt(commitment).toString(16).padStart(64, "0").slice(0, 32)}…
            </div>
            {txHash && (
              <div style={{ font: "400 10.5px var(--font-mono), monospace", color: "#9B99AF" }}>
                TX: {txHash.slice(0, 12)}…{txHash.slice(-8)}
              </div>
            )}
            <div style={{ font: "400 11px/1.55 var(--font-archivo), sans-serif", color: "#9B99AF" }}>
              Price &amp; amount hidden ✓ Only you hold the secret.
            </div>
          </div>
        ) : status !== "error" ? (
          <div
            style={{
              background: "rgba(157,140,255,.06)",
              border: "1px solid rgba(157,140,255,.22)",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span style={{ font: "500 10px var(--font-mono), monospace", letterSpacing: "0.12em", color: "#9D8CFF" }}>
              YOUR COMMITMENT — THE ONLY THING THE CHAIN WILL SEE
            </span>
            <span style={{ font: "400 11px/1.55 var(--font-archivo), sans-serif", color: "#9B99AF" }}>
              Poseidon(price, amount, side, secret) — computed locally when you submit.
            </span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!walletAddress || status === "computing" || status === "submitting" || status === "done"}
          style={{
            font: "600 14.5px var(--font-archivo), sans-serif",
            color: "#08080D",
            background: status === "done" ? "#3ECF8E" : status === "error" ? "rgba(157,140,255,.4)" : "#9D8CFF",
            padding: "15px 0",
            borderRadius: 11,
            border: "none",
            cursor: (status === "idle" || status === "error") ? "pointer" : "default",
            opacity: !walletAddress ? 0.5 : 1,
            transition: "background .2s",
          }}
        >
          {status === "computing"
            ? "Computing commitment…"
            : status === "submitting"
            ? "Submitting to Stellar…"
            : status === "done"
            ? "Order on-chain ✓"
            : status === "error"
            ? "Retry"
            : walletAddress
            ? `Submit commitment${depositEstimate ? ` · deposit ${depositEstimate} XLM` : ""}`
            : "Connect wallet first"}
        </button>

        <p style={{ font: "400 11px/1.6 var(--font-archivo), sans-serif", color: "#5D5B6E", margin: 0 }}>
          Price &amp; amount never leave this device. Keep your secret — you&rsquo;ll need it to match or cancel.
        </p>
      </form>
    </div>
  );
}
