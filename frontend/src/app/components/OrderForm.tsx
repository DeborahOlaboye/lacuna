"use client";

import { useState } from "react";
import type { Order, OrderSide } from "../lib/types";
import { computeCommitment, randomSecret } from "../lib/circuit";
import { submitOrder as submitOrderOnChain } from "../lib/stellar";
import { postOrderToRelay } from "../lib/relay";

interface OrderFormProps {
  walletAddress: string | null;
  onOrderSubmitted: (order: Order) => void;
}

// Submits one order and returns it, shared between the main form and the
// auto-generated counter-order flow.
async function doSubmit(
  walletAddress: string,
  side: OrderSide,
  priceScaled: bigint,
  amountScaled: bigint,
  secret: bigint
): Promise<Order> {
  const sideNum = side === "BUY" ? 0n : 1n;
  const deposit = side === "BUY"
    ? priceScaled * amountScaled / 1_000_000n
    : amountScaled;
  const comm = await computeCommitment(priceScaled, amountScaled, sideNum, secret);
  const { hash, onChainId } = await submitOrderOnChain(walletAddress, comm, deposit);
  // Post encrypted private data to relay so any wallet can match this order
  postOrderToRelay(comm, { price: priceScaled, amount: amountScaled, side, secret }).catch(() => {});
  return {
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
}

export default function OrderForm({ walletAddress, onOrderSubmitted }: OrderFormProps) {
  const [side, setSide]     = useState<OrderSide>("BUY");
  const [price, setPrice]   = useState("");
  const [amount, setAmount] = useState("");

  const [status, setStatus] = useState<"idle" | "computing" | "submitting" | "done" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Tracks the last submitted order so we can offer a counter-order
  const [lastOrder, setLastOrder] = useState<{
    side: OrderSide;
    price: bigint;
    amount: bigint;
    txHash: string;
    commitment: string;
  } | null>(null);

  // Counter-order state
  const [counterStatus, setCounterStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [counterErr, setCounterErr]       = useState<string | null>(null);

  const [secret] = useState(() => randomSecret());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress || !price || !amount) return;
    setStatus("computing");
    setErrMsg(null);
    try {
      const priceScaled  = BigInt(Math.round(parseFloat(price)  * 1_000_000));
      const amountScaled = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      const order = await doSubmit(walletAddress, side, priceScaled, amountScaled, secret);
      onOrderSubmitted(order);
      setLastOrder({
        side,
        price:      priceScaled,
        amount:     amountScaled,
        txHash:     order.txHash!,
        commitment: order.commitment,
      });
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrMsg(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  }

  async function handleCounterOrder() {
    if (!walletAddress || !lastOrder) return;
    setCounterStatus("submitting");
    setCounterErr(null);
    try {
      // Counter-order is the opposite side at the same price → guaranteed fill
      const counterSide = lastOrder.side === "BUY" ? "SELL" : "BUY";
      const counterSecret = randomSecret();
      const order = await doSubmit(
        walletAddress,
        counterSide,
        lastOrder.price,
        lastOrder.amount,
        counterSecret
      );
      onOrderSubmitted(order);
      setCounterStatus("done");
    } catch (err) {
      setCounterErr(err instanceof Error ? err.message : "Counter-order failed");
      setCounterStatus("error");
    }
  }

  function handleNewOrder() {
    setStatus("idle");
    setErrMsg(null);
    setLastOrder(null);
    setCounterStatus("idle");
    setCounterErr(null);
  }

  const depositEstimate =
    price && amount
      ? side === "BUY"
        ? (parseFloat(price) * parseFloat(amount)).toFixed(2)
        : parseFloat(amount).toFixed(2)
      : null;

  // ── Post-submission: show flow guide ────────────────────────────────────────
  if (status === "done" && lastOrder) {
    const counterSide = lastOrder.side === "BUY" ? "SELL" : "BUY";

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
        {/* Order confirmed header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#3ECF8E",
              color: "#08080D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 13px var(--font-archivo), sans-serif",
              flexShrink: 0,
            }}
          >
            ✓
          </span>
          <div>
            <div style={{ font: "600 14px var(--font-archivo), sans-serif", color: "#ECEAF6" }}>
              {lastOrder.side} order on-chain
            </div>
            <div style={{ font: "400 10.5px var(--font-mono), monospace", color: "#5D5B6E", marginTop: 2 }}>
              TX {lastOrder.txHash.slice(0, 10)}…{lastOrder.txHash.slice(-8)}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,.07)" }} />

        {/* 3-step progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ font: "600 10px var(--font-mono), monospace", letterSpacing: "0.14em", color: "#5D5B6E", marginBottom: 14 }}>
            WHAT&apos;S NEXT
          </div>

          {[
            {
              n: "1",
              label: "Submit hidden order",
              sub: "Commitment on-chain, terms hidden",
              done: true,
              active: false,
            },
            {
              n: "2",
              label: `Submit a ${counterSide} order`,
              sub: "Needs a compatible opposite side",
              done: counterStatus === "done",
              active: counterStatus === "idle" || counterStatus === "error",
            },
            {
              n: "3",
              label: "Select both → generate proof",
              sub: "Pick both orders in the book, then click match",
              done: false,
              active: counterStatus === "done",
            },
          ].map((step, i, arr) => (
            <div key={step.n} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {step.done ? (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#3ECF8E",
                      color: "#08080D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "700 10px var(--font-archivo), sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                ) : step.active ? (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "#9D8CFF",
                      color: "#08080D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "700 10px var(--font-archivo), sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {step.n}
                  </span>
                ) : (
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: "1.5px solid rgba(255,255,255,.15)",
                      color: "#5D5B6E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "600 10px var(--font-archivo), sans-serif",
                      flexShrink: 0,
                    }}
                  >
                    {step.n}
                  </span>
                )}
                {i < arr.length - 1 && (
                  <span
                    style={{
                      width: 1.5,
                      height: 26,
                      background: step.done ? "rgba(62,207,142,.4)" : "rgba(255,255,255,.1)",
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: 10 }}>
                <div
                  style={{
                    font: "600 12.5px var(--font-archivo), sans-serif",
                    color: step.done ? "#ECEAF6" : step.active ? "#ECEAF6" : "#5D5B6E",
                  }}
                >
                  {step.label}
                </div>
                <div style={{ font: "400 11px var(--font-archivo), sans-serif", color: "#44424F", marginTop: 2 }}>
                  {step.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Counter-order action */}
        {counterStatus !== "done" && (
          <div
            style={{
              background: "rgba(157,140,255,.05)",
              border: "1px solid rgba(157,140,255,.18)",
              borderRadius: 11,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ font: "400 11.5px/1.55 var(--font-archivo), sans-serif", color: "#9B99AF" }}>
              For the proof to run, there must be a compatible {counterSide} order in the book.
              Click below to auto-submit one at the same price — your private data stays local.
            </div>
            {counterErr && (
              <div style={{ font: "400 11px var(--font-archivo), sans-serif", color: "#F26D78" }}>
                {counterErr}
              </div>
            )}
            <button
              onClick={handleCounterOrder}
              disabled={counterStatus === "submitting"}
              style={{
                font: "600 13px var(--font-archivo), sans-serif",
                color: counterStatus === "submitting" ? "#9B99AF" : "#08080D",
                background: counterStatus === "submitting" ? "rgba(157,140,255,.25)" : "#9D8CFF",
                padding: "12px 0",
                borderRadius: 9,
                border: "none",
                cursor: counterStatus === "submitting" ? "default" : "pointer",
                transition: "background .15s",
              }}
            >
              {counterStatus === "submitting"
                ? "Submitting counter-order…"
                : counterStatus === "error"
                ? "Retry counter-order"
                : `Submit ${counterSide} counter-order →`}
            </button>
          </div>
        )}

        {counterStatus === "done" && (
          <div
            style={{
              background: "rgba(62,207,142,.05)",
              border: "1px solid rgba(62,207,142,.2)",
              borderRadius: 11,
              padding: "12px 16px",
              font: "400 12px/1.55 var(--font-archivo), sans-serif",
              color: "#3ECF8E",
            }}
          >
            Both orders are in the book. Go to the order book, select them both, and click <strong style={{ color: "#ECEAF6" }}>Generate proof &amp; match →</strong>
          </div>
        )}

        <button
          onClick={handleNewOrder}
          style={{
            font: "500 12.5px var(--font-archivo), sans-serif",
            color: "#9B99AF",
            background: "transparent",
            border: "1px solid rgba(255,255,255,.1)",
            padding: "11px 0",
            borderRadius: 9,
            cursor: "pointer",
          }}
        >
          Submit another order
        </button>
      </div>
    );
  }

  // ── Normal form ──────────────────────────────────────────────────────────────
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
              color: side === s ? "#08080D" : "#9B99AF",
              background:
                side === s
                  ? s === "BUY" ? "#3ECF8E" : "#F26D78"
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

        {/* Error */}
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

        {/* Commitment preview */}
        {status !== "error" && (
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
        )}

        <button
          type="submit"
          disabled={!walletAddress || status === "computing" || status === "submitting"}
          style={{
            font: "600 14.5px var(--font-archivo), sans-serif",
            color: "#08080D",
            background: status === "error" ? "rgba(157,140,255,.5)" : "#9D8CFF",
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
